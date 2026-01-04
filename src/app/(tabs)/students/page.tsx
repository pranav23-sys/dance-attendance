"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSyncData } from "@/lib/sync-manager";
import { useModal } from "@/contexts/ModalContext";
import { useFormValidation, validationRules, sanitizeInput } from "@/lib/validation";
import type { DanceClass, Student, RegisterSession } from "@/lib/sync-manager";

// Loading Screen Component
function LoadingScreen({ message = "Loading..." }: { message?: string }) {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
      <div className="text-center space-y-6">
        {/* Animated icon */}
        <div className="relative">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center shadow-xl overflow-hidden">
            <img
              src="/icon-512.png"
              alt="Bollywood Beatz Logo"
              className="w-full h-full object-contain animate-bounce"
            />
          </div>
        </div>

        {/* Loading text */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-neutral-200">Bollywood Beatz</h2>
          <p className="text-neutral-400 animate-pulse">{message}</p>
        </div>

        {/* Loading dots */}
        <div className="flex space-x-2 justify-center">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-200"></div>
        </div>
      </div>
    </main>
  );
}

/* ---------- TYPES ---------- */
type Status = "ABSENT" | "PRESENT" | "LATE" | "EXCUSED";

/* ---------- STORAGE KEYS ---------- */
const LS_CLASSES = "bb_classes";
const LS_STUDENTS = "bb_students";
const LS_SESSIONS = "bb_sessions";

