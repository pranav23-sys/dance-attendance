import { supabase } from "./supabase";

export async function pullPoints() {
  const { data, error } = await supabase.from("points").select("*");
  if (error || !data) return;

  const local = JSON.parse(localStorage.getItem("bb_points") || "[]");

  const map = new Map();
  [...local, ...data].forEach((p) => {
    const existing = map.get(p.id);
    if (!existing || existing.updatedAtISO < p.updatedAtISO) {
      map.set(p.id, p);
    }
  });

  localStorage.setItem(
    "bb_points",
    JSON.stringify(Array.from(map.values()))
  );
}
