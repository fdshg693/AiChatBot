<script setup lang="ts">
import { Chat } from "@ai-sdk/vue";
import { DefaultChatTransport, type UIMessage } from "ai";
import { onMounted, ref, shallowRef } from "vue";
import type { Conversation, StoredMessage } from "@app/shared";

// 会話切り替えのため、Chat インスタンスは id/messages 固定で作り直す方式にする。
// shallowRef でインスタンス差し替え時に再描画させる（インスタンス内部の
// chat.messages / chat.status はそれ自体がリアクティブなので .value 不要で読める）。
const chat = shallowRef<Chat<UIMessage>>(createChat(crypto.randomUUID()));

// サイドバーに並べる過去会話の一覧と、現在開いている会話 id。
const conversations = ref<Conversation[]>([]);
const activeId = ref<string>(chat.value.id);

// 入力欄は自前で持つ（v5+ でフレームワーク管理の input ヘルパは廃止）。
const input = ref("");

// AI が常時利用できるツール（バックエンドの許可リスト＝Search/Extract に対応）。
// スレッド履歴ではなく WEB アプリ側の状態として持ち、会話の途中でも切り替え可能。
const AVAILABLE_TOOLS = [
  { id: "tavilySearch", label: "Web検索" },
  { id: "tavilyExtract", label: "本文抽出" },
] as const;
type ToolId = (typeof AVAILABLE_TOOLS)[number]["id"];

// 現在選択中のツール。会話を切り替えても引き継ぐ（アプリ全体の状態）。
const selectedTools = ref<ToolId[]>([]);

/** ツールの ON/OFF を切り替える（送信のたびに最新値が body に載る）。 */
function toggleTool(id: ToolId): void {
  const i = selectedTools.value.indexOf(id);
  if (i === -1) selectedTools.value.push(id);
  else selectedTools.value.splice(i, 1);
}

/** 指定 id・初期メッセージで Chat インスタンスを生成する。 */
function createChat(id: string, messages: UIMessage[] = []): Chat<UIMessage> {
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
        body: { ...body, id, messages, tools: selectedTools.value },
      }),
    }),
  });
}

/** 過去会話の一覧を取得する（更新日時の新しい順）。 */
async function loadConversations(): Promise<void> {
  const res = await fetch("/api/conversations");
  if (!res.ok) return;
  conversations.value = (await res.json()) as Conversation[];
}

/** 保存済みメッセージ（StoredMessage）を UIMessage に変換する。 */
function toUIMessages(stored: StoredMessage[]): UIMessage[] {
  // StoredMessage は UIMessage(id/role/parts) に conversationId/createdAt を足した形。
  // ワイヤ型に戻すには封筒（id/role/parts）だけ取り出せばよい。
  return stored.map((m) => ({
    id: m.id,
    role: m.role,
    parts: m.parts,
  })) as UIMessage[];
}

/** 過去会話を選んで開く（メッセージを読み込み Chat を作り直す）。 */
async function selectConversation(id: string): Promise<void> {
  if (id === activeId.value) return;
  const res = await fetch(`/api/conversations/${id}/messages`);
  if (!res.ok) return;
  const stored = (await res.json()) as StoredMessage[];
  activeId.value = id;
  chat.value = createChat(id, toUIMessages(stored));
}

/** 新規会話を始める（空の Chat に差し替え）。 */
function newChat(): void {
  const id = crypto.randomUUID();
  activeId.value = id;
  chat.value = createChat(id);
}

function send(): void {
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  // sendMessage 完了後に一覧を更新（新規会話なら一覧に現れる／タイトル確定）。
  chat.value.sendMessage({ text }).then(() => {
    activeId.value = chat.value.id;
    void loadConversations();
  });
}

onMounted(loadConversations);
</script>

