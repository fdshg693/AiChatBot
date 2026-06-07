import { Hono } from "hono";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import type { StoredMessage, Role } from "@app/shared";
import { getModel, SYSTEM_PROMPT } from "../ai/provider.js";
import { conversationRepo } from "../repo/conversation.js";

export const chatRoutes = new Hono();

/** UIMessage を永続化用の StoredMessage に変換する。 */
function toStoredMessage(
  message: UIMessage,
  conversationId: string
): StoredMessage {
  return {
    id: message.id ?? crypto.randomUUID(),
    conversationId,
    role: message.role as Role,
    // parts は SDK 準拠の JSON としてそのまま保持（text 以外はパススルー）。
    parts: (message.parts ?? []) as StoredMessage["parts"],
    createdAt: new Date().toISOString(),
  };
}

/** UIMessage の text パートを連結してタイトル候補を作る。 */
function extractText(message: UIMessage | undefined): string {
  if (!message) return "";
  return (message.parts ?? [])
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ")
    .trim();
}

// POST /api/chat — UI message stream を返しつつ完了時に永続化する。
chatRoutes.post("/api/chat", async (c) => {
  const { id, messages }: { id: string; messages: UIMessage[] } =
    await c.req.json();

  const result = streamText({
    model: getModel(),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages), // ★ v6 で async
  });

  return result.toUIMessageStreamResponse({
    // onFinish は最終的な UIMessage 群を返す（responseMessage = 今回の assistant 応答）。
    onFinish: async ({ responseMessage }) => {
      try {
        // 会話行が無ければ作る（タイトルは最初のユーザ発言から）。
        const existing = await conversationRepo.getConversation(id);
        if (!existing) {
          const firstUser = messages.find((m) => m.role === "user");
          const rawTitle = extractText(firstUser);
          const title = rawTitle
            ? rawTitle.slice(0, 80)
            : "New chat";
          const now = new Date().toISOString();
          await conversationRepo.createConversation({
            id,
            title,
            createdAt: now,
            updatedAt: now,
          });
        }

        // 受信したユーザ履歴 + 今回生成された assistant 応答を保存。
        // INSERT OR IGNORE なので、既存メッセージの重複挿入は無害。
        const toPersist: StoredMessage[] = messages
          .filter((m) => m.role === "user")
          .map((m) => toStoredMessage(m, id));

        if (responseMessage) {
          toPersist.push(toStoredMessage(responseMessage, id));
        }

        await conversationRepo.appendMessages(id, toPersist);
      } catch (err) {
        console.error("[chat] failed to persist messages:", err);
      }
    },
  });
});

// GET /api/conversations — Conversation[]
chatRoutes.get("/api/conversations", async (c) => {
  const conversations = await conversationRepo.listConversations();
  return c.json(conversations);
});

// GET /api/conversations/:id/messages — StoredMessage[]
chatRoutes.get("/api/conversations/:id/messages", async (c) => {
  const conversationId = c.req.param("id");
  const messages = await conversationRepo.listMessages(conversationId);
  return c.json(messages);
});
