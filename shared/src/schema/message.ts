// shared/src/schema/message.ts
import { z } from "zod";
import type { UIMessage } from "ai";

/**
 * ワイヤ型の正は ai の UIMessage。自前拡張が要るときだけジェネリクスで型付けする:
 *   export type ChatMessage = UIMessage<MyMetadata, MyDataParts, MyTools>;
 * 最小段階では素の UIMessage をそのまま使う。
 */
export type ChatMessage = UIMessage;

/** 送信者の役割 */
export const Role = z.enum(["system", "user", "assistant"]);
export type Role = z.infer<typeof Role>;

/**
 * parts の検証は「text だけ厳格・他はパススルー」。
 * tool パートは v6 で `type: "tool-${name}"` / `state: "input-streaming" |
 * "input-available" | "output-available" | "output-error"` と形が変わるため、
 * 自前で固定せず SDK に追従する（YAGNI、最小チャットボットは text のみ）。
 */
export const TextPart = z.object({ type: z.literal("text"), text: z.string() });
export const UnknownPart = z.looseObject({ type: z.string() });
export const MessagePart = z.union([TextPart, UnknownPart]);
export type MessagePart = z.infer<typeof MessagePart>;

/**
 * 永続化境界の検証用スキーマ（DB 読み書き時に parse する）。
 * UIMessage（id, role, parts）に、保存に必要な conversationId / createdAt を足した形。
 */
export const StoredMessage = z.object({
  id: z.string(),                       // クライアント生成可（UUID）。UIMessage.id をそのまま使う
  conversationId: z.string(),
  role: Role,
  parts: z.array(MessagePart).min(1),
  createdAt: z.iso.datetime(),          // ISO 8601 文字列で保持（DB/JSON で扱いやすい）
});
export type StoredMessage = z.infer<typeof StoredMessage>;

/** 会話 */
export const Conversation = z.object({
  id: z.string(),
  title: z.string().default("New chat"),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Conversation = z.infer<typeof Conversation>;
