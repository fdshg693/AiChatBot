<script setup lang="ts">
import { AVAILABLE_TOOLS, type ToolId } from "../config/tools";

// AI が使えるツールの ON/OFF。会話の途中でも切り替え可能。
// 一覧は config/tools.ts に集約しているので、ここはその描画と toggle 通知だけ。
defineProps<{ selected: readonly ToolId[] }>();

defineEmits<{ (e: "toggle", id: ToolId): void }>();
</script>

<template>
  <div class="tools">
    <button
      v-for="t in AVAILABLE_TOOLS"
      :key="t.id"
      type="button"
      class="tool"
      :class="{ 'tool--on': selected.includes(t.id) }"
      :aria-pressed="selected.includes(t.id)"
      @click="$emit('toggle', t.id)"
    >
      {{ t.label }}
    </button>
  </div>
</template>

<style scoped>
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
</style>
