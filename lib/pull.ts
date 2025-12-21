// Legacy pull functions - now handled by sync-manager.ts
// These functions are kept for backward compatibility during migration

import { syncManager } from "./sync-manager";

export async function pullPoints() {
  // Use the new sync manager for full sync
  try {
    await syncManager.performFullSync();
  } catch (error) {
    console.error("Pull failed", error);
  }
}
