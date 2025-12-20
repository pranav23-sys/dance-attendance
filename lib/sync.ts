import { supabase } from "./supabase";

export async function syncPoints(points: any[]) {
  const unsynced = points.filter((p) => !p.synced);

  if (unsynced.length === 0) return;

  const { error } = await supabase
    .from("points")
    .upsert(unsynced, { onConflict: "id" });

  if (error) {
    console.error("Sync failed", error);
    return;
  }

  // mark as synced locally
  const updated = points.map((p) =>
    unsynced.find((u) => u.id === p.id)
      ? { ...p, synced: true }
      : p
  );

  localStorage.setItem("bb_points", JSON.stringify(updated));
}
