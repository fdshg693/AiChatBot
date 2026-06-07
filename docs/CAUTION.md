# CAUTION / ハマりどころメモ

このプロジェクト着手時（2026-06）の調査でわかった、**バージョン動向**と**落とし穴**のメモ。
再調査コストを下げるのが目的。詳細は各 URL を一次情報として参照すること。

---

## 1. AI SDK のバージョンは「`ai` と各アダプタが独立採番」

調査時点の npm latest:

| パッケージ | latest | 補足 |
|---|---|---|
| `ai` | **6.x** | 本体。`streamText` / `convertToModelMessages` / `DefaultChatTransport` |
| `@ai-sdk/anthropic` | **3.x** | Anthropic プロバイダ |
| `@ai-sdk/vue` | **3.x** | `useChat` / `Chat` |
| `zod` | **4.x** | |

- **数字が揃わないのは正常**（`ai@6` でも `@ai-sdk/vue@3`）。揃えるのは「`ai` のメジャー」だけ。
- フロント・バックで **`ai` のメジャーを一致**させる（UI message stream の互換のため）。

---

## 2. 最大の落とし穴: v4 → v5 が破壊的（多くのネット記事・LLM 知識は v4 のまま）

`toDataStreamResponse()` 等の v4 API を前提にしたサンプルが大量に残っている。**v5 で総入れ替え**された。

| 項目 | v4（古い・使わない） | v5/v6（現行） |
|---|---|---|
| サーバ応答 | `result.toDataStreamResponse()` | **`result.toUIMessageStreamResponse()`** |
| メッセージ変換 | `convertToCoreMessages()` | **`convertToModelMessages()`** |
| メッセージ型 | `Message` | **`UIMessage`**（`.content` 文字列 → **`.parts` 配列**） |
| クライアント送信先 | `useChat({ api })` | **`transport: new DefaultChatTransport({ api })`**（`DefaultChatTransport` は `ai` から） |
| 送信関数 | `append({...})` | **`sendMessage({ text })`** |
| 入力管理 | `input` / `handleInputChange` / `handleSubmit`（フックが管理） | **廃止**（自前で `ref` を持つ） |
| 再生成 | `reload()` | `regenerate()` |
| ツール結果 | `addToolResult()` | `addToolOutput()` |
| 初期メッセージ | `initialMessages` | `messages` |
| 多段ツール | クライアントの `maxSteps` | サーバの `stopWhen: stepCountIs(n)` |

---

## 3. v5 → v6 の差分（小さいが効くもの）

- **`convertToModelMessages()` が `async` になった** → 必ず `await` する（v6 の代表的ハマり）。
- 構造化出力の `partialObjectStream` → **`partialOutputStream`** に改名（`Output.object()` 使用時）。
- ツール UI ヘルパ改名: `isToolUIPart` → **`isStaticToolUIPart`** 等（ツール表示を作るなら影響）。
- `anthropic()` の基本利用は不変。新規に `structuredOutputMode` オプションが追加された程度。
- 上記以外（`streamText` / `toUIMessageStreamResponse` / `DefaultChatTransport` / `useChat` / `Chat` /
  `sendMessage` / parts モデル）は **v5 → v6 で変わっていない**。

---

## 4. Vue（`@ai-sdk/vue`）固有の注意

- 公式 Vue/Nuxt ガイドは **`Chat` クラス**（リアクティブなインスタンス）を主に使う。`useChat` コンポーザブルもある。
  - `Chat` インスタンスのプロパティ（`chat.messages` / `chat.status`）は**そのままリアクティブ**（`.value` 不要）。
  - `useChat` コンポーザブルの戻り値が `Ref`（`.value` 要否）かは未確定。**ドキュメントが一貫して使う `Chat` クラス推奨**。
- 描画は必ず **`message.parts` をループ**して `part.type === 'text'` を出す（`message.content` は無い）。
- 入力欄は自前（`const input = ref('')`）。送信は `sendMessage({ text: input.value })`。

---

## 5. データモデルの方針（なぜ Zod で UIMessage を再定義しないか）

- v5/v6 では **`UIMessage` 型は `ai` パッケージが正**。Zod で手書き再定義すると SDK と二重管理になり、
  SDK 更新のたびに追従コストが出る。
- 採用方針: ワイヤ型は `ai` の `UIMessage`、`shared` の Zod は **(a) 自前ドメイン型（Conversation）** と
  **(b) 永続化境界の検証**（text だけ厳格・他はパススルー）に限定。詳細は [CONTRACT.md](CONTRACT.md) §1。
- tool パートは v6 で `type: "tool-${name}"` / `state: input-*|output-*` 形。**自前固定せず SDK に追従**。

---

## 6. Anthropic プロバイダ / モデル ID

- パッケージ `@ai-sdk/anthropic`、`import { anthropic } from "@ai-sdk/anthropic"`、`anthropic("claude-...")`。
- API キーは環境変数 **`ANTHROPIC_API_KEY`**（プロバイダが自動参照）。カスタムは `createAnthropic({ apiKey })`。
- 既定モデル候補（この環境で確認済みの最新世代）: **`claude-opus-4-8`** / **`claude-sonnet-4-6`** /
  `claude-haiku-4-5-20251001`。
- **モデル ID 文字列は SDK では検証されない**（任意の文字列を受ける）。タイポは実 API 呼び出し時に初めてエラー。

---

## 7. ドキュメントの引き方（一次情報）

- `https://ai-sdk.dev/llms.txt` は**インデックスのみ**で API 詳細は無い。詳細は個別 `.md` か `llms-full.txt`。
- 役立つページ:
  - チャットボット: `https://ai-sdk.dev/docs/ai-sdk-ui/chatbot`
  - `useChat` リファレンス: `https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat`
  - Anthropic プロバイダ: `https://ai-sdk.dev/providers/ai-sdk-providers/anthropic`
  - v5 移行: `https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0`
  - v6 移行: `https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0`
  - 全文バンドル（大きい）: `https://ai-sdk.dev/llms-full.txt`

> 注意: AI/LLM の学習知識やブログ記事は v4 前提が多い。**必ず上記一次情報で現行 API を確認**してから書く。
