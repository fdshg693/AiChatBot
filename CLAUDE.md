# CLAUDE.md

汎用 AI チャットボット。pnpm モノレポ（`shared` / `backend` / `frontend`）。

## まず読む

- 契約・データモデル・各層の方針: [docs/CONTRACT.md](docs/CONTRACT.md)
- バージョン動向・ハマりどころ: [docs/CAUTION.md](docs/CAUTION.md)

実装前に上記2つを必ず確認する。ここ（CLAUDE.md）には恒久的なルールだけを書き、設計の詳細は docs に置く（二重管理しない）。

## 技術スタック（固定）

- TypeScript / ESM（全パッケージ `"type": "module"`）
- パッケージマネージャ: **pnpm**（`npm` / `yarn` を使わない）
- AI: Vercel AI SDK — `ai@^6` / `@ai-sdk/anthropic@^3` / `@ai-sdk/vue@^3`
- バリデーション: `zod@^4`
- backend: Hono + SQLite（better-sqlite3） / frontend: Vue 3 + Vite

## 鉄則

- **AI SDK は v6 系**。ネット記事や学習知識の多くは v4 前提なので**そのまま書かない**。
  必ず [docs/CAUTION.md](docs/CAUTION.md) で現行 API を確認する（例: `toUIMessageStreamResponse()` /
  `convertToModelMessages()` は **async** / `DefaultChatTransport`）。
- **ワイヤ型の正は `ai` の `UIMessage`**。Zod で手書き再定義しない（[docs/CONTRACT.md](docs/CONTRACT.md) §1）。
- **依存方向は一方向**: `frontend → shared` / `backend → shared`。`shared` は他レイヤに依存しない。
- `frontend` ⇔ `backend` は **`ai` のメジャーを一致**させる（stream 互換のため）。
- 共有の型・スキーマは `shared` に置き、両側から `@app/shared` で参照する。
- YAGNI。最小チャットボットに不要なもの（RAG 用埋め込み列、tool parts の自前固定など）を先回りで作らない。

## コマンド

- 開発（同時起動）: `pnpm dev` ／ 個別: `pnpm dev:backend` / `pnpm dev:frontend`
- 型チェック（全体）: `pnpm typecheck`

## 作法

- シークレットをコミットしない（`backend/.env` は git 管理外、`*.sqlite*` も同様）。
- 既存ファイルのコメント密度・命名・スタイルに合わせる。回答・コメントは日本語で。
