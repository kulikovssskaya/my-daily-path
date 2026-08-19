import { touchTimestamp } from "@/lib/dataProtection";
import { setLocalSyncMeta } from "@/lib/sync/syncAuthClient";
import { flushPersistedStoresToLocalStorage } from "@/lib/sync/syncStoreFlush";

/** Persist schedule to localStorage and mark local sync newer than cloud. */
export function markScheduleDirty() {
  if (typeof window === "undefined") return;
  flushPersistedStoresToLocalStorage();
  setLocalSyncMeta(touchTimestamp());
}
