<script setup lang="ts">
import type { Conversation } from "@app/shared";

// 過去会話の切り替え用サイドバー。状態は持たず、props で受けて操作は emit で上に返す。
defineProps<{
  conversations: Conversation[];
  activeId: string;
}>();

defineEmits<{
  (e: "new"): void;
  (e: "select", id: string): void;
}>();
</script>

<template>
  <aside class="sidebar">
    <button class="sidebar__new" type="button" @click="$emit('new')">
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
        @click="$emit('select', conv.id)"
      >
        {{ conv.title }}
      </button>

      <p v-if="conversations.length === 0" class="sidebar__empty">
        まだ会話はありません。
      </p>
    </nav>
  </aside>
</template>

<style scoped>
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
</style>
