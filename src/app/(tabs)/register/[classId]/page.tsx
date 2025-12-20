"use client";
export function generateStaticParams() {
  return [];
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";



type DanceClass = {
  id: string;
  name: string;
  color: string;
};

type PointEvent = {
  id: string;
  studentId: string;
  classId: string;
  reason: string;
  points: number;
  createdAtISO: string;
  sessionId?: string; // used to dedupe "On Time" per register session
};

const LS_POINTS = "bb_points";

const POINT_PRESETS = [
  { id: "practice", label: "Practised at Home", points: 5, icon: "🏠" },
  { id: "trying", label: "Great Effort", points: 3, icon: "💪" },
  { id: "listening", label: "Focused", points: 3, icon: "👂" },
  { id: "impress", label: "Impressed Me", points: 2, icon: "🔥" },
] as const;

type Student = {
  id: string;
  name: string;
  classId: string;
  joinedAtISO: string; // when they joined THIS class
  archived?: boolean;
};

type Status = "ABSENT" | "PRESENT" | "LATE" | "EXCUSED";

type RegisterSession = {
  id: string;
  classId: string;
  startedAtISO: string;
  marks: Record<string, Status>;
  closedAtISO?: string;
};

const LS_CLASSES = "bb_classes";
const LS_STUDENTS = "bb_students";
const LS_SESSIONS = "bb_sessions";

const STATUS_LABEL: Record<Status, string> = {
  PRESENT: "/",
  LATE: "L",
  ABSENT: "x",
  EXCUSED: "N/A",
};

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function CircularPercent({ value }: { value: number }) {
  const radius = 18;
  const stroke = 3;
  const c = 2 * Math.PI * radius;
  const dash = (value / 100) * c;

  return (
    <div className="relative h-12 w-12">
      <svg viewBox="0 0 48 48" className="h-12 w-12">
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={stroke}
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform="rotate(-90 24 24)"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-xs font-semibold text-white">
        {Math.round(value)}%
      </div>
    </div>
  );
}

function statusRowBg(s: Status) {
  switch (s) {
    case "PRESENT":
      return "bg-emerald-950/40 ring-1 ring-emerald-500/30";
    case "LATE":
      return "bg-amber-950/40 ring-1 ring-amber-500/30";
    case "ABSENT":
      return "bg-rose-950/40 ring-1 ring-rose-500/30";
    case "EXCUSED":
      return "bg-sky-950/40 ring-1 ring-sky-500/30";
  }
}

function nextStatus(s: Status): Status {
  if (s === "ABSENT") return "PRESENT";
  if (s === "PRESENT") return "LATE";
  if (s === "LATE") return "EXCUSED";
  return "ABSENT";
}

export default function RegisterPage() {
  const { classId } = useParams<{ classId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionFromQuery = searchParams.get("session"); // 👈 ?session=...

  const [hydrated, setHydrated] = useState(false);

  const [danceClass, setDanceClass] = useState<DanceClass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<RegisterSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");

  const [points, setPoints] = useState<PointEvent[]>([]);
  const [toast, setToast] = useState<{
    studentName: string;
    reason: string;
    points: number;
  } | null>(null);

  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || null;
  }, [sessions, activeSessionId]);

  const isRegisterClosed = !!activeSession?.closedAtISO;

  // If URL has ?session=..., treat as viewing a past register (read-only)
  const isViewingPast = !!sessionFromQuery;
  const isReadOnly = isViewingPast || isRegisterClosed;

  const now = useMemo(() => new Date(), []);
  const todayLabel = useMemo(() => {
    return now.toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "short",
    });
  }, [now]);

  const todayBucket = useMemo(() => dayKey(new Date()), []);

  // ------- LOAD (only once per mount / classId) -------
  useEffect(() => {
    const savedClasses = localStorage.getItem(LS_CLASSES);
    if (savedClasses) {
      const cls: DanceClass[] = JSON.parse(savedClasses);
      const found = cls.find((c) => c.id === classId);
      setDanceClass(found ?? null);
    } else {
      setDanceClass(null);
    }

    const savedStudents = localStorage.getItem(LS_STUDENTS);
    if (savedStudents) {
      const all: Student[] = JSON.parse(savedStudents);
      setStudents(all.filter((s) => s.classId === classId && !s.archived));
    } else {
      setStudents([]);
    }

    const savedSessions = localStorage.getItem(LS_SESSIONS);
    if (savedSessions) {
      const all: RegisterSession[] = JSON.parse(savedSessions);
      setSessions(all.filter((x) => x.classId === classId));
    } else {
      setSessions([]);
    }

    const savedPoints = localStorage.getItem(LS_POINTS);
    setPoints(savedPoints ? JSON.parse(savedPoints) : []);

    setHydrated(true);
  }, [classId]);

  // ------- Sync query param -> activeSessionId (so clicking past register works reliably) -------
  useEffect(() => {
    if (!hydrated) return;
    if (sessionFromQuery) setActiveSessionId(sessionFromQuery);
  }, [hydrated, sessionFromQuery]);

  // ------- SAVE points (after hydration only) -------
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(LS_POINTS, JSON.stringify(points));
  }, [points, hydrated]);

  // ------- SAVE sessions (after hydration only) -------
  useEffect(() => {
    if (!hydrated) return;

    const saved = localStorage.getItem(LS_SESSIONS);
    const all: RegisterSession[] = saved ? JSON.parse(saved) : [];
    const withoutThisClass = all.filter((x) => x.classId !== classId);
    const merged = [...withoutThisClass, ...sessions];
    localStorage.setItem(LS_SESSIONS, JSON.stringify(merged));
  }, [sessions, classId, hydrated]);

  // ------- Today’s sessions -------
  const todaysSessions = useMemo(() => {
    return sessions
      .filter((s) => dayKey(new Date(s.startedAtISO)) === todayBucket)
      .sort((a, b) => +new Date(a.startedAtISO) - +new Date(b.startedAtISO));
  }, [sessions, todayBucket]);

  // ------- Choose active session OR create first one (ONLY after hydration) -------
  useEffect(() => {
    if (!hydrated) return;

    // If viewing a past register, do NOT auto-pick/create today’s
    if (sessionFromQuery) return;

    if (activeSessionId) return;

    if (todaysSessions.length > 0) {
      setActiveSessionId(todaysSessions[todaysSessions.length - 1].id);
      return;
    }

    // Create first session for today
    const id = crypto.randomUUID();
    const marks: Record<string, Status> = {};
    students.forEach((st) => (marks[st.id] = "ABSENT"));

    const newSession: RegisterSession = {
      id,
      classId,
      startedAtISO: new Date().toISOString(),
      marks,
    };

    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(id);
  }, [hydrated, activeSessionId, todaysSessions.length, students, classId, sessionFromQuery]);

  // Add newly-created students ONLY to an OPEN session (and not when viewing past)
  useEffect(() => {
    if (!hydrated) return;
    if (!activeSession) return;
    if (activeSession.closedAtISO) return;
    if (sessionFromQuery) return; // 🚫 don’t mutate old registers

    let changed = false;
    const marks = { ...activeSession.marks };

    for (const st of students) {
      const joinedAt = new Date(st.joinedAtISO);
      const sessionStart = new Date(activeSession.startedAtISO);

      // student didn't exist during this register
      if (joinedAt > sessionStart) continue;

      if (!(st.id in marks)) {
        marks[st.id] = "ABSENT";
        changed = true;
      }
    }

    if (!changed) return;

    setSessions((prev) =>
      prev.map((s) => (s.id === activeSession.id ? { ...s, marks } : s))
    );
  }, [hydrated, students, activeSession, sessionFromQuery]);

  const createNextRegisterToday = () => {
    if (!activeSession || !activeSession.closedAtISO) {
      alert("You must close the current register first.");
      return;
    }

    const id = crypto.randomUUID();
    const marks: Record<string, Status> = {};
    students.forEach((st) => (marks[st.id] = "ABSENT"));

    const newSession: RegisterSession = {
      id,
      classId,
      startedAtISO: new Date().toISOString(),
      marks,
    };

    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(id);
  };

  const givePoints = (studentId: string, reason: string, value: number, sessionId?: string) => {
    if (isReadOnly) return;

    setPoints((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        studentId,
        classId,
        reason,
        points: value,
        createdAtISO: new Date().toISOString(),
        sessionId,
      },
    ]);

    const student = students.find((s) => s.id === studentId);
    if (student) {
      setToast({ studentName: student.name, reason, points: value });
      setTimeout(() => setToast(null), 1200);
    }
  };

  const giveOnTimeOnce = (studentId: string) => {
    if (!activeSession) return;
    const exists = points.some(
      (p) =>
        p.studentId === studentId &&
        p.classId === classId &&
        p.reason === "On Time" &&
        p.sessionId === activeSession.id
    );
    if (exists) return;
    givePoints(studentId, "On Time", 1, activeSession.id);
  };

  const setStatus = (studentId: string, status: Status) => {
    if (!activeSession || isReadOnly) return;

    const prevStatus = activeSession.marks?.[studentId] ?? "ABSENT";

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSession.id) return s;
        return { ...s, marks: { ...s.marks, [studentId]: status } };
      })
    );

    // Auto on-time +1 when you mark PRESENT
    if (status === "PRESENT" && prevStatus !== "PRESENT") {
      giveOnTimeOnce(studentId);
    }
  };
  const pickRandomPresentOrLate = () => {
  if (!activeSession || isReadOnly) return;

  const eligible = students.filter((st) => {
    const status = activeSession.marks[st.id];
    return status === "PRESENT" || status === "LATE";
  });

  if (eligible.length === 0) {
    alert("No students marked Present or Late yet 👀");
    return;
  }

  const chosen = eligible[Math.floor(Math.random() * eligible.length)];

  alert(`🎉 Random pick: ${chosen.name}`);
};

  const cycleStatus = (studentId: string) => {
    if (!activeSession || isReadOnly) return;
    const current = activeSession.marks[studentId] ?? "ABSENT";
    setStatus(studentId, nextStatus(current));
  };

  const percentageByStudent = useMemo(() => {
    const map: Record<string, number> = {};

    for (const st of students) {
      const joinedAt = new Date(st.joinedAtISO);

      const relevant = sessions.filter((sess) => {
        const sessionStart = new Date(sess.startedAtISO);
        return sessionStart >= joinedAt || sess.marks?.[st.id] !== undefined;
      });

      let attended = 0;
      let possible = 0;

      for (const sess of relevant) {
        const mark = sess.marks?.[st.id] ?? null;
        if (mark === null) continue;
        if (mark === "EXCUSED") continue;

        possible += 1;
        if (mark === "PRESENT" || mark === "LATE") attended += 1;
      }

      map[st.id] = possible === 0 ? 0 : (attended / possible) * 100;
    }

    return map;
  }, [sessions, students]);

  const longPressTimers = useRef<Record<string, number>>({});

  const startLongPress = (studentId: string) => {
    if (longPressTimers.current[studentId]) window.clearTimeout(longPressTimers.current[studentId]);
    longPressTimers.current[studentId] = window.setTimeout(() => {
      router.push(`/students/${studentId}`);
    }, 500);
  };

  const cancelLongPress = (studentId: string) => {
    if (longPressTimers.current[studentId]) {
      window.clearTimeout(longPressTimers.current[studentId]);
      delete longPressTimers.current[studentId];
    }
  };

  const toastUI =
    toast &&
    typeof window !== "undefined" &&
    document.getElementById("toast-root") &&
    createPortal(
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
        <div className="rounded-xl bg-black/90 ring-1 ring-white/20 px-4 py-2 text-sm font-semibold text-white shadow-2xl">
          <span className="text-emerald-400">+{toast.points}</span>{" "}
          {toast.reason} • {toast.studentName}
        </div>
      </div>,
      document.getElementById("toast-root")!
    );

  if (!danceClass || !activeSession) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-neutral-400">Loading register…</p>
      </main>
    );
  }

  return (
    <>
      {toastUI}

      <main className="min-h-screen bg-black text-white p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={async () => router.back()} className="text-neutral-300 text-xl" type="button">
            ←
          </button>

          <div className="flex-1">
            <h1 className="text-2xl font-semibold font-title" style={{ color: danceClass.color }}>
              {danceClass.name}
            </h1>
            <p className="text-neutral-400 text-sm">{todayLabel}</p>
          </div>
        </div>

        {/* Viewing past banner */}
        {isViewingPast && (
          <div className="mb-4 rounded-2xl bg-white/5 ring-1 ring-white/10 p-3 text-sm text-neutral-300">
            Viewing a past register •{" "}
            <span className="text-neutral-400">{new Date(activeSession.startedAtISO).toLocaleString()}</span>
          </div>
        )}

        {/* Session controls */}
        <div className="rounded-2xl bg-neutral-900 ring-1 ring-neutral-800 p-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <p className="text-sm text-neutral-300 font-medium">Today’s registers</p>
              <p className="text-xs text-neutral-500">Take attendance for today's class.</p>
            </div>

            {!isViewingPast && (
  <div className="flex flex-col gap-2">
    <button
      onClick={createNextRegisterToday}
      className="rounded-xl bg-[var(--color-accent)] text-black px-3 py-2 text-sm font-semibold active:scale-[0.98] transition"
      type="button"
    >
      + New register
    </button>

    <button
      onClick={pickRandomPresentOrLate}
      disabled={isReadOnly}
      className="rounded-xl bg-white/10 ring-1 ring-white/20 px-3 py-2 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
      type="button"
    >
      🎲 Pick random student
    </button>
  </div>
)}

          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto">
            {todaysSessions.map((s, idx) => {
              const time = new Date(s.startedAtISO).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              const active = s.id === activeSessionId;

              return (
                <button
                  key={s.id}
                  onClick={async() => setActiveSessionId(s.id)}
                  className={[
                    "shrink-0 rounded-xl px-3 py-2 text-sm ring-1 transition",
                    active ? "bg-white/10 ring-white/20" : "bg-black/20 ring-neutral-700 text-neutral-300 opacity-80",
                  ].join(" ")}
                  type="button"
                >
                  #{idx + 1} • {time}
                </button>
              );
            })}
          </div>
        </div>

        {/* Student list */}
        {students.length === 0 ? (
          <div className="rounded-2xl bg-neutral-900 ring-1 ring-neutral-800 p-6 text-center">
            <p className="text-neutral-400">No students yet for this class.</p>
            <p className="text-neutral-500 text-sm mt-1">Add students from the Students tab (next step).</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {students
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((st) => {
                const status = activeSession.marks[st.id] ?? "ABSENT";
                const pct = percentageByStudent[st.id] ?? 0;

                return (
                  <div
                    key={st.id}
                    className={["rounded-2xl p-4 transition active:scale-[0.99]", statusRowBg(status)].join(" ")}
                    onClick={async () => cycleStatus(st.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-3">
                      <CircularPercent value={pct} />

                      <div className="flex-1 min-w-0">
                        <p
                          className="font-semibold text-white truncate select-none"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            startLongPress(st.id);
                          }}
                          onPointerUp={(e) => {
                            e.stopPropagation();
                            cancelLongPress(st.id);
                          }}
                          onPointerCancel={(e) => {
                            e.stopPropagation();
                            cancelLongPress(st.id);
                          }}
                          onPointerLeave={(e) => {
                            e.stopPropagation();
                            cancelLongPress(st.id);
                          }}
                        >
                          {st.name}
                        </p>

                        <p className="text-xs text-neutral-300">
                          Lifetime attendance since joining •{" "}
                          <span className="font-semibold">{Math.round(pct)}%</span>
                        </p>
                      </div>

                      <div className="text-sm font-bold text-white/90 px-2 py-1 rounded-lg bg-black/30">
                        {STATUS_LABEL[status]}
                      </div>
                    </div>

                    {/* Status buttons */}
                    <div className="mt-3 flex gap-2">
                      <button
                        disabled={isReadOnly}
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatus(st.id, "PRESENT");
                        }}
                        className="flex-1 rounded-xl bg-emerald-500/20 ring-1 ring-emerald-500/30 px-3 py-2 text-sm font-semibold active:scale-[0.98] transition disabled:opacity-40"
                        type="button"
                      >
                        Present (/)
                      </button>

                      <button
                        disabled={isReadOnly}
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatus(st.id, "LATE");
                        }}
                        className="flex-1 rounded-xl bg-amber-500/20 ring-1 ring-amber-500/30 px-3 py-2 text-sm font-semibold active:scale-[0.98] transition disabled:opacity-40"
                        type="button"
                      >
                        Late (L)
                      </button>

                      <button
                        disabled={isReadOnly}
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatus(st.id, "ABSENT");
                        }}
                        className="flex-1 rounded-xl bg-rose-500/20 ring-1 ring-rose-500/30 px-3 py-2 text-sm font-semibold active:scale-[0.98] transition disabled:opacity-40"
                        type="button"
                      >
                        Absent (x)
                      </button>

                      <button
                        disabled={isReadOnly}
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatus(st.id, "EXCUSED");
                        }}
                        className="flex-1 rounded-xl bg-sky-500/20 ring-1 ring-sky-500/30 px-3 py-2 text-sm font-semibold active:scale-[0.98] transition disabled:opacity-40"
                        type="button"
                      >
                        Excused (N/A)
                      </button>
                    </div>

                    {/* Points presets */}
                    <div className="mt-2 flex gap-2 overflow-x-auto">
                      {POINT_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          disabled={isReadOnly}
                          onClick={(e) => {
                            e.stopPropagation();
                            givePoints(st.id, p.label, p.points);
                          }}
                          className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-xs flex items-center gap-1 transition active:scale-[0.95] hover:bg-white/20 disabled:opacity-40"
                          type="button"
                          title={p.label}
                        >
                          <span>{p.icon}</span>
                          <span>+{p.points}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Close register button (only for active/today session, not for past view) */}
        {!isViewingPast && (
          <div className="mt-6">
            <button
              disabled={isRegisterClosed}
              onClick={async () => {
  const closedAt = new Date().toISOString();

  // 1️⃣ Close the register
  setSessions((prev) =>
    prev.map((s) =>
      s.id === activeSession.id
        ? { ...s, closedAtISO: closedAt }
        : s
    )
  );

  // 2️⃣ Load fresh data (awards logic needs full context)
  const allStudents = JSON.parse(
    localStorage.getItem("bb_students") || "[]"
  );

  const allSessions = JSON.parse(
    localStorage.getItem("bb_sessions") || "[]"
  );

  const allPoints = JSON.parse(
    localStorage.getItem("bb_points") || "[]"
  );

 

}}

              className={[
                "w-full rounded-2xl py-4 text-lg font-semibold transition",
                isRegisterClosed ? "bg-neutral-700 text-neutral-400" : "bg-red-500 text-white active:scale-[0.98]",
              ].join(" ")}
            >
              {isRegisterClosed ? "Register closed" : "Close register"}
            </button>
          </div>
        )}
      </main>
    </>
  );
}
