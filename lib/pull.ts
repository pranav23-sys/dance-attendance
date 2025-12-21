// Legacy pull functions - now handled by sync-manager.ts
// These functions are kept for backward compatibility during migration

import { syncManager } from "./sync-manager";

export async function pullPoints() {
  // Use the new sync manager to sync from cloud
  try {
    await syncManager.syncFromCloud();
  } catch (error) {
    console.error("Pull failed", error);
  }
}