export default function StudentsPage() {
  const router = useRouter();
  const { getClasses, getStudents, getSessions, saveStudents, saveSessions } = useSyncData();
  const { showModal } = useModal();

  const [classes, setClasses] = useState<DanceClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<RegisterSession[]>([]);

  const [newName, setNewName] = useState("");
  const [newClassId, setNewClassId] = useState("");
  const [loading, setLoading] = useState(true);

  const { errors, validate, clearError, hasErrors } = useFormValidation();

  /* ---------- LOAD DATA ---------- */
  useEffect(() => {
    const loadData = async () => {
      try {
        const [classesData, studentsData, sessionsData] = await Promise.all([
          getClasses(),
          getStudents(),
          getSessions(),
        ]);

        setClasses(classesData);
        setStudents(studentsData);
        setSessions(sessionsData);
      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to localStorage
        setClasses(JSON.parse(localStorage.getItem(LS_CLASSES) || "[]"));
        setStudents(JSON.parse(localStorage.getItem(LS_STUDENTS) || "[]"));
        setSessions(JSON.parse(localStorage.getItem(LS_SESSIONS) || "[]").filter((s: any) => !s.deleted));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [getClasses, getStudents, getSessions]);

  /* ---------- ACTIONS ---------- */
  const addStudent = async () => {
    const sanitizedName = sanitizeInput(newName);
    const nameValid = validate("studentName", sanitizedName, validationRules.studentName);
    const classValid = !!newClassId;

    if (!nameValid || !classValid) {
      if (!classValid) {
        showModal("alert", "Validation Error", "Please select a class for the student.");
      }
      return;
    }

    const newStudent: Student = {
      id: crypto.randomUUID(),
      name: sanitizedName,
      classId: newClassId,
      joinedAtISO: new Date().toISOString(),
      synced: false,
      updatedAt: new Date().toISOString(),
    };

    const updatedStudents = [...students, newStudent];
    setStudents(updatedStudents);

    try {
      await saveStudents(updatedStudents);
      setNewName("");
      clearError("studentName");
    } catch (error) {
      console.error('Error saving student:', error);
      showModal("alert", "Error", "Failed to save student. Please try again.");
    }
  };

  const moveStudent = async (id: string, classId: string) => {
    const updatedStudents = students.map((s) =>
      s.id === id
        ? { ...s, classId, joinedAtISO: new Date().toISOString(), synced: false, updatedAt: new Date().toISOString() }
        : s
    );
    setStudents(updatedStudents);

    try {
      await saveStudents(updatedStudents);
    } catch (error) {
      console.error('Error moving student:', error);
    }
  };

  const archiveStudent = async (id: string) => {
    showModal(
      "confirm",
      "Archive Student",
      "Archive this student?",
      async () => {
        const updatedStudents = students.map((s) =>
          s.id === id ? { ...s, archived: true, synced: false, updatedAt: new Date().toISOString() } : s
        );
        setStudents(updatedStudents);

        try {
          await saveStudents(updatedStudents);
        } catch (error) {
          console.error('Error archiving student:', error);
        }
      }
    );
  };

  const deleteSession = async (id: string) => {
    console.log('deleteSession called for:', id);

    // Mark session as deleted instead of filtering it out
    const updatedSessions = sessions.map((s) =>
      s.id === id
        ? { ...s, deleted: true, synced: false, updatedAt: new Date().toISOString() }
        : s
    );

    console.log('Updated sessions:', updatedSessions.filter(s => s.deleted));
    setSessions(updatedSessions);

    try {
      await saveSessions(updatedSessions);
      console.log('Session marked as deleted successfully');
    } catch (error) {
      console.error('Error deleting session:', error);
    }
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
  if (loading) {
    return <LoadingScreen message="Loading students..." />;
  }

  return (
    <main id="main-content" className="min-h-screen bg-black text-white p-4 pb-28">
      {/* HEADER */}
      <h1 className="text-3xl font-semibold mb-6 font-title text-[var(--color-accent)]">
        Students
      </h1>

      {/* ADD STUDENT */}
      <div className="rounded-2xl bg-neutral-900 ring-1 ring-neutral-800 p-5 mb-8 space-y-4">
        <div>
          <input
            className={`w-full rounded-xl px-4 py-3 outline-none ${
              errors.studentName ? "bg-red-900/40 ring-1 ring-red-500" : "bg-black/40"
            }`}
            placeholder="Student name"
            value={newName}
            onChange={(e) => {
              const value = e.target.value;
              setNewName(value);
              if (errors.studentName) {
                validate("studentName", sanitizeInput(value), validationRules.studentName);
              }
            }}
            onBlur={(e) => validate("studentName", sanitizeInput(e.target.value), validationRules.studentName)}
          />
          {errors.studentName && (
            <p className="mt-1 text-xs text-red-400">{errors.studentName}</p>
          )}
        </div>

        <select
          className="w-full rounded-xl bg-black/40 px-4 py-3"
          value={newClassId}
          onChange={(e) => setNewClassId(e.target.value)}
        >
          <option value="">Select class</option>
          {classes.filter(c => !c.deleted).map((c) => (
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
        {students.filter((s) => !s.archived && !s.deleted).map((s) => {
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
                  onClick={(e) => {
                    e.stopPropagation();
                    archiveStudent(s.id);
                  }}
                  className="text-xs text-neutral-400 hover:text-red-400 px-3 py-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
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
          // Filter out deleted sessions
          const filteredList = list.filter(s => !s.deleted);
          const cls = classes.find((c) => c.id === classId);
          return (
            <div
              key={classId}
              className="rounded-2xl bg-neutral-900 ring-1 ring-neutral-800 p-5"
            >
              <p className="font-medium mb-3">{cls?.name}</p>

              {filteredList.map((s) => (
                <div
                  key={s.id}
                  className="flex justify-between text-sm text-neutral-400 py-1"
                >
                  <span>
                    {new Date(s.startedAtISO).toLocaleString('en-GB')}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const sessionTime = new Date(s.startedAtISO).toLocaleString('en-GB');
                      showModal(
                        "confirm",
                        "Delete Register",
                        `Delete register from ${sessionTime}? This cannot be undone.`,
                        () => deleteSession(s.id)
                      );
                    }}
                    className="text-red-400 px-3 py-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-red-400/10 transition"
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
