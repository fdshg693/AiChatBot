<script setup lang="ts">
import { Chat } from "@ai-sdk/vue";
import { DefaultChatTransport } from "ai";
import { ref } from "vue";

// Stable conversation id for this session (sent in the POST body by the SDK).
const id = crypto.randomUUID();

const chat = new Chat({
  id,
  transport: new DefaultChatTransport({ api: "/api/chat" }),
});

// Input is our own ref (v5+ removed the framework-managed input helpers).
const input = ref("");

function send() {
  const text = input.value.trim();
  if (!text) return;
  chat.sendMessage({ text });
  input.value = "";
}
</script>

<template>
  <div class="chat">
    <header class="chat__header">AI Chatbot</header>

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
  </div>
</template>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 760px;
  margin: 0 auto;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  color: #1a1a1a;
}

.chat__header {
  padding: 14px 16px;
  font-weight: 600;
  border-bottom: 1px solid #e5e5e5;
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
