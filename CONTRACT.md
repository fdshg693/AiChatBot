# 実装に当たって守るべき契約等

このドキュメントは、フロント・バック・DBの各レイヤが共通して依存する「契約」を定義する。
後から変更すると全層に波及する箇所を、先に固めておくことを目的とする。

> 対象バージョン: **Vercel AI SDK v6 系**。v4 時代の API（`toDataStreamResponse()` など）からの差分や
> バージョンの動向・落とし穴は [CAUTION.md](CAUTION.md) を参照（再調査を減らすためのメモ）。

---

## 0. 採用バージョン（重要・先に固定する）

`ai` 本体と各アダプタは**独立採番**になっている。揃えるべきは「`ai` のメジャー」。

| パッケージ | 固定する版 | 備考 |
|---|---|---|
| `ai` | `^6` | `streamText` / `convertToModelMessages` / `DefaultChatTransport` を提供 |
| `@ai-sdk/anthropic` | `^3` | `anthropic(id)` プロバイダ |
| `@ai-sdk/vue` | `^3` | `useChat` / `Chat` クラス |
| `zod` | `^4` | スキーマ |

- **フロント・バックで `ai` のメジャーを一致**させる（data stream protocol 互換のため）。
- アダプタ（`@ai-sdk/*`）の版は `ai` の版と数字が一致しないのが正常。`ai` のメジャーにだけ追従する。

---

## 1. 会話の型（メッセージのデータモデル）

メッセージは「テキストだけ」ではなく、ツール呼び出しや添付を含みうる構造にしておく。
AI SDK の `useChat` が扱う **`UIMessage`（`parts` ベース）** に素直に揃えるのが、後の手戻りが一番少ない。

**方針（重要）: ワイヤ型（フロント⇔バック）の正は `ai` パッケージの `UIMessage`。**
これを Zod で手書き再定義しない（今度は SDK 相手に二重定義になるため）。
`shared` の Zod は次の2つの役割に絞る:

1. `Conversation` などの**自前ドメイン型**の定義
2. **永続化境界のバリデータ**（DB 読み書き時に `id/role/parts` の封筒を検証。`parts` の中身は
   最小（`text`）だけ厳格に見て、`tool` / `file` / `reasoning` 等は SDK 準拠の JSON としてパススルー）

```ts
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
export const UnknownPart = z.object({ type: z.string() }).passthrough();
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
  createdAt: z.string().datetime(),     // ISO 8601 文字列で保持（DB/JSON で扱いやすい）
});
export type StoredMessage = z.infer<typeof StoredMessage>;

/** 会話 */
export const Conversation = z.object({
  id: z.string(),
  title: z.string().default("New chat"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Conversation = z.infer<typeof Conversation>;
```

設計上のポイント:

- **`content: string` ではなく `parts[]`** を正とする。これは v5/v6 の `UIMessage` と一致する設計で、
  ツール呼び出し・画像添付・将来の拡張がスキーマ変更なしで乗る。
- **ワイヤ型は SDK の `UIMessage` が正**。`shared` 側は「ドメイン型 + 境界検証」だけを持ち、parts の
  詳細形は SDK に追従する（手書き Zod で SDK と二重管理しない）。
- **ID はクライアント生成を許す**（楽観的更新・再送のため）。サーバは ID の一意性のみ検証する。
- **日時は ISO 文字列**で統一。SQLite にも JSON にもそのまま入り、タイムゾーン事故を避けられる。
- `conversationId` / `createdAt` は**保存時にリポジトリ層で付与**する派生情報。`UIMessage` 本体には無い。

---

## 2. ストリーミングのI/F（フロント⇔バックの契約）

**AI SDK の `useChat` 互換 UI message stream に乗る。** 自前の SSE プロトコルは実装しない。

- バックエンド（Hono）は、AI SDK Core の `streamText()` の結果を **`toUIMessageStreamResponse()`** で返す。
  （v4 の `toDataStreamResponse()` は廃止 → 名称変更されている。[CAUTION.md](CAUTION.md) 参照）
- 受け取った `UIMessage[]` は **`await convertToModelMessages(messages)`** でモデル入力に変換する
  （v6 で **async** になった点に注意）。
- フロントエンド（Vue）は、`@ai-sdk/vue` の `useChat` / `Chat` でそのエンドポイントを購読する。
  transport は **`new DefaultChatTransport({ api })`**（`DefaultChatTransport` は **`ai`** から import）。
- これにより、トークン逐次表示・ツール呼び出しの途中状態・エラー伝播・中断（abort）が、自前実装なしで揃う。

### エンドポイント契約

| メソッド | パス | リクエスト | レスポンス |
|---|---|---|---|
| `POST` | `/api/chat` | `{ id: string /* conversationId */, messages: UIMessage[] }` | UI message stream（`toUIMessageStreamResponse()`） |
| `GET` | `/api/conversations` | — | `Conversation[]` |
| `GET` | `/api/conversations/:id/messages` | — | `StoredMessage[]` |

> 既定では `useChat` は `{ id, messages, trigger, messageId }` を POST するが、サーバが必要とするのは
> `id` と `messages` のみ。

Hono 側の最小形（雛形）:

```ts
// backend: routes/chat.ts（イメージ）
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { getModel } from "../ai/provider";

app.post("/api/chat", async (c) => {
  const { id, messages }: { id: string; messages: UIMessage[] } = await c.req.json();
  const result = streamText({
    model: getModel(),
    messages: await convertToModelMessages(messages), // ★ v6 で async（await 必須）
    // tools: { ... }  // 必要に応じて Zod 定義のツールを渡す
    onFinish: async ({ response }) => {
      // 完了後に messages を永続化（後述のリポジトリ層経由）
    },
  });
  return result.toUIMessageStreamResponse();          // ★ v4 の toDataStreamResponse から名称変更
});
```