<template>
  <div class="app">
    <aside class="sidebar">
      <button class="sidebar__new" type="button" @click="newChat">
        + 新しいチャット
      </button>

      <nav class="sidebar__list">
        <button
          v-for="conv in conversations"
          :key="conv.id"
          type="button"
          class="conv"
          :class="{ 'conv--active': conv.id === activeId }"
          :title="conv.title"
          @click="selectConversation(conv.id)"
        >
          {{ conv.title }}
        </button>

        <p v-if="conversations.length === 0" class="sidebar__empty">
          まだ会話はありません。
        </p>
      </nav>
    </aside>

    <main class="chat">
      <header class="chat__header">
        <span>AI Chatbot</span>
        <!-- AI が使えるツールの ON/OFF。会話の途中でも切り替え可能。 -->
        <div class="tools">
          <button
            v-for="t in AVAILABLE_TOOLS"
            :key="t.id"
            type="button"
            class="tool"
            :class="{ 'tool--on': selectedTools.includes(t.id) }"
            :aria-pressed="selectedTools.includes(t.id)"
            @click="toggleTool(t.id)"
          >
            {{ t.label }}
          </button>
        </div>
      </header>

      <div class="chat__messages">
        <div
          v-for="m in chat.messages"
          :key="m.id"
          class="msg"
          :class="m.role === 'user' ? 'msg--user' : 'msg--assistant'"
        >
          <div class="msg__role">{{ m.role }}</div>
          <div class="msg__bubble">
            <template v-for="(p, i) in m.parts" :key="i">
              <span v-if="p.type === 'text'">{{ p.text }}</span>
              <!-- ツール呼び出しは v6 で type: "tool-<name>"。実行されたことだけ示す。 -->
              <span v-else-if="p.type.startsWith('tool-')" class="tool-badge">
                🔧 {{ p.type.slice("tool-".length) }}
              </span>
            </template>
          </div>
        </div>

        <p v-if="chat.messages.length === 0" class="chat__empty">
          Ask me anything to get started.
        </p>
      </div>

      <form class="chat__input" @submit.prevent="send">
        <input
          v-model="input"
          type="text"
          placeholder="Type a message…"
          autocomplete="off"
        />
        <button
          type="submit"
          :disabled="chat.status === 'streaming' || chat.status === 'submitted'"
        >
          Send
        </button>
      </form>
    </main>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  height: 100vh;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  color: #1a1a1a;
}

/* --- サイドバー（過去会話の切り替え） --- */
.sidebar {
  display: flex;
  flex-direction: column;
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid #e5e5e5;
  background: #fafafa;
}

.sidebar__new {
  margin: 12px;
  padding: 10px 12px;
  border: 1px solid #2563eb;
  border-radius: 10px;
  background: #fff;
  color: #2563eb;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.sidebar__new:hover {
  background: #eff4ff;
}

.sidebar__list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar__empty {
  color: #999;
  font-size: 13px;
  text-align: center;
  margin-top: 24px;
}

.conv {
  display: block;
  width: 100%;
  padding: 9px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #333;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv:hover {
  background: #efefef;
}

.conv--active {
  background: #e3ebfb;
  color: #1a1a1a;
  font-weight: 600;
}

/* --- チャット本体 --- */
.chat {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  max-width: 760px;
  margin: 0 auto;
}

.chat__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  font-weight: 600;
  border-bottom: 1px solid #e5e5e5;
}

/* --- ツール ON/OFF トグル --- */
.tools {
  display: flex;
  gap: 6px;
}

.tool {
  padding: 5px 10px;
  border: 1px solid #ccc;
  border-radius: 999px;
  background: #fff;
  color: #555;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.tool:hover {
  border-color: #2563eb;
}

.tool--on {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

.tool-badge {
  display: inline-block;
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
}

.chat__messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat__empty {
  color: #888;
  text-align: center;
  margin-top: 32px;
}

.msg {
  display: flex;
  flex-direction: column;
  max-width: 80%;
}

.msg--user {
  align-self: flex-end;
  align-items: flex-end;
}

.msg--assistant {
  align-self: flex-start;
  align-items: flex-start;
}

.msg__role {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #999;
  margin-bottom: 4px;
}

.msg__bubble {
  padding: 10px 14px;
  border-radius: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.msg--user .msg__bubble {
  background: #2563eb;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.msg--assistant .msg__bubble {
  background: #f1f1f3;
  color: #1a1a1a;
  border-bottom-left-radius: 4px;
}

.chat__input {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #e5e5e5;
}

.chat__input input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 10px;
  font-size: 15px;
  outline: none;
}

.chat__input input:focus {
  border-color: #2563eb;
}

.chat__input button {
  padding: 10px 18px;
  border: none;
  border-radius: 10px;
  background: #2563eb;
  color: #fff;
  font-size: 15px;
  cursor: pointer;
}

.chat__input button:disabled {
  background: #9db8f0;
  cursor: not-allowed;
}
</style>
