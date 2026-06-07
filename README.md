# AIチャットボットを作ってみる

## ユースケース

- 汎用チャットボット（特定ドメインに限定しない、対話型のAIアシスタント）

実装に当たって守るべき契約・データモデル・各レイヤの方針は [CONTRACT.md](docs/CONTRACT.md) を参照。
バージョン動向・ハマりどころ（AI SDK v4→v5/v6 の破壊的変更など）は [CAUTION.md](docs/CAUTION.md) を参照。
現状提供している機能は [FEATURES.md](docs/FEATURES.md) を参照。

## 使用技術

- Typescript(バックエンド・フロントエンド)
  - Hono(バックエンド)
  - Vue

- pnpm (パッケージマネージャー)

- AI利用
  - Vercel AI SDK（`ai@^6` / `@ai-sdk/anthropic@^3` / `@ai-sdk/vue@^3`）
  - https://ai-sdk.dev/llms.txt を参考にすること（※インデックスのみ。詳細は `docs/CAUTION.md` 参照）

- DB
  - SQLite

- その他
  - Zod