Vue 側の最小形（雛形）:

```vue
<script setup lang="ts">
import { Chat } from "@ai-sdk/vue";          // useChat でも可
import { DefaultChatTransport } from "ai";   // ★ transport は ai から import
import { ref } from "vue";

const input = ref("");
const chat = new Chat({ transport: new DefaultChatTransport({ api: "/api/chat" }) });

function send() {
  chat.sendMessage({ text: input.value });   // ★ append → sendMessage({ text })
  input.value = "";
}
</script>

<template>
  <div v-for="m in chat.messages" :key="m.id">
    <strong>{{ m.role }}:</strong>
    <!-- ★ m.content(文字列) ではなく m.parts を描画 -->
    <template v-for="(p, i) in m.parts" :key="i">
      <span v-if="p.type === 'text'">{{ p.text }}</span>
    </template>
  </div>
  <form @submit.prevent="send"><input v-model="input" /></form>
</template>
```

ポイント:

- リクエストの `messages` は **送信時点までの全履歴**を渡す（`useChat` の標準挙動）。サーバは受け取った履歴 + 生成結果を保存する。
  - 永続化を本格化する段で帯域を抑えたい場合は、transport の `prepareSendMessagesRequest` で
    **「最後の1件 + id だけ送る」**に切り替えられる（任意・最小段階では全履歴のままで可）。
- v5 で **`input` / `handleInputChange` / `handleSubmit` は廃止**。入力欄は自前で持ち、`sendMessage({ text })` を呼ぶ。
- protocol のバージョンは AI SDK に追従する。フロント・バックで **`ai` のメジャーを揃える**こと（§0）。

---

## 3. AIプロバイダの抽象化レイヤ（おすすめ）

モデル呼び出しをルーティングやビジネスロジックに直書きしない。**`getModel()` 1関数の裏に隔離**し、プロバイダ/モデルは環境変数で差し替え可能にする。

```ts
// backend/src/ai/provider.ts
import { anthropic } from "@ai-sdk/anthropic";
// import { openai } from "@ai-sdk/openai"; // 切り替え候補

export function getModel() {
  const id = process.env.AI_MODEL ?? "claude-opus-4-8";
  return anthropic(id);
}
```

- **環境変数**: `AI_MODEL`（既定 `claude-opus-4-8`）、`ANTHROPIC_API_KEY`（プロバイダが自動参照）。
  将来プロバイダを増やすなら `AI_PROVIDER` で分岐。
- 既定モデルは最新世代の Claude（`claude-opus-4-8` / `claude-sonnet-4-6`）。モデル ID 文字列は SDK では
  検証されず**実 API で検証**される点に注意（タイポは実行時エラー）。
- システムプロンプト・温度などの生成パラメータも、この層に集約して呼び出し側から隠す。

---

## 4. 永続化の境界（リポジトリ層）（おすすめ）

SQLite への直アクセスを**薄いリポジトリ関数の裏に隠す**。SQL を route やサービスに散らさない。

```ts
// backend/src/repo/conversation.ts（インターフェース例）
import type { Conversation, StoredMessage } from "@app/shared";

export interface ConversationRepo {
  createConversation(c: Conversation): Promise<void>;
  listConversations(): Promise<Conversation[]>;
  appendMessages(conversationId: string, messages: StoredMessage[]): Promise<void>;
  listMessages(conversationId: string): Promise<StoredMessage[]>;
}
```

方針:

- **保存形式**: `messages` テーブルは `parts` を **JSON 文字列カラム**として持つ（`id, conversation_id, role, parts(json), created_at`）。parts はネスト構造なので正規化せず JSON で持つのが楽。読み出し時に Zod の `StoredMessage.parse()` で検証する。
- **境界の徹底**: 上位レイヤは `ConversationRepo` インターフェースだけに依存する。実装を SQLite → 別 DB に差し替えても route は無変更。
- **RAG をやる場合の方針（先に決めておく）**: ベクトル検索が必要になったら、まず **`sqlite-vec`** 拡張で SQLite 内に埋め込みを持つ構成を第一候補とする（DB を1つに保てる）。規模が大きくなったら専用ベクトル DB に外出しするが、その境界も同じリポジトリ層で吸収する。**当面 RAG をやらないなら埋め込み列は作らない**（YAGNI）。

---

## 5. モノレポ構成（おすすめ）

pnpm workspace で `shared` を中心に据える。型（1のZodスキーマ）はここに置き、フロント・バックの両方が参照する。

```
AiChatBot/
├─ pnpm-workspace.yaml
├─ package.json            # ルート（共通スクリプト・devDependencies）
├─ shared/                 # ★ Zod スキーマ・共通型（フロント/バック両方が依存）
│  └─ src/schema/
├─ backend/                # Hono + AI SDK Core + SQLite
│  └─ src/
│     ├─ ai/               # provider 抽象（3）
│     ├─ repo/             # リポジトリ層（4）
│     └─ routes/
└─ frontend/               # Vue + AI SDK useChat
   └─ src/
```

```yaml
# pnpm-workspace.yaml
packages:
  - "shared"
  - "backend"
  - "frontend"
```

ポイント:

- **依存方向は一方向**: `frontend → shared`、`backend → shared`。`shared` は他に依存しない（循環を作らない）。
  - 例外: `shared` は型 `UIMessage` のために `ai` に（型のみ）依存してよい（§1 の方針）。
- `shared` はビルド済み JS ではなく **TypeScript ソースを直接参照**（`"@app/shared": "workspace:*"`）にしておくと、型変更が即時に両側へ伝わる。
- 共通の lint / tsconfig はルートに置き、各パッケージが extends する。
