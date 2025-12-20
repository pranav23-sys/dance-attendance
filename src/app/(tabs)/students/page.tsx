"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/* ---------- TYPES ---------- */
type DanceClass = {
  id: string;
  name: string;
  color: string;
};

type Student = {
  id: string;
  name: string;
  classId: string;
  joinedAtISO: string;
  archived?: boolean;
};

type Status = "ABSENT" | "PRESENT" | "LATE" | "EXCUSED";

type RegisterSession = {
  id: string;
  classId: string;
  startedAtISO: string;
  marks: Record<string, Status>;
};

/* ---------- STORAGE KEYS ---------- */
const LS_CLASSES = "bb_classes";
const LS_STUDENTS = "bb_students";
const LS_SESSIONS = "bb_sessions";

export default function StudentsPage() {
  const router = useRouter();

  const [classes, setClasses] = useState<DanceClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<RegisterSession[]>([]);

  const [newName, setNewName] = useState("");
  const [newClassId, setNewClassId] = useState("");

  const [hydrated, setHydrated] = useState(false); // 🔑 critical fix

  /* ---------- LOAD (ONCE) ---------- */
  useEffect(() => {
    setClasses(JSON.parse(localStorage.getItem(LS_CLASSES) || "[]"));
    setStudents(JSON.parse(localStorage.getItem(LS_STUDENTS) || "[]"));
    setSessions(JSON.parse(localStorage.getItem(LS_SESSIONS) || "[]"));
    setHydrated(true);
  }, []);

  /* ---------- SAVE (GUARDED) ---------- */
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(LS_STUDENTS, JSON.stringify(students));
  }, [students, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(LS_SESSIONS, JSON.stringify(sessions));
  }, [sessions, hydrated]);

  /* ---------- ACTIONS ---------- */
  const addStudent = () => {
    if (!newName.trim() || !newClassId) return;

    setStudents((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: newName.trim(),
        classId: newClassId,
        joinedAtISO: new Date().toISOString(),
      },
    ]);

    setNewName("");
  };

  const moveStudent = (id: string, classId: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, classId, joinedAtISO: new Date().toISOString() }
          : s
      )
    );
  };

  const archiveStudent = (id: string) => {
    if (!confirm("Archive this student?")) return;
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, archived: true } : s))
    );
  };

  const deleteSession = (id: string) => {
    if (!confirm("Delete this register? This cannot be undone.")) return;
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  /* ---------- DERIVED ---------- */
  const sessionsByClass = useMemo(() => {
    const map: Record<string, RegisterSession[]> = {};
    for (const s of sessions) {
      if (!map[s.classId]) map[s.classId] = [];
      map[s.classId].push(s);
    }
    return map;
  }, [sessions]);

  /* ---------- UI ---------- */
  return (
    <main className="min-h-screen bg-black text-white p-4 pb-28">
      {/* HEADER */}
      <h1 className="text-3xl font-semibold mb-6 font-title text-[var(--color-accent)]">
        Students
      </h1>

      {/* ADD STUDENT */}
      <div className="rounded-2xl bg-neutral-900 ring-1 ring-neutral-800 p-5 mb-8 space-y-4">
        <input
          className="w-full rounded-xl bg-black/40 px-4 py-3 outline-none"
          placeholder="Student name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />

        <select
          className="w-full rounded-xl bg-black/40 px-4 py-3"
          value={newClassId}
          onChange={(e) => setNewClassId(e.target.value)}
        >
          <option value="">Select class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <button
          onClick={addStudent}
          className="w-full rounded-xl bg-[var(--color-accent)] text-black py-3 font-semibold"
        >
          Add student
        </button>
      </div>

      {/* STUDENTS LIST */}
      <div className="space-y-4">
        {students.filter((s) => !s.archived).map((s) => {
          const cls = classes.find((c) => c.id === s.classId);

          return (
            <div
              key={s.id}
              className="rounded-2xl bg-neutral-900 ring-1 ring-neutral-800 p-5"
            >
              {/* CLICKABLE PROFILE AREA */}
              <div
                onClick={() => router.push(`/students/${s.id}`)}
                className="cursor-pointer active:scale-[0.98] transition"
              >
                {cls && (
                  <div
                    className="absolute left-0 top-0 h-full w-1.5 rounded-l-2xl"
                    style={{ backgroundColor: cls.color }}
                  />
                )}

                <p className="font-semibold text-lg">{s.name}</p>
                <p className="text-sm text-neutral-400">
                  {cls?.name ?? "No class"}
                </p>
              </div>

              {/* ACTIONS */}
              <div className="mt-4 flex gap-2">
                <select
                  className="flex-1 rounded-xl bg-black/40 px-4 py-2 text-sm"
                  value={s.classId}
                  onChange={(e) => moveStudent(s.id, e.target.value)}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      Move to {c.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => archiveStudent(s.id)}
                  className="text-xs text-neutral-400 hover:text-red-400"
                >
                  Archive
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* REGISTERS ADMIN */}
      <h2 className="text-xl font-semibold mt-12 mb-4 font-title">
        Registers
      </h2>

      <div className="space-y-4">
        {Object.entries(sessionsByClass).map(([classId, list]) => {
          const cls = classes.find((c) => c.id === classId);
          return (
            <div
              key={classId}
              className="rounded-2xl bg-neutral-900 ring-1 ring-neutral-800 p-5"
            >
              <p className="font-medium mb-3">{cls?.name}</p>

              {list.map((s) => (
                <div
                  key={s.id}
                  className="flex justify-between text-sm text-neutral-400 py-1"
                >
                  <span>
                    {new Date(s.startedAtISO).toLocaleString()}
                  </span>
                  <button
                    onClick={() => deleteSession(s.id)}
                    className="text-red-400"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </main>
  );
}
