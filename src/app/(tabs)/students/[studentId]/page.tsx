"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { loadAwards } from "../../../../lib/awards/awards.storage";
import { useSyncData } from "@/lib/sync-manager";

// Loading Screen Component
function LoadingScreen({ message = "Loading..." }: { message?: string }) {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
      <div className="text-center space-y-6">
        {/* Animated icon */}
        <div className="relative">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center shadow-xl">
            <span className="text-2xl animate-bounce">👤</span>
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

type DanceClass = {
  id: string;
  name: string;
  color: string;
  deleted?: boolean;
};

type Student = {
  id: string;
  name: string;
  classId: string;
  joinedAtISO: string;
  archived?: boolean;
  deleted?: boolean;
};

type Status = "ABSENT" | "PRESENT" | "LATE" | "EXCUSED";

type RegisterSession = {
  id: string;
  classId: string;
  startedAtISO: string;
  marks: Record<string, Status>;
  deleted?: boolean;
};

type PointEvent = {
  id: string;
  studentId: string;
  classId: string;
  reason: string;
  points: number;
  createdAtISO: string;
  sessionId?: string;
  deleted?: boolean;
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

  if (total === 0) {
    return (
      <div className="h-36 w-36 rounded-full flex items-center justify-center text-sm text-neutral-400 ring-1 ring-neutral-700">
        No points
      </div>
    );
  }

  let startAngle = 0;
  const colors = ["#22c55e", "#eab308", "#ef4444", "#38bdf8", "#a855f7"];

  return (
    <svg viewBox="0 0 32 32" className="h-36 w-36">
      {entries.map(([label, value], i) => {
        const angle = (value / total) * 360;
        const largeArc = angle > 180 ? 1 : 0;

        const start = polarToCartesian(16, 16, 14, startAngle);
        const end = polarToCartesian(16, 16, 14, startAngle + angle);

        startAngle += angle;

        return (
          <path
            key={label}
            d={`M 16 16 L ${start.x} ${start.y} A 14 14 0 ${largeArc} 1 ${end.x} ${end.y} Z`}
            fill={colors[i % colors.length]}
            stroke="#0f0f0f"
            strokeWidth="0.6"
          />
        );
      })}
    </svg>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function StudentProfilePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const router = useRouter();
  const { getClasses, getStudents, getSessions, getPoints } = useSyncData();

  const [student, setStudent] = useState<Student | null>(null);
  const [classes, setClasses] = useState<DanceClass[]>([]);
  const [sessions, setSessions] = useState<RegisterSession[]>([]);
  const [points, setPoints] = useState<PointEvent[]>([]);
  const [awards, setAwards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [classesData, studentsData, sessionsData, pointsData] = await Promise.all([
          getClasses(),
          getStudents(),
          getSessions(),
          getPoints(),
        ]);

        setClasses(classesData.filter(c => !c.deleted));
        setStudent(studentsData.find((s) => s.id === studentId && !s.deleted) || null);
        setSessions(sessionsData.filter(s => !s.deleted));
        setPoints(pointsData.filter(p => !p.deleted));

        const allAwards = loadAwards();
        setAwards(allAwards.filter((a) => a.studentId === studentId));
      } catch (error) {
        console.error('Error loading student data:', error);
        // Fallback to localStorage
        setClasses(JSON.parse(localStorage.getItem(LS_CLASSES) || "[]").filter(c => !c.deleted));

        const allStudents: Student[] = JSON.parse(localStorage.getItem(LS_STUDENTS) || "[]");
        setStudent(allStudents.find((s) => s.id === studentId && !s.deleted) || null);

        setSessions(JSON.parse(localStorage.getItem(LS_SESSIONS) || "[]").filter(s => !s.deleted));
        setPoints(JSON.parse(localStorage.getItem(LS_POINTS) || "[]").filter(p => !p.deleted));

        const allAwards = loadAwards();
        setAwards(allAwards.filter((a) => a.studentId === studentId));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [studentId, getClasses, getStudents, getSessions, getPoints]);

  const cls = useMemo(
    () => classes.find((c) => c.id === student?.classId),
    [classes, student]
  );

  const badgeAwards = useMemo(
    () => awards.filter((a) => a.awardId.includes("month")),
    [awards]
  );

  const majorAwards = useMemo(
    () => awards.filter((a) => !a.awardId.includes("month")),
    [awards]
  );

  const stats = useMemo(() => {
    if (!student) return null;

    const joinedAt = new Date(student.joinedAtISO);
    const relevant = sessions.filter(
      (s) =>
        s.classId === student.classId &&
        (new Date(s.startedAtISO) >= joinedAt ||
          s.marks[student.id] !== undefined)
    );

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
    const byReason: Record<string, number> = {};
    let total = 0;

    for (const p of mine) {
      total += p.points;
      byReason[p.reason] = (byReason[p.reason] ?? 0) + p.points;
    }

    return { total, byReason };
  }, [points, student]);

  if (!student || !cls || !stats) {
    return <LoadingScreen message="Loading student details..." />;
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 pb-24">
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-neutral-300 text-xl">
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

      {/* STATS */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Attendance Stats */}
        <div className="rounded-2xl bg-neutral-900 ring-1 ring-neutral-800 p-5 flex items-center gap-4">
          <CircularPercent value={stats.percent} />
          <div>
            <p className="text-sm text-neutral-400">Attendance</p>
            <p className="text-lg font-semibold">
              {stats.attended} / {stats.possible}
            </p>
          </div>
        </div>

        {/* Points Stats */}
        <div className="rounded-2xl bg-neutral-900 ring-1 ring-neutral-800 p-5 flex items-center gap-4">
          <div className="flex-shrink-0">
            {pointStats ? (
              <PieChart data={pointStats.byReason} />
            ) : (
              <div className="h-16 w-16 rounded-full flex items-center justify-center text-sm text-neutral-400">
                Loading...
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-neutral-400">Points</p>
            <p className="text-lg font-semibold">
              {pointStats?.total || 0} pts
            </p>
          </div>
        </div>
      </div>

      {/* MAJOR AWARDS */}
      {majorAwards.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-3">Awards</h2>
          <div className="space-y-2 mb-6">
            {majorAwards.map((a) => (
              <div
                key={a.id}
                className="rounded-xl bg-neutral-900 ring-1 ring-neutral-800 px-4 py-3"
              >
                <p className="font-semibold">
                  {a.awardId.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-neutral-400">
                  Earned {new Date(a.unlockedAtISO).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* BADGES */}
      {badgeAwards.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-neutral-400 mb-2">
            Badges
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2 mb-6">
            {badgeAwards.map((a) => (
              <div
                key={a.id}
                className="shrink-0 w-44 rounded-xl bg-neutral-900 ring-1 ring-neutral-800 px-3 py-3"
              >
                <p className="text-sm font-semibold">
                  {a.awardId.replace(/_/g, " ").replace(" month", "")}
                </p>
                <p className="text-xs text-neutral-400">{a.periodKey}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* HISTORY */}
      <h2 className="text-lg font-semibold mb-3">Attendance history</h2>

      <div className="space-y-2">
        {stats.history.map((s) => {
          const mark = s.marks[student.id];
          return (
            <div
              key={s.id}
              className="rounded-xl bg-neutral-900 ring-1 ring-neutral-800 px-4 py-3 flex justify-between"
            >
              <div>
                <p className="text-sm">
                  {new Date(s.startedAtISO).toLocaleString()}
                </p>
                <p className={`text-xs font-semibold ${statusColor(mark)}`}>
                  {mark}
                </p>
              </div>
              <span className={`font-bold ${statusColor(mark)}`}>
                {STATUS_LABEL[mark]}
              </span>
            </div>
          );
        })}
      </div>
    </main>
  );
}
