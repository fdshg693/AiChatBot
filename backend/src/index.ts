import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { chatRoutes } from "./routes/chat.js";
import { createLogger } from "./log.js";
// DB をインポート時に初期化（テーブル作成・PRAGMA）。
import "./db.js";

const log = createLogger("server");

// 必須/任意の環境変数を起動時に検査する。欠けていても起動は続けるが、
// 実行時に SDK 内部で握り潰されて見えにくいので、ここで明示的に警告しておく。
// （ANTHROPIC: AI 応答に必須 / TAVILY: Web 検索・本文抽出ツール使用時に必須）
function checkEnv(): void {
  if (!process.env.ANTHROPIC_API_KEY) {
    log.warn("ANTHROPIC_API_KEY 未設定: AI 応答が失敗します（backend/.env を確認）。");
  }
  if (!process.env.TAVILY_API_KEY) {
    log.warn("TAVILY_API_KEY 未設定: Web 検索/本文抽出ツールが失敗します。");
  }
}

checkEnv();

const app = new Hono();

// 開発用の寛容な CORS（Vite フロントは localhost:5173）。
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })
);

app.get("/", (c) => c.text("AiChatBot backend OK"));

app.route("/", chatRoutes);

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  log.info(`Backend listening on http://localhost:${info.port}`);
});
