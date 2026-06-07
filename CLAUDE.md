# CLAUDE.md

汎用 AI チャットボット。pnpm モノレポ（`shared` / `backend` / `frontend`）。

## 必要に応じて読む

実装に当たって守るべき契約・データモデル・各レイヤの方針は [CONTRACT.md](docs/CONTRACT.md) を参照。
バージョン動向・ハマりどころ（AI SDK v4→v5/v6 の破壊的変更など）は [CAUTION.md](docs/CAUTION.md) を参照。
現状提供している機能は [FEATURES.md](docs/FEATURES.md) を参照。
主要なライブラリ等の説明は[LIBRARIES.md](docs/LIBRARIES.md)を参照。

ここ（CLAUDE.md）には恒久的なルールだけを書き、設計の詳細は docs に置く（二重管理しない）。

## 主要技術スタック

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

## コマンド

- 開発（同時起動）: `pnpm dev` ／ 個別: `pnpm dev:backend` / `pnpm dev:frontend`
- 型チェック（全体）: `pnpm typecheck`

## 作法

- シークレットをコミットしない（`backend/.env` は git 管理外、`*.sqlite*` も同様）。
- 既存ファイルのコメント密度・命名・スタイルに合わせる。回答・コメントは日本語で。
