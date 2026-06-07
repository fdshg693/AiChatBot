/**
 * AI が利用できるツールの一覧（UI 表示用の語彙）。
 *
 * `id` は**バックエンドの許可リスト**（`backend/src/ai/tools.ts` の AVAILABLE_TOOL_IDS）と
 * 一致させること。フロントから何を送っても、バック側の許可リストに無いものは有効化されない。
 * ツールを増やすときは「バックでファクトリ追加 → ここに id/label を追加」の2手で済む。
 */
export const AVAILABLE_TOOLS = [
  { id: "tavilySearch", label: "Web検索" },
  { id: "tavilyExtract", label: "本文抽出" },
] as const;

/** 許可ツール ID（フロント側の語彙）。 */
export type ToolId = (typeof AVAILABLE_TOOLS)[number]["id"];
