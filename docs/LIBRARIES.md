# ライブラリ

# AI

秘密情報はバックエンドの`backend\.env`で管理

## AI SDK

- Vercel AI SDK（`ai@^6` / `@ai-sdk/anthropic@^3` / `@ai-sdk/vue@^3`）
  - https://ai-sdk.dev/llms.txt を参考にすること（※インデックスのみ。詳細は `docs/CAUTION.md` 参照）
  - プロバイダにはAnthropicを利用（`@ai-sdk/anthropic`）
  - `ANTHROPIC_API_KEY`利用

## AI Tool

- WEB検索
  - `@tavily/ai-sdk`
    - https://www.npmjs.com/package/@tavily/ai-sdk
    - https://github.com/tavily-ai/ai-sdk
  - `TAVILY_API_KEY`利用
  - ツール一覧
    - `Search`: Real-time web search optimized for AI applications
    - `Extract`: Clean, structured content extraction from URLs
    - `Crawl`: Intelligent website crawling at scale
    - `Map`: Website structure discovery and mapping
