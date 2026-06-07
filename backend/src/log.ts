import { appendFileSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { format } from "node:util";

/**
 * 軽量ロガー（外部依存なし）。
 * デバッグを容易にするための最小限の仕組み。出力は console とログファイルの両方へ。
 *
 * - レベルは `debug < info < warn < error` の 4 段。`LOG_LEVEL` 環境変数で
 *   しきい値を切り替える（既定 `info`）。例: `LOG_LEVEL=debug pnpm dev`。
 * - 名前空間付きで作る（`createLogger("chat")`）。出力に `[chat]` が付く。
 * - ツール引数や API レスポンスなど**機微になり得る値は debug レベル**に置き、
 *   既定（info）では出さない方針にする（CLAUDE.md / 作法）。
 *
 * ## ファイル出力とローテーション
 * - `LOG_DIR`（既定 `./logs`）の `LOG_FILE`（既定 `app.log`）に追記する。
 * - **サイズで切る**: 書き込み前に現ファイルが `LOG_MAX_SIZE`（既定 5MB）を超えていたら
 *   `app.log` → `app.log.1` → `app.log.2` … と番号をずらして退避し、新しい `app.log` に書き直す。
 *   退避は `LOG_MAX_FILES`（既定 3）世代まで保持し、それより古いものは捨てる。
 */

const LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LEVELS)[number];

/** `LOG_LEVEL` を解釈する。未知の値は `info` に丸める。 */
function resolveThreshold(): number {
  const raw = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  const idx = LEVELS.indexOf(raw as LogLevel);
  return idx >= 0 ? idx : LEVELS.indexOf("info");
}

const threshold = resolveThreshold();

const LOG_DIR = process.env.LOG_DIR ?? "./logs";
const LOG_FILE = process.env.LOG_FILE ?? "app.log";
const LOG_MAX_SIZE = Number(process.env.LOG_MAX_SIZE ?? 5_000_000);
const LOG_MAX_FILES = Number(process.env.LOG_MAX_FILES ?? 3);
const logPath = join(LOG_DIR, LOG_FILE);

// ディレクトリは起動時に一度だけ用意する（無ければ作る）。
mkdirSync(LOG_DIR, { recursive: true });

/** 現ファイルが上限超過なら退避する（番号ローテーション）。 */
function rotateIfNeeded(): void {
  let size: number;
  try {
    size = statSync(logPath).size;
  } catch {
    return; // まだ無ければ何もしない（次の追記で作られる）。
  }
  if (size < LOG_MAX_SIZE) return;

  // 古い世代から順にずらす: app.log.(N-1) → app.log.N（最古は捨てる）。
  try {
    rmSync(`${logPath}.${LOG_MAX_FILES}`, { force: true });
  } catch {
    /* 無ければ無視 */
  }
  for (let i = LOG_MAX_FILES - 1; i >= 1; i--) {
    try {
      renameSync(`${logPath}.${i}`, `${logPath}.${i + 1}`);
    } catch {
      /* 無ければ無視 */
    }
  }
  try {
    renameSync(logPath, `${logPath}.1`);
  } catch {
    /* 競合等は握りつぶし、追記継続を優先 */
  }
}

/** 1 行をファイルへ追記する（失敗してもアプリは止めない）。 */
function writeFile(line: string): void {
  try {
    rotateIfNeeded();
    appendFileSync(logPath, line + "\n");
  } catch {
    /* ファイル I/O 失敗時は console 出力のみで継続 */
  }
}

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/** 名前空間付きロガーを作る。 */
export function createLogger(namespace: string): Logger {
  function emit(level: LogLevel, message: string, args: unknown[]): void {
    if (LEVELS.indexOf(level) < threshold) return;
    const ts = new Date().toISOString();
    // 追加引数（オブジェクト等）も 1 行に畳んでファイルへ残せるよう整形する。
    const body = args.length ? format(message, ...args) : message;
    const line = `[${ts}] ${level.toUpperCase()} [${namespace}] ${body}`;
    // warn/error は stderr、それ以外は stdout に出す。
    const sink = level === "warn" || level === "error" ? console.error : console.log;
    sink(line);
    writeFile(line);
  }

  return {
    debug: (m, ...a) => emit("debug", m, a),
    info: (m, ...a) => emit("info", m, a),
    warn: (m, ...a) => emit("warn", m, a),
    error: (m, ...a) => emit("error", m, a),
  };
}
