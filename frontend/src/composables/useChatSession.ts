import { Chat } from "@ai-sdk/vue";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ref, shallowRef, type Ref, type ShallowRef } from "vue";
import type { Conversation } from "@app/shared";
import { fetchConversations, fetchMessages } from "../api/conversations";
import { toUIMessages } from "../lib/messages";
import type { ToolId } from "../config/tools";

export interface ChatSession {
  /** 現在の Chat インスタンス（会話切り替えで差し替わる）。 */
  chat: ShallowRef<Chat<UIMessage>>;
  /** サイドバーに並べる過去会話の一覧。 */
  conversations: Ref<Conversation[]>;
  /** いま開いている会話 id。 */
  activeId: Ref<string>;
  /** 会話一覧を再取得する。 */
  reloadConversations: () => Promise<void>;
  /** 過去会話を選んで開く。 */
  selectConversation: (id: string) => Promise<void>;
  /** 新規会話を始める。 */
  newChat: () => void;
  /** テキストを送信する（空文字は無視）。 */
  send: (text: string) => void;
}

/**
 * チャットセッションの状態とライフサイクルをまとめる。
 *
 * - 会話切り替えのため Chat インスタンスは id/messages 固定で**作り直す**方式にする。
 *   shallowRef でインスタンス差し替え時に再描画させる（インスタンス内部の
 *   chat.messages / chat.status はそれ自体がリアクティブなので .value 不要で読める）。
 * - 送信時に「現在選択中のツール」を body へ載せたいので、その取得関数を受け取る
 *   （ツールの状態管理自体は useTools に分離。ここはチャット側の責務に集中する）。
 *
 * @param getSelectedTools 送信時点で有効なツール ID 配列を返す関数。
 */
export function useChatSession(
  getSelectedTools: () => readonly ToolId[]
): ChatSession {
  /** 指定 id・初期メッセージで Chat インスタンスを生成する。 */
  function createChat(
    id: string,
    messages: UIMessage[] = []
  ): Chat<UIMessage> {
    return new Chat({
      id,
      messages,
      transport: new DefaultChatTransport({
        api: "/api/chat",
        // 送信のたびに「現在選択中のツール」を body に載せる。
        // prepareSendMessagesRequest を指定すると既定の body 構築を上書きするため、
        // サーバが必要とする id / messages も自分で詰め直す（落とすと
        // convertToModelMessages が "messages is not iterable" で落ちる）。
        // 送信時に呼ばれるので、会話の途中で切り替えても次の送信から反映される。
        prepareSendMessagesRequest: ({ id, messages, body }) => ({
          body: { ...body, id, messages, tools: getSelectedTools() },
        }),
      }),
    });
  }

  const chat = shallowRef<Chat<UIMessage>>(createChat(crypto.randomUUID()));
  const conversations = ref<Conversation[]>([]);
  const activeId = ref<string>(chat.value.id);

  async function reloadConversations(): Promise<void> {
    const list = await fetchConversations();
    if (list) conversations.value = list;
  }

  async function selectConversation(id: string): Promise<void> {
    if (id === activeId.value) return;
    const stored = await fetchMessages(id);
    if (!stored) return; // 取得失敗時は現状維持（会話を切り替えない）。
    activeId.value = id;
    chat.value = createChat(id, toUIMessages(stored));
  }

  function newChat(): void {
    const id = crypto.randomUUID();
    activeId.value = id;
    chat.value = createChat(id);
  }

  function send(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    // sendMessage 完了後に一覧を更新（新規会話なら一覧に現れる／タイトル確定）。
    chat.value.sendMessage({ text: trimmed }).then(() => {
      activeId.value = chat.value.id;
      void reloadConversations();
    });
  }

  return {
    chat,
    conversations,
    activeId,
    reloadConversations,
    selectConversation,
    newChat,
    send,
  };
}
