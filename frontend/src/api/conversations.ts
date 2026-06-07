import type { Conversation, StoredMessage } from "@app/shared";

// バックエンドの会話 API（CONTRACT.md §2）を叩く薄いラッパ。
// fetch の細部（パス・ok 判定）をここに閉じ込め、呼び出し側は型だけに依存する。
// 失敗時は null を返し、呼び出し側で「失敗なら現状維持」を選べるようにする。

/** 過去会話の一覧を取得する（更新日時の新しい順）。失敗時は null。 */
export async function fetchConversations(): Promise<Conversation[] | null> {
  const res = await fetch("/api/conversations");
  if (!res.ok) return null;
  return (await res.json()) as Conversation[];
}

/** 指定会話の保存済みメッセージを取得する。失敗時は null。 */
export async function fetchMessages(
  id: string
): Promise<StoredMessage[] | null> {
  const res = await fetch(`/api/conversations/${id}/messages`);
  if (!res.ok) return null;
  return (await res.json()) as StoredMessage[];
}
