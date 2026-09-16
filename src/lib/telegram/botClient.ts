/** Client-safe bot username (no secrets). */
export function getBotUsername(): string {
  return process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() || "search_jooobbb_bot";
}
