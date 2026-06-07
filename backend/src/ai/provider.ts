import { anthropic } from "@ai-sdk/anthropic";

/**
 * AI プロバイダ抽象（CONTRACT.md §3）。
 * モデル選択はこの 1 関数の裏に隔離し、環境変数で差し替え可能にする。
 * `ANTHROPIC_API_KEY` はプロバイダが自動参照する。
 */
export function getModel() {
  const id = process.env.AI_MODEL ?? "claude-haiku-4-5";
  return anthropic(id);
}

/** 一般用途のフレンドリーなアシスタント向けシステムプロンプト。 */
export const SYSTEM_PROMPT =
  "You are a helpful, friendly general-purpose assistant. " +
  "Answer clearly and concisely, and ask for clarification when a request is ambiguous.";
