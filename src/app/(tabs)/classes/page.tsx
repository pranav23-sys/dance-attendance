"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSyncData } from "@/lib/sync-manager";
import type { DanceClass } from "@/lib/sync-manager";

const CLASS_COLORS = [
  "#ff8c1a", // brand orange
  "#ec4899", // pink
  "#a855f7", // purple
  "#3b82f6", // blue
  "#14b8a6", // teal
  "#22c55e", // green
  "#eab308", // yellow
  "#ef4444", // red
];

export default function ClassesPage() {
  const router = useRouter();
  const { getClasses, saveClasses } = useSyncData();

  const [classes, setClasses] = useState<DanceClass[]>([]);
  const [newClassName, setNewClassName] = useState("");
  const [selectedColor, setSelectedColor] = useState(CLASS_COLORS[0]);
  const [loading, setLoading] = useState(true);

  /* ---------- LOAD DATA ---------- */
  useEffect(() => {
    const loadData = async () => {
      try {
        const classesData = await getClasses();
        setClasses(classesData);
      } catch (error) {
        console.error('Error loading classes:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem("bb_classes");
        if (saved) {
          setClasses(JSON.parse(saved));
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [getClasses]);

  /* ---------- ACTIONS ---------- */

  const addClass = async () => {
    const name = newClassName.trim();
    if (!name) return;

    const exists = classes.some(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );

    if (exists) {
      alert("A class with this name already exists.");
      return;
    }

    const newClass: DanceClass = {
      id: crypto.randomUUID(),
      name,
      color: selectedColor,
      synced: false,
      updatedAt: new Date().toISOString(),
    };

    const updatedClasses = [...classes, newClass];
    setClasses(updatedClasses);

    try {
      await saveClasses(updatedClasses);
    } catch (error) {
      console.error('Error saving class:', error);
      // Class will be synced when connection is restored
    }

    setNewClassName("");
    setSelectedColor(CLASS_COLORS[0]);
  };

  const deleteClass = async (id: string) => {
    console.log('deleteClass called for:', id);

    // Mark class as deleted instead of filtering it out
    const updatedClasses = classes.map((c) =>
      c.id === id
        ? { ...c, deleted: true, synced: false, updatedAt: new Date().toISOString() }
        : c
    );

    console.log('Updated classes:', updatedClasses.filter(c => c.deleted));
    setClasses(updatedClasses);

    try {
      await saveClasses(updatedClasses);
      console.log('Class marked as deleted successfully');
    } catch (error) {
      console.error('Error deleting class:', error);
      // Deletion will be synced when connection is restored
    }
  };

  /* ---------- UI ---------- */

  return (
    <main className="min-h-screen bg-black text-white p-4">
      {/* Title */}
      <h1 className="text-3xl font-semibold mb-6 tracking-wide text-[var(--color-accent)] font-title">
        Classes
      </h1>

      {/* Add class */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg bg-neutral-900 px-3 py-2 outline-none"
            placeholder="New class name"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
          />
          <button
            onClick={addClass}
            className="rounded-lg bg-[var(--color-accent)] text-black px-4 font-medium"
          >
            Add
          </button>
        </div>

        {/* Colour picker */}
        <div className="flex gap-2">
          {CLASS_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`h-7 w-7 rounded-full border-2 transition ${
                selectedColor === color
                  ? "border-white scale-110"
                  : "border-transparent opacity-70"
              }`}
              style={{ backgroundColor: color }}
              aria-label="Select class colour"
            />
          ))}
        </div>
      </div>

      {/* Class list */}
      {classes.filter(c => !c.deleted).length === 0 ? (
        <p className="text-neutral-400">
          No classes yet. Add your first class.
        </p>
      ) : (
        <div className="grid gap-4">
          {classes.filter(c => !c.deleted).map((c) => (
            <div
  key={c.id}
  onClick={() => router.push(`/register/${c.id}`)}
  className="
    relative
    rounded-2xl
    bg-neutral-900
    pl-6 pr-5 py-5
    shadow-lg
    ring-1 ring-neutral-700
    active:scale-[0.97]
    transition
    cursor-pointer
  "
>
  {/* Accent strip */}
  <div
    className="absolute left-0 top-0 h-full w-1.5 rounded-l-2xl"
    style={{ backgroundColor: c.color }}
  />

  {/* Delete (top-right, danger zone) */}
  <button
    onClick={(e) => {
      e.stopPropagation();
      if (confirm(`Delete "${c.name}" class?\nThis cannot be undone.`)) {
        deleteClass(c.id);
      }
    }}
    className="absolute top-3 right-3 text-neutral-400 hover:text-red-400 transition p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
    aria-label="Delete class"
  >
    🗑️
  </button>

  {/* Main content */}
  <div className="flex flex-col gap-3">
    <p className="text-lg font-medium tracking-wide font-title">
      {c.name}
    </p>

    {/* Bottom row */}
    <div className="flex items-center justify-between">
      <button
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/classes/${c.id}`);
        }}
        className="text-xs rounded-lg bg-white/10 px-3 py-1 text-neutral-200 hover:bg-white/20 transition"
      >
        View
      </button>

      <span className="text-xs text-neutral-500">
        Tap card to take register
      </span>
    </div>
  </div>
</div>


          ))}
        </div>
      )}
    </main>
  );
}
