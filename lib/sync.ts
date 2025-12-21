// Legacy sync functions - now handled by sync-manager.ts
// These functions are kept for backward compatibility during migration

import { syncManager } from "./sync-manager";

export async function syncPoints(points: any[]) {
  // Use the new sync manager
  try {
    await syncManager.savePoints(points);
  } catch (error) {
    console.error("Sync failed", error);
  }
}
