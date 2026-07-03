/** Browser desktop / mobile notifications (Chrome, Edge, etc.). */

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function canNotify(): boolean {
  return typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted";
}

export function notify(title: string, body: string, tag?: string) {
  if (!canNotify()) return;
  try {
    new Notification(title, { body, tag, icon: "/favicon.ico" });
  } catch {
    // Some browsers block without user gesture — ignore.
  }
}
