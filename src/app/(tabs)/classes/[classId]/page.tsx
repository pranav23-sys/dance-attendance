"use client";
export function generateStaticParams() {
  return [];
}

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { loadAwards } from "../../../../../lib/awards/awards.storage";

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

type PointEvent = {
  id: string;
  studentId: string;
  classId: string;
  reason: string;
  points: number;
  createdAtISO: string;
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
const LS_POINTS = "bb_points";

/* ---------- UI ---------- */
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
          stroke="rgba(255,255,255,0.1)"
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
      <div className="absolute inset-0 grid place-items-center text-xs font-semibold">
        {Math.round(value)}%
      </div>
    </div>
  );
}

export default function ClassProfilePage() {
  const { classId } = useParams<{ classId: string }>();
  const router = useRouter();

  const [cls, setCls] = useState<DanceClass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<RegisterSession[]>([]);
  const [points, setPoints] = useState<PointEvent[]>([]);
  const [awards, setAwards] = useState<any[]>([]);

  // leaderboard date filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  /* ---------- LOAD ---------- */
  useEffect(() => {
    const classes: DanceClass[] = JSON.parse(
      localStorage.getItem(LS_CLASSES) || "[]"
    );
    setCls(classes.find((c) => c.id === classId) || null);

    const allStudents: Student[] = JSON.parse(
      localStorage.getItem(LS_STUDENTS) || "[]"
    );
    setStudents(
      allStudents.filter(
        (s) => s.classId === classId && !s.archived
      )
    );

    const allSessions: RegisterSession[] = JSON.parse(
      localStorage.getItem(LS_SESSIONS) || "[]"
    );
    setSessions(allSessions.filter((s) => s.classId === classId));

    const allPoints: PointEvent[] = JSON.parse(
      localStorage.getItem(LS_POINTS) || "[]"
    );
    setPoints(allPoints.filter((p) => p.classId === classId));

    const allAwards = loadAwards();
    setAwards(allAwards.filter((a) => a.classId === classId));
  }, [classId]);

  /* ---------- BIG AWARDS ONLY ---------- */
  const bigAwards = useMemo(
    () => awards.filter((a) => !a.awardId.includes("month")),
    [awards]
  );

  /* ---------- POINTS LEADERBOARD ---------- */
  const leaderboard = useMemo(() => {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    const totals: Record<string, number> = {};

    for (const p of points) {
      const d = new Date(p.createdAtISO);
      if (start && d < start) continue;
      if (end && d > end) continue;
      totals[p.studentId] = (totals[p.studentId] || 0) + p.points;
    }

    return students
      .map((s) => ({
        student: s,
        points: totals[s.id] || 0,
      }))
      .sort((a, b) => b.points - a.points);
  }, [points, students, startDate, endDate]);

  /* ---------- CLASS STATS ---------- */
  const stats = useMemo(() => {
    let totalPercent = 0;
    let counted = 0;

    for (const st of students) {
      const joinedAt = new Date(st.joinedAtISO);

      const relevant = sessions.filter((s) => {
        const sessionStart = new Date(s.startedAtISO);
        return (
          sessionStart >= joinedAt ||
          s.marks[st.id] !== undefined
        );
      });

      let attended = 0;
      let possible = 0;

      for (const s of relevant) {
        const mark = s.marks[st.id];
        if (mark === "EXCUSED") continue;
        possible += 1;
        if (mark === "PRESENT" || mark === "LATE") attended += 1;
      }

      if (possible > 0) {
        totalPercent += (attended / possible) * 100;
        counted += 1;
      }
    }

    return {
      average: counted === 0 ? 0 : totalPercent / counted,
      totalStudents: students.length,
      totalRegisters: sessions.length,
    };
  }, [students, sessions]);

  if (!cls) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-neutral-400">Loading class…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 pb-24">
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-neutral-300 text-xl">
          ←
        </button>

        <div>
          <h1 className="text-2xl font-semibold" style={{ color: cls.color }}>
            {cls.name}
          </h1>
          <p className="text-sm text-neutral-400">
            {stats.totalStudents} students • {stats.totalRegisters} registers
          </p>
        </div>
      </div>

      {/* STATS */}
      <div className="rounded-2xl bg-neutral-900 ring-1 ring-neutral-800 p-5 mb-8">
        <p className="text-sm text-neutral-400 mb-1">Average attendance</p>
        <p className="text-3xl font-bold">{Math.round(stats.average)}%</p>
      </div>

      {/* CLASS AWARDS */}
      {bigAwards.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-3">Class Awards</h2>
          <div className="space-y-2 mb-8">
            {bigAwards.map((a) => {
              const student = students.find((s) => s.id === a.studentId);
              return (
                <div
                  key={a.id}
                  className="rounded-xl bg-neutral-900 ring-1 ring-neutral-800 px-4 py-3"
                >
                  <p className="font-semibold">
                    {a.awardId.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm text-neutral-300">
                    {student?.name ?? "Unknown student"}
                  </p>
                  <p className="text-xs text-neutral-500">{a.periodKey}</p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* POINTS LEADERBOARD */}
      <h2 className="text-lg font-semibold mb-3">Points leaderboard</h2>


      <div className="flex gap-3 mb-4 items-end">
        <div>
          <label className="block text-xs text-neutral-400 mb-1">
            From
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg bg-neutral-900 ring-1 ring-neutral-700 px-3 py-1 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs text-neutral-400 mb-1">
            To
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg bg-neutral-900 ring-1 ring-neutral-700 px-3 py-1 text-sm"
          />
        </div>

        <button
          onClick={() => {
            setStartDate("");
            setEndDate("");
          }}
          className="h-8 px-3 rounded-lg text-sm font-semibold bg-neutral-800 text-neutral-300 ring-1 ring-neutral-700"
        >
          Clear
        </button>
      </div>

      <div className="space-y-2 mb-8">
        {leaderboard.map(({ student, points }, idx) => (
          <div
            key={student.id}
            onClick={() => router.push(`/students/${student.id}`)}
            className="rounded-xl bg-neutral-900 ring-1 ring-neutral-800 px-4 py-3 flex items-center justify-between cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <span className="text-neutral-400 font-semibold">
                #{idx + 1}
              </span>
              <span className="font-semibold">
                {student.name}
              </span>
            </div>

            <span className="font-bold text-emerald-400">
              {points} pts
            </span>
          </div>
        ))}

        {leaderboard.length === 0 && (
          <p className="text-sm text-neutral-400">
            No points in this range.
          </p>
        )}
      </div>

      {/* STUDENTS */}
      <h2 className="text-lg font-semibold mb-3">
        Students
      </h2>

      <div className="space-y-3">
        {students.map((st) => {
          const joinedAt = new Date(st.joinedAtISO);

          const relevant = sessions.filter((s) => {
            const sessionStart = new Date(s.startedAtISO);
            return (
              sessionStart >= joinedAt ||
              s.marks[st.id] !== undefined
            );
          });

          let attended = 0;
          let possible = 0;

          for (const s of relevant) {
            const mark = s.marks[st.id];
            if (mark === "EXCUSED") continue;
            possible += 1;
            if (mark === "PRESENT" || mark === "LATE") attended += 1;
          }

          const pct =
            possible === 0 ? 0 : (attended / possible) * 100;

          return (
            <div
              key={st.id}
              onClick={() => router.push(`/students/${st.id}`)}
              className="rounded-2xl bg-neutral-900 ring-1 ring-neutral-800 p-4 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition"
            >
              <CircularPercent value={pct} />
              <div>
                <p className="font-semibold">{st.name}</p>
                <p className="text-xs text-neutral-400">
                  {Math.round(pct)}% attendance
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* PAST REGISTERS */}
      <h2 className="text-lg font-semibold mt-8 mb-3">
        Past registers
      </h2>

      <div className="space-y-2">
        {sessions
          .slice()
          .sort(
            (a, b) =>
              +new Date(b.startedAtISO) -
              +new Date(a.startedAtISO)
          )
          .map((s, idx) => (
            <div
              key={s.id}
              onClick={() =>
                router.push(
                  `/register/${classId}?session=${s.id}`
                )
              }
              className="rounded-xl bg-neutral-900 ring-1 ring-neutral-800 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-neutral-800/60 transition"
            >
              <div>
                <p className="text-sm text-neutral-300">
                  {new Date(s.startedAtISO).toLocaleString()}
                </p>
                <p className="text-xs text-neutral-500">
                  Register #{sessions.length - idx}
                </p>
              </div>

              <span className="text-neutral-400">→</span>
            </div>
          ))}
      </div>
    </main>
  );
}
