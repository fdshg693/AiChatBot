<script setup lang="ts">
import type { UIMessage } from "ai";
import MessageItem from "./MessageItem.vue";

// メッセージ列の表示。スクロール領域と空状態だけを持ち、各行は MessageItem に委譲。
defineProps<{ messages: UIMessage[] }>();
</script>

<template>
  <div class="chat__messages">
    <MessageItem v-for="m in messages" :key="m.id" :message="m" />

    <p v-if="messages.length === 0" class="chat__empty">
      Ask me anything to get started.
    </p>
  </div>
</template>

<style scoped>
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
</style>
