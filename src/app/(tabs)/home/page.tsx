"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Class = {
  id: string;
  name: string;
  color?: string;
};

type Student = {
  id: string;
  archived?: boolean;
};

type AttendanceMark = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";

type Session = {
  id: string;
  classId: string;
  startedAtISO: string;
  closedAtISO?: string;
  marks: Record<string, AttendanceMark>;
};

export default function HomePage() {
  const router = useRouter();

  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  // Read data (read-only on load)
  useEffect(() => {
    setClasses(JSON.parse(localStorage.getItem("bb_classes") || "[]"));
    setStudents(JSON.parse(localStorage.getItem("bb_students") || "[]"));
    setSessions(JSON.parse(localStorage.getItem("bb_sessions") || "[]"));
  }, []);

  // Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour <= 11) return "Good morning";
    if (hour >= 12 && hour <= 16) return "Good afternoon";
    return "Good evening";
  }, []);

  // Date
  const today = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }, []);

  // Helpers
  const getOpenSessionForClass = (classId: string) =>
    sessions.find(
      (s) => s.classId === classId && s.closedAtISO === undefined
    );

  // Stats
  const stats = useMemo(() => {
    let attended = 0;
    let total = 0;

    sessions.forEach((session) => {
      Object.values(session.marks).forEach((mark) => {
        if (mark === "EXCUSED") return;
        total++;
        if (mark === "PRESENT" || mark === "LATE") attended++;
      });
    });

    return {
      averageAttendance:
        total === 0 ? 0 : Math.round((attended / total) * 100),
      activeStudents: students.filter((s) => s.archived !== true).length,
      totalRegisters: sessions.length,
    };
  }, [sessions, students]);

  // Class tap
  const handleClassTap = (cls: Class) => {
    const openSession = getOpenSessionForClass(cls.id);

    if (openSession) {
      router.push(`/register/${cls.id}?session=${openSession.id}`);
      return;
    }

    const newSession: Session = {
      id: crypto.randomUUID(),
      classId: cls.id,
      startedAtISO: new Date().toISOString(),
      marks: {},
    };

    localStorage.setItem(
      "bb_sessions",
      JSON.stringify([...sessions, newSession])
    );

    router.push(`/register/${cls.id}`);
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 pt-6 pb-10 space-y-8">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          {greeting}
        </h1>
        <p className="text-sm text-neutral-400">{today}</p>
      </header>

      {/* Classes */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">
          Classes
        </h2>

        <div className="space-y-3">
          {classes.map((cls) => {
            const openSession = getOpenSessionForClass(cls.id);

            return (
              <div
                key={cls.id}
                onClick={() => handleClassTap(cls)}
                className="
                  group relative overflow-hidden
                  rounded-2xl bg-neutral-900
                  px-4 py-5
                  shadow-sm
                  active:scale-[0.98]
                  transition
                "
              >
                {/* Accent strip */}
                <div
                  className="absolute left-0 top-0 h-full w-1.5"
                  style={{ backgroundColor: cls.color || "#404040" }}
                />

                <div className="flex justify-between items-center pl-3">
                  <div>
                    <h3 className="text-lg font-medium">
                      {cls.name}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {openSession
                        ? "Register open"
                        : "No active register"}
                    </p>
                  </div>

                  <span className="text-neutral-500 group-active:translate-x-1 transition">
                    →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Overview */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">
          Overview
        </h2>

        <div className="rounded-2xl bg-neutral-900 divide-y divide-neutral-800">
          <StatRow
            label="Average attendance"
            value={`${stats.averageAttendance}%`}
          />
          <StatRow
            label="Active students"
            value={stats.activeStudents}
          />
          <StatRow
            label="Registers taken"
            value={stats.totalRegisters}
          />
        </div>
      </section>

      {/* Awards navigation */}
      <section>
        <button
          onClick={() => router.push("/awards")}
          className="
            w-full rounded-2xl bg-neutral-900
            border border-neutral-800
            px-4 py-4
            flex items-center justify-between
            text-left
            active:scale-[0.98]
            transition
          "
        >
          <div>
            <p className="text-base font-medium text-neutral-100">
              Awards
            </p>
            <p className="text-sm text-neutral-400">
              View achievements
            </p>
          </div>

          <span className="text-neutral-500">→</span>
        </button>
      </section>
    </main>
  );
}

function StatRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex justify-between items-center px-4 py-3 text-sm">
      <span className="text-neutral-400">{label}</span>
      <span className="font-medium text-neutral-200">{value}</span>
    </div>
  );
}
