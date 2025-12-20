"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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

type PointEvent = {
  id: string;
  studentId: string;
  classId: string;
  reason: string;
  points: number;
  createdAtISO: string;
  sessionId?: string;
};

const LS_POINTS = "bb_points";


const LS_CLASSES = "bb_classes";
const LS_STUDENTS = "bb_students";
const LS_SESSIONS = "bb_sessions";

const STATUS_LABEL: Record<Status, string> = {
  PRESENT: "/",
  LATE: "L",
  ABSENT: "x",
  EXCUSED: "N/A",
};

function statusColor(s: Status) {
  switch (s) {
    case "PRESENT":
      return "text-emerald-400";
    case "LATE":
      return "text-amber-400";
    case "ABSENT":
      return "text-rose-400";
    case "EXCUSED":
      return "text-sky-400";
  }
}

function CircularPercent({ value }: { value: number }) {
  const radius = 22;
  const stroke = 4;
  const c = 2 * Math.PI * radius;
  const dash = (value / 100) * c;

  return (
    <div className="relative h-16 w-16">
      <svg viewBox="0 0 64 64" className="h-16 w-16">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={stroke}
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform="rotate(-90 32 32)"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-sm font-bold">
        {Math.round(value)}%
      </div>
    </div>
  );
}

function PieChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  // 🟡 Empty state
  if (total === 0) {
    return (
      <div className="h-36 w-36 rounded-full flex items-center justify-center text-sm text-neutral-400 ring-1 ring-neutral-700">
        No points
      </div>
    );
  }

  let startAngle = 0;
  const colors = [
    "#22c55e", // green
    "#eab308", // yellow
    "#ef4444", // red
    "#38bdf8", // blue
    "#a855f7", // purple
  ];

  return (
    <svg viewBox="0 0 32 32" className="h-36 w-36">
      {entries.map(([label, value], i) => {
        const angle = (value / total) * 360;
        const largeArc = angle > 180 ? 1 : 0;

        const start = polarToCartesian(16, 16, 14, startAngle);
        const end = polarToCartesian(16, 16, 14, startAngle + angle);

        const path = `
          M 16 16
          L ${start.x} ${start.y}
          A 14 14 0 ${largeArc} 1 ${end.x} ${end.y}
          Z
        `;

        startAngle += angle;

        return (
          <path
            key={label}
            d={path}
            fill={colors[i % colors.length]}
            stroke="#0f0f0f"        // ✅ visible separation
            strokeWidth="0.6"
          />
        );
      })}
    </svg>
  );
}


function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}


export default function StudentProfilePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [classes, setClasses] = useState<DanceClass[]>([]);
  const [sessions, setSessions] = useState<RegisterSession[]>([]);
  const [points, setPoints] = useState<PointEvent[]>([]);


  /* ---------- LOAD ---------- */
  useEffect(() => {
    setClasses(JSON.parse(localStorage.getItem(LS_CLASSES) || "[]"));

    const allStudents: Student[] = JSON.parse(
      localStorage.getItem(LS_STUDENTS) || "[]"
    );
    setStudent(allStudents.find((s) => s.id === studentId) || null);

    const allSessions: RegisterSession[] = JSON.parse(
      localStorage.getItem(LS_SESSIONS) || "[]"
    );
    setSessions(allSessions);
    const allPoints: PointEvent[] = JSON.parse(
  localStorage.getItem(LS_POINTS) || "[]"
);
setPoints(allPoints);

  }, [studentId]);

  const cls = useMemo(
    () => classes.find((c) => c.id === student?.classId),
    [classes, student]
  );

  /* ---------- STATS ---------- */
  const stats = useMemo(() => {
    if (!student) return null;

    const joinedAt = new Date(student.joinedAtISO);
    const relevant = sessions.filter((s) => {
  if (s.classId !== student.classId) return false;

  const sessionStart = new Date(s.startedAtISO);

  return (
    // session started after student joined
    sessionStart >= joinedAt ||

    // OR student has a mark (joined mid-register)
    s.marks[student.id] !== undefined
  );
});


    let attended = 0;
    let possible = 0;

    for (const s of relevant) {
      const mark = s.marks[student.id];
      if (mark === "EXCUSED") continue;

      possible += 1;
      if (mark === "PRESENT" || mark === "LATE") attended += 1;
    }

    return {
      attended,
      possible,
      percent: possible === 0 ? 0 : (attended / possible) * 100,
      history: relevant.sort(
        (a, b) =>
          +new Date(b.startedAtISO) - +new Date(a.startedAtISO)
      ),
    };
  }, [student, sessions]);

  const pointStats = useMemo(() => {
  if (!student) return null;

  const mine = points.filter((p) => p.studentId === student.id);

  let total = 0;
  const byReason: Record<string, number> = {};

  for (const p of mine) {
    total += p.points;
    byReason[p.reason] = (byReason[p.reason] ?? 0) + p.points;
  }

  return { total, byReason };
}, [points, student]);


  if (!student || !cls || !stats) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-neutral-400">Loading student…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 pb-24">
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="text-neutral-300 text-xl"
        >
          ←
        </button>

        <div>
          <h1 className="text-2xl font-semibold">{student.name}</h1>
          <p className="text-sm text-neutral-400">
            {cls.name} • Joined{" "}
            {new Date(student.joinedAtISO).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* STATS CARD */}
      <div className="rounded-2xl bg-neutral-900 ring-1 ring-neutral-800 p-5 mb-6 flex items-center gap-4">
        <CircularPercent value={stats.percent} />
        <div>
          <p className="text-sm text-neutral-400">Attendance</p>
          <p className="text-lg font-semibold">
            {stats.attended} / {stats.possible}
          </p>
        </div>
      </div>
      {pointStats && (
  <>
    <h2 className="text-lg font-semibold mb-3">Points</h2>

   <div className="rounded-2xl bg-neutral-900 ring-1 ring-neutral-800 p-5 flex gap-6 items-center justify-between">

      <PieChart data={pointStats.byReason} />

      <div className="space-y-2 text-sm">
        <p className="text-lg font-semibold">
          Total: {pointStats.total} pts
        </p>

        {Object.entries(pointStats.byReason).map(([reason, value]) => (
          <div key={reason} className="flex justify-between gap-4">
            <span className="text-neutral-300">{reason}</span>
            <span className="font-semibold">{value}</span>
          </div>
        ))}
      </div>
    </div>
  </>
)}


      {/* HISTORY */}
      <h2 className="text-lg font-semibold mb-3">Attendance history</h2>

      <div className="space-y-2">
        {stats.history.length === 0 ? (
          <p className="text-neutral-400 text-sm">
            No attendance records yet.
          </p>
        ) : (
          stats.history.map((s) => {
            const mark = s.marks[student.id];
            return (
              <div
                key={s.id}
                className="rounded-xl bg-neutral-900 ring-1 ring-neutral-800 px-4 py-3 flex items-center justify-between"
              >
                <div>
  <p className="text-sm text-neutral-300">
    {new Date(s.startedAtISO).toLocaleString()}
  </p>
  <p className={`text-xs font-semibold ${statusColor(mark)}`}>
    {mark === "PRESENT" && "Present"}
    {mark === "LATE" && "Late"}
    {mark === "ABSENT" && "Absent"}
    {mark === "EXCUSED" && "Excused"}
  </p>
</div>

<span className={`font-bold ${statusColor(mark)}`}>
  {STATUS_LABEL[mark]}
</span>

              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
