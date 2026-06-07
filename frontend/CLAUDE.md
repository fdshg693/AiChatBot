# frontend/ ルール

Vue 3 + Vite + `@ai-sdk/vue`。詳細は [../docs/CONTRACT.md](../docs/CONTRACT.md) §2、Vue 固有の注意は [../docs/CAUTION.md](../docs/CAUTION.md) §4。

## ルール

- チャットは **`@ai-sdk/vue` の `Chat` クラス**を使う（ドキュメントが一貫して使う推奨形。`useChat` も可）。
  - `Chat` インスタンスのプロパティ（`chat.messages` / `chat.status`）は**そのままリアクティブ**（`.value` 不要）。
- transport は **`new DefaultChatTransport({ api: "/api/chat" })`**（`DefaultChatTransport` は **`ai`** から import）。
- 描画は必ず **`message.parts` をループ**して `part.type === 'text'` を出す。`message.content` は**存在しない**。
- 入力欄は自前で持つ（`const input = ref('')`）。送信は **`sendMessage({ text: input.value })`**。
  - v5 で廃止: `input` / `handleInputChange` / `handleSubmit` / `append`。使わない。
- 型は `@app/shared` から import。`ai` のメジャーは backend と一致させる。

## コマンド

- 開発: `pnpm dev`（Vite） / ビルド: `pnpm build`（`vue-tsc -b && vite build`） / 型チェック: `pnpm typecheck`
