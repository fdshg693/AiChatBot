import { Hono } from "hono";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import type { StoredMessage, Role } from "@app/shared";
import { getModel, SYSTEM_PROMPT } from "../ai/provider.js";
import { buildTools } from "../ai/tools.js";
import { conversationRepo } from "../repo/conversation.js";
import { createLogger } from "../log.js";

export const chatRoutes = new Hono();

const log = createLogger("chat");

/** UIMessage を永続化用の StoredMessage に変換する。 */
function toStoredMessage(
  message: UIMessage,
  conversationId: string
): StoredMessage {
  return {
    // `?? ` は null/undefined しか拾わない。SDK が空文字 id を返す場合があるので
    // `|| ` で空文字もフォールバックさせる（空 id だと PK 衝突で保存が握り潰される）。
    id: message.id || crypto.randomUUID(),
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
  // `tools` はフロントが選択中のツール ID 配列（WEB アプリ状態。履歴には残さない）。
  // 会話の途中で切り替えても、毎リクエストの値で有効ツールが決まる。
  const {
    id,
    messages,
    tools,
  }: { id: string; messages: UIMessage[]; tools?: unknown } =
    await c.req.json();

  // 許可リスト（Search/Extract）で絞った tools マップ。未選択なら undefined。
  const activeTools = buildTools(tools);

  log.info(
    `POST /api/chat conv=${id} messages=${messages.length} tools=[${
      activeTools ? Object.keys(activeTools).join(",") : ""
    }]`
  );

  const result = streamText({
    model: getModel(),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages), // ★ v6 で async
    // ツールがあるときだけ渡す。多段（ツール呼び出し→結果→応答）には停止条件が必須。
    ...(activeTools
      ? { tools: activeTools, stopWhen: stepCountIs(5) }
      : {}),
    // ステップ完了ごとにツール呼び出しを記録する。ツール名は info、
    // 実引数・結果は機微になり得るので debug（LOG_LEVEL=debug 時のみ全文）。
    onStepFinish: ({ toolCalls, toolResults }) => {
      for (const call of toolCalls ?? []) {
        log.info(`tool call: ${call.toolName}`);
        log.debug(`  args:`, call.input);
      }
      for (const r of toolResults ?? []) {
        log.debug(`tool result: ${r.toolName}`, r.output);
      }
    },
    // ストリーム生成中のエラー（モデル呼び出し失敗・ツール例外など）。
    // これが無いと握り潰されてログにもクライアントにも出にくい。
    onError: ({ error }) => {
      log.error("streamText error:", error);
    },
  });

  return result.toUIMessageStreamResponse({
    // 永続化モードを有効にする。これが無いと responseMessage.id が空文字になり、
    // PK(messages.id) 衝突で assistant 応答が INSERT OR IGNORE に握り潰される。
    originalMessages: messages,
    generateMessageId: () => crypto.randomUUID(),
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

        // 保存ルールは1つ: 受信した履歴 + 今回の AI 応答をまるごと渡し、
        // 重複排除は appendMessages の冪等性契約（message.id で冪等）に一任する。
        // → 既に保存済みのメッセージは無害にスキップされる（実装手段は repo 層の責務）。
        const toPersist: StoredMessage[] = messages.map((m) =>
          toStoredMessage(m, id)
        );

        if (responseMessage) {
          toPersist.push(toStoredMessage(responseMessage, id));
        }

        await conversationRepo.appendMessages(id, toPersist);
      } catch (err) {
        log.error("failed to persist messages:", err);
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
