<script setup lang="ts">
import { ref } from "vue";

// 入力欄は自前で持つ（v5+ でフレームワーク管理の input ヘルパは廃止）。
// 送信は親へ text を emit するだけ。実際の sendMessage は useChatSession の責務。
defineProps<{ disabled?: boolean }>();

const emit = defineEmits<{ (e: "send", text: string): void }>();

const input = ref("");

function submit(): void {
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  emit("send", text);
}
</script>

<template>
  <form class="chat__input" @submit.prevent="submit">
    <input
      v-model="input"
      type="text"
      placeholder="Type a message…"
      autocomplete="off"
    />
    <button type="submit" :disabled="disabled">Send</button>
  </form>
</template>

<style scoped>
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
