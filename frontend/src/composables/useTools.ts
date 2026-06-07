import { ref, type Ref } from "vue";
import type { ToolId } from "../config/tools";

export interface ToolsState {
  /** 現在選択中のツール（アプリ全体の状態）。 */
  selectedTools: Ref<ToolId[]>;
  /** ツールの ON/OFF を切り替える。 */
  toggleTool: (id: ToolId) => void;
}

/**
 * AI が常時利用できるツールの選択状態を持つ。
 * スレッド履歴ではなく WEB アプリ側の状態として持ち、会話の途中でも切り替え可能。
 * （実際に body へ載せるのは useChatSession。ここは選択状態の管理だけに集中する。）
 */
export function useTools(): ToolsState {
  const selectedTools = ref<ToolId[]>([]);

  function toggleTool(id: ToolId): void {
    const i = selectedTools.value.indexOf(id);
    if (i === -1) selectedTools.value.push(id);
    else selectedTools.value.splice(i, 1);
  }

  return { selectedTools, toggleTool };
}
