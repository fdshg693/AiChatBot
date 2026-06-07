# shared/ ルール

フロント・バック両方が依存する共通レイヤ。Zod スキーマと共通型を置く。詳細は [../docs/CONTRACT.md](../docs/CONTRACT.md) §1。

## 役割（これだけに絞る）

1. **自前ドメイン型**の定義（例: `Conversation`）
2. **永続化境界のバリデータ**（DB 読み書き時に `id/role/parts` の封筒を検証）

## ルール

- **ワイヤ型（フロント⇔バック）は `ai` の `UIMessage` が正**。Zod で再定義しない。
- `parts` の検証は「`text` だけ厳格・他はパススルー」。`tool` / `file` / `reasoning` は SDK 準拠の JSON として通す（v6 で形が変わるため自前固定しない）。
- 日時は **ISO 8601 文字列**で統一。
- **他レイヤ（backend/frontend）に依存しない**。例外として型 `UIMessage` のため `ai` に型のみ依存して良い。
- エクスポート入口は `src/index.ts`。新しい型・スキーマはここから re-export する。
