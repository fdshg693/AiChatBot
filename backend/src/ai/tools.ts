import { tavilySearch, tavilyExtract } from "@tavily/ai-sdk";
import type { Tool } from "ai";

/**
 * AI に渡せるツール（CONTRACT.md / LIBRARIES.md）。
 * Tavily は Search/Extract/Crawl/Map を提供するが、**バックエンドでは
 * Search と Extract だけを許可**する（Crawl/Map は定義に含めない）。
 * フロントから何が来ても、ここに無いツールは絶対に有効化されない。
 *
 * API キーは `TAVILY_API_KEY`（@tavily/core が自動参照）。
 */
const TOOL_FACTORIES = {
  tavilySearch,
  tavilyExtract,
} as const;

/** 許可ツール ID（フロント・バック共通の語彙）。 */
export const AVAILABLE_TOOL_IDS = Object.keys(
  TOOL_FACTORIES
) as ToolId[];
export type ToolId = keyof typeof TOOL_FACTORIES;

/**
 * フロントが選択中のツール（リクエストボディの `tools`）を許可リストで絞り、
 * `streamText({ tools })` に渡すマップを作る。
 * - 配列でない / 未知の ID / 空配列 のときは `undefined`（＝ツール無効）を返す。
 * - 選択はスレッド履歴ではなく毎リクエストの状態なので、ここで都度組み立てる。
 */
export function buildTools(
  selected: unknown
): Record<string, Tool> | undefined {
  if (!Array.isArray(selected)) return undefined;

  const entries = selected
    .filter((id): id is ToolId => id in TOOL_FACTORIES)
    // 重複は無害だが念のため一意化。
    .filter((id, i, arr) => arr.indexOf(id) === i)
    .map((id) => [id, TOOL_FACTORIES[id]()] as const);

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}
