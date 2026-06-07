<script setup lang="ts">
import type { UIMessage } from "ai";

// 1 メッセージの表示。parts をループして描画する（message.content は存在しない）。
defineProps<{ message: UIMessage }>();
</script>

<template>
  <div
    class="msg"
    :class="message.role === 'user' ? 'msg--user' : 'msg--assistant'"
  >
    <div class="msg__role">{{ message.role }}</div>
    <div class="msg__bubble">
      <template v-for="(p, i) in message.parts" :key="i">
        <span v-if="p.type === 'text'">{{ p.text }}</span>
        <!-- ツール呼び出しは v6 で type: "tool-<name>"。実行されたことだけ示す。 -->
        <span v-else-if="p.type.startsWith('tool-')" class="tool-badge">
          🔧 {{ p.type.slice("tool-".length) }}
        </span>
      </template>
    </div>
  </div>
</template>

<style scoped>
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

.tool-badge {
  display: inline-block;
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
}
</style>
