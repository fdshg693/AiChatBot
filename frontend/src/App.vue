<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useTools } from "./composables/useTools";
import { useChatSession } from "./composables/useChatSession";
import ChatSidebar from "./components/ChatSidebar.vue";
import ToolToggles from "./components/ToolToggles.vue";
import MessageList from "./components/MessageList.vue";
import ChatComposer from "./components/ChatComposer.vue";

// ツール選択（アプリ全体の状態）。送信時に最新値を body へ載せたいので、
// その取得関数を useChatSession に渡す（状態は useTools が持つ）。
const { selectedTools, toggleTool } = useTools();
const {
  chat,
  conversations,
  activeId,
  reloadConversations,
  selectConversation,
  newChat,
  send,
} = useChatSession(() => selectedTools.value);

// Chat インスタンスは会話切り替えで差し替わるので、messages / status は
// その時点のインスタンス経由で参照する（中身は元々リアクティブ）。
const messages = computed(() => chat.value.messages);
const isBusy = computed(
  () => chat.value.status === "streaming" || chat.value.status === "submitted"
);

onMounted(reloadConversations);
</script>

<template>
  <div class="app">
    <ChatSidebar
      :conversations="conversations"
      :active-id="activeId"
      @new="newChat"
      @select="selectConversation"
    />

    <main class="chat">
      <header class="chat__header">
        <span>AI Chatbot</span>
        <ToolToggles :selected="selectedTools" @toggle="toggleTool" />
      </header>

      <MessageList :messages="messages" />

      <ChatComposer :disabled="isBusy" @send="send" />
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
</style>
