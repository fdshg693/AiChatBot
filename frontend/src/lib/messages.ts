import type { StoredMessage } from "@app/shared";
import type { UIMessage } from "ai";

/** 保存済みメッセージ（StoredMessage）を UIMessage に変換する。 */
export function toUIMessages(stored: StoredMessage[]): UIMessage[] {
  // StoredMessage は UIMessage(id/role/parts) に conversationId/createdAt を足した形。
  // ワイヤ型に戻すには封筒（id/role/parts）だけ取り出せばよい。
  return stored.map((m) => ({
    id: m.id,
    role: m.role,
    parts: m.parts,
  })) as UIMessage[];
}
