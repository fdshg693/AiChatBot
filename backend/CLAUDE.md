# backend/ ルール

Hono + AI SDK Core + SQLite。詳細は [../docs/CONTRACT.md](../docs/CONTRACT.md) §2〜§4、ハマりどころは [../docs/CAUTION.md](../docs/CAUTION.md)。

## ルール

- チャット応答は `streamText()` の結果を **`result.toUIMessageStreamResponse()`** で返す（v4 の `toDataStreamResponse()` は使わない）。
- 受信した `UIMessage[]` は **`await convertToModelMessages(messages)`** で変換（v6 で **async**、`await` 必須）。
- **モデル呼び出しは `src/ai/provider.ts` の `getModel()` の裏に隔離**する。route やサービスにモデル ID を直書きしない。
  - 環境変数: `AI_MODEL`（既定 `claude-opus-4-8`） / `ANTHROPIC_API_KEY`（プロバイダが自動参照）。
- **SQLite アクセスはリポジトリ層（`src/repo/`）の裏に隠す**。SQL を route に散らさない。上位は `ConversationRepo` インターフェースのみに依存。
  - `messages` は `parts` を **JSON 文字列カラム**で保持。読み出し時に `StoredMessage.parse()`（`@app/shared`）で検証。
- 型・スキーマは `@app/shared` から import（手書き再定義しない）。

## エンドポイント契約

| メソッド | パス                              | リクエスト                      | レスポンス        |
| -------- | --------------------------------- | ------------------------------- | ----------------- |
| `POST`   | `/api/chat`                       | `{ id, messages: UIMessage[] }` | UI message stream |
| `GET`    | `/api/conversations`              | —                               | `Conversation[]`  |
| `GET`    | `/api/conversations/:id/messages` | —                               | `StoredMessage[]` |

## コマンド

- 開発: `pnpm dev`（`tsx watch`） / 型チェック: `pnpm typecheck`
