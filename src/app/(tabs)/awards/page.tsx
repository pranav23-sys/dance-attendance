"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ClassRec = { id: string; name?: string; archived?: boolean };
type Student = {
  id: string;
  name: string;
  classId: string;
  joinedAtISO: string;
  archived?: boolean;
};

type Mark = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";

type RegisterSession = {
  id: string;
  classId: string;
  startedAtISO: string;
  marks: Record<string, Mark>;
};

type PointEvent = {
  id: string;
  studentId: string;
  classId: string;
  points: number;
  createdAtISO: string;
};

type AwardId = "student_of_month" | "most_improved_year" | "student_of_year";

type AwardUnlock = {
  id: string;
  awardId: AwardId;
  studentId: string;
  classId: string;
  periodType: "RANGE" | "ACADEMIC_YEAR";
  periodKey: string;
  unlockedAtISO: string;
  decidedBy: "TEACHER";
};

type AwardsMeta = {
  sotm?: {
    [classId: string]: {
      lastRequestedAtISO?: string;
      lastWinnerStudentId?: string;
    };
  };
};

function safeParseJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isoNow() {
  return new Date().toISOString();
}

function makeId(prefix = "id") {
  // Simple unique-enough ID without external libs
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function toISODateInputValue(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateInputToRange(dateStr: string, endOfDay: boolean) {
  // dateStr is YYYY-MM-DD
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return dt;
}

function inRangeInclusive(t: Date, from: Date, to: Date) {
  return t.getTime() >= from.getTime() && t.getTime() <= to.getTime();
}

function formatPrettyDateTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrettyDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function linearRegressionSlope(xs: number[], ys: number[]) {
  // Returns slope (m) for y = m x + b
  const n = xs.length;
  if (n < 2) return 0;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i]!;
    const y = ys[i]!;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function getAcademicYearBounds(now: Date) {
  // Academic year Sep 1 -> Jul 31
  // If now is Aug, treat as upcoming year starting Sep 1 of current year? (Aug belongs to the "gap")
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based
  // Sep (8) to Dec (11): year starts current year
  // Jan (0) to Jul (6): year started previous year
  // Aug (7): treat as previous year's academic year ending Jul 31 just passed (still sensible for "most recent year")
  const startYear = m >= 8 ? y : y - 1;
  const start = new Date(startYear, 8, 1, 0, 0, 0, 0); // Sep 1
  const end = new Date(startYear + 1, 6, 31, 23, 59, 59, 999); // Jul 31
  const key = `${startYear}-${startYear + 1}`;
  return { start, end, key };
}

function markToAttended(mark: Mark) {
  return mark === "PRESENT" || mark === "LATE";
}

function isExcused(mark: Mark) {
  return mark === "EXCUSED";
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

function pct(n01: number) {
  return `${round1(n01 * 100)}%`;
}

export default function AwardsPage() {
  const router = useRouter();

  const [classes, setClasses] = useState<ClassRec[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<RegisterSession[]>([]);
  const [points, setPoints] = useState<PointEvent[]>([]);
  const [awards, setAwards] = useState<AwardUnlock[]>([]);
  const [awardsMeta, setAwardsMeta] = useState<AwardsMeta>({});

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toISODateInputValue(d);
  });
  const [toDate, setToDate] = useState<string>(() => toISODateInputValue(new Date()));

  const [sotmOverrideStudentId, setSotmOverrideStudentId] = useState<string>("");
  const [miOverrideStudentId, setMiOverrideStudentId] = useState<string>("");
  const [sotyOverrideStudentId, setSotyOverrideStudentId] = useState<string>("");

  const [toast, setToast] = useState<string>("");

  useEffect(() => {
    const t = window.setTimeout(() => setToast(""), toast ? 2200 : 0);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    // Load all localStorage keys
    const cls = safeParseJSON<ClassRec[]>(localStorage.getItem("bb_classes"), []);
    const stu = safeParseJSON<Student[]>(localStorage.getItem("bb_students"), []);
    const ses = safeParseJSON<RegisterSession[]>(localStorage.getItem("bb_sessions"), []);
    const pts = safeParseJSON<PointEvent[]>(localStorage.getItem("bb_points"), []);
    const aws = safeParseJSON<AwardUnlock[]>(localStorage.getItem("bb_awards"), []);
    const meta = safeParseJSON<AwardsMeta>(localStorage.getItem("bb_awards_meta"), {});

    setClasses(Array.isArray(cls) ? cls : []);
    setStudents(Array.isArray(stu) ? stu : []);
    setSessions(Array.isArray(ses) ? ses : []);
    setPoints(Array.isArray(pts) ? pts : []);
    setAwards(Array.isArray(aws) ? aws : []);
    setAwardsMeta(meta && typeof meta === "object" ? meta : {});

    // Default class selection
    const firstActive = (Array.isArray(cls) ? cls : []).find((c) => c && typeof c.id === "string");
    if (firstActive?.id) setSelectedClassId(firstActive.id);
  }, []);

  const selectedClass = useMemo(() => classes.find((c) => c.id === selectedClassId) ?? null, [classes, selectedClassId]);

  const fromDT = useMemo(() => parseDateInputToRange(fromDate, false), [fromDate]);
  const toDT = useMemo(() => parseDateInputToRange(toDate, true), [toDate]);

  const validDateRange = !!fromDT && !!toDT && fromDT.getTime() <= toDT.getTime();
  const validClass = !!selectedClassId;

  const classStudents = useMemo(() => {
    const list = students
      .filter((s) => s.classId === selectedClassId)
      .filter((s) => !s.archived);
    // stable sort by name for dropdowns
    return list.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [students, selectedClassId]);

  const classSessions = useMemo(() => sessions.filter((s) => s.classId === selectedClassId), [sessions, selectedClassId]);

  function computeAttendanceStatsForStudent(opts: {
    student: Student;
    rangeFrom: Date;
    rangeTo: Date;
    sessionsInClass: RegisterSession[];
  }) {
    const { student, rangeFrom, rangeTo, sessionsInClass } = opts;

    let counted = 0; // denominator (non-excused)
    let attended = 0;

    const joinedAt = new Date(student.joinedAtISO);
    const joinedAtValid = !Number.isNaN(joinedAt.getTime());

    for (const sess of sessionsInClass) {
      const dt = new Date(sess.startedAtISO);
      if (Number.isNaN(dt.getTime())) continue;
      if (!inRangeInclusive(dt, rangeFrom, rangeTo)) continue;

      const mark = sess.marks?.[student.id];

      // Only sessions after student joined, OR where they have a mark
      if (joinedAtValid) {
        const afterJoined = dt.getTime() >= joinedAt.getTime();
        const hasMark = typeof mark === "string";
        if (!afterJoined && !hasMark) continue;
      } else {
        // If joined date is bad, fall back to "must have mark"
        if (typeof mark !== "string") continue;
      }

      if (!mark) continue; // no mark => ignore
      if (isExcused(mark)) continue; // ignored

      counted += 1;
      if (markToAttended(mark)) attended += 1;
    }

    const pct01 = counted > 0 ? attended / counted : 0;
    return { attended, counted, pct01 };
  }

  function sumPointsForStudent(opts: { studentId: string; classId: string; rangeFrom: Date; rangeTo: Date }) {
    const { studentId, classId, rangeFrom, rangeTo } = opts;
    let total = 0;
    for (const p of points) {
      if (p.classId !== classId) continue;
      if (p.studentId !== studentId) continue;
      const dt = new Date(p.createdAtISO);
      if (Number.isNaN(dt.getTime())) continue;
      if (!inRangeInclusive(dt, rangeFrom, rangeTo)) continue;
      total += Number(p.points) || 0;
    }
    return total;
  }

  // 1) Attendance leaderboard
  const attendanceLeaderboard = useMemo(() => {
    if (!validClass || !validDateRange || !fromDT || !toDT) return [];

    const rows = classStudents.map((st) => {
      const a = computeAttendanceStatsForStudent({
        student: st,
        rangeFrom: fromDT,
        rangeTo: toDT,
        sessionsInClass: classSessions,
      });
      return {
        student: st,
        pct01: a.pct01,
        attended: a.attended,
        counted: a.counted,
      };
    });

    rows.sort((r1, r2) => {
      if (r2.pct01 !== r1.pct01) return r2.pct01 - r1.pct01;
      if (r2.counted !== r1.counted) return r2.counted - r1.counted;
      return r1.student.name.localeCompare(r2.student.name);
    });

    return rows;
  }, [validClass, validDateRange, fromDT, toDT, classStudents, classSessions]);

  // 2) Student of the Month
  const sotmInfo = useMemo(() => {
    if (!validClass || !validDateRange || !fromDT || !toDT) {
      return {
        effectiveFrom: null as Date | null,
        effectiveTo: null as Date | null,
        lastRequestedAtISO: undefined as string | undefined,
        lastWinnerStudentId: undefined as string | undefined,
        top3: [] as Array<{
          student: Student;
          score: number;
          attendancePct01: number;
          pointsTotal: number;
        }>,
      };
    }

    const metaForClass = awardsMeta?.sotm?.[selectedClassId] ?? {};
    const lastRequestedAtISO = metaForClass?.lastRequestedAtISO;
    const lastWinnerStudentId = metaForClass?.lastWinnerStudentId;

    const effectiveFrom = lastRequestedAtISO ? new Date(lastRequestedAtISO) : fromDT;
    const effectiveTo = toDT;

    const rangeFrom = effectiveFrom;
    const rangeTo = effectiveTo;

    // Attendance + points
    const baseRows = classStudents.map((st) => {
      const att = computeAttendanceStatsForStudent({
        student: st,
        rangeFrom,
        rangeTo,
        sessionsInClass: classSessions,
      });

      const ptsTotal = sumPointsForStudent({ studentId: st.id, classId: selectedClassId, rangeFrom, rangeTo });

      return {
        student: st,
        attendancePct01: att.pct01,
        pointsTotal: ptsTotal,
      };
    });

    const maxPts = Math.max(0, ...baseRows.map((r) => r.pointsTotal));
    const rows = baseRows.map((r) => {
      const ptsNorm = maxPts > 0 ? r.pointsTotal / maxPts : 0;
      const score = 0.7 * r.attendancePct01 + 0.3 * ptsNorm;
      return { ...r, score };
    });

    rows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.attendancePct01 !== a.attendancePct01) return b.attendancePct01 - a.attendancePct01;
      if (b.pointsTotal !== a.pointsTotal) return b.pointsTotal - a.pointsTotal;
      return a.student.name.localeCompare(b.student.name);
    });

    // Try to avoid repeating last winner (soft rule)
    if (lastWinnerStudentId && rows.length > 1) {
      const i = rows.findIndex((r) => r.student.id === lastWinnerStudentId);
      if (i === 0) {
        // If the last winner is currently top, demote them slightly behind the next best
        // (without totally hiding them)
        const first = rows[0];
        const second = rows[1];
        rows[0] = second;
        rows[1] = first;
      }
    }

    const top3 = rows.slice(0, 3);

    return {
      effectiveFrom,
      effectiveTo,
      lastRequestedAtISO,
      lastWinnerStudentId,
      top3,
    };
  }, [validClass, validDateRange, fromDT, toDT, awardsMeta, selectedClassId, classStudents, classSessions, points]);

  // 3) Most Improved (academic year) using linear regression slope on attendance over time
  const mostImprovedInfo = useMemo(() => {
    if (!validClass) {
      return { yearKey: "", start: null as Date | null, end: null as Date | null, top3: [] as Array<any> };
    }
    const now = new Date();
    const { start, end, key } = getAcademicYearBounds(now);

    const rows: Array<{
      student: Student;
      slopePerDay: number;
      sessionsUsed: number;
      firstDateISO?: string;
      lastDateISO?: string;
    }> = [];

    for (const st of classStudents) {
      // Collect per-session attendance (excluding excused), over time
      const sessRows: Array<{ tDays: number; y: number; iso: string }> = [];
      for (const sess of classSessions) {
        const dt = new Date(sess.startedAtISO);
        if (Number.isNaN(dt.getTime())) continue;
        if (!inRangeInclusive(dt, start, end)) continue;

        const mark = sess.marks?.[st.id];
        if (!mark) continue;

        if (isExcused(mark)) continue;
        const y = markToAttended(mark) ? 1 : 0;
        const tDays = (dt.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        sessRows.push({ tDays, y, iso: sess.startedAtISO });
      }

      if (sessRows.length < 4) continue;

      sessRows.sort((a, b) => a.tDays - b.tDays);
      const xs = sessRows.map((r) => r.tDays);
      const ys = sessRows.map((r) => r.y);

      const slope = linearRegressionSlope(xs, ys); // per day
      rows.push({
        student: st,
        slopePerDay: slope,
        sessionsUsed: sessRows.length,
        firstDateISO: sessRows[0]?.iso,
        lastDateISO: sessRows[sessRows.length - 1]?.iso,
      });
    }

    rows.sort((a, b) => {
      if (b.slopePerDay !== a.slopePerDay) return b.slopePerDay - a.slopePerDay;
      if (b.sessionsUsed !== a.sessionsUsed) return b.sessionsUsed - a.sessionsUsed;
      return a.student.name.localeCompare(b.student.name);
    });

    return { yearKey: key, start, end, top3: rows.slice(0, 3), allCount: rows.length };
  }, [validClass, selectedClassId, classStudents, classSessions]);

  // 4) Student of the Year (academic year)
  const studentOfYearInfo = useMemo(() => {
    if (!validClass) {
      return { yearKey: "", start: null as Date | null, end: null as Date | null, top3: [] as Array<any> };
    }
    const now = new Date();
    const { start, end, key } = getAcademicYearBounds(now);

    const baseRows = classStudents.map((st) => {
      const att = computeAttendanceStatsForStudent({
        student: st,
        rangeFrom: start,
        rangeTo: end,
        sessionsInClass: classSessions,
      });

      const ptsTotal = sumPointsForStudent({ studentId: st.id, classId: selectedClassId, rangeFrom: start, rangeTo: end });

      return {
        student: st,
        attendancePct01: att.pct01,
        pointsTotal: ptsTotal,
      };
    });

    const maxPts = Math.max(0, ...baseRows.map((r) => r.pointsTotal));
    const rows = baseRows.map((r) => {
      const ptsNorm = maxPts > 0 ? r.pointsTotal / maxPts : 0;
      const score = 0.6 * r.attendancePct01 + 0.4 * ptsNorm;
      return { ...r, score };
    });

    rows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.attendancePct01 !== a.attendancePct01) return b.attendancePct01 - a.attendancePct01;
      if (b.pointsTotal !== a.pointsTotal) return b.pointsTotal - a.pointsTotal;
      return a.student.name.localeCompare(b.student.name);
    });

    return { yearKey: key, start, end, top3: rows.slice(0, 3) };
  }, [validClass, selectedClassId, classStudents, classSessions, points]);

  function writeAwards(next: AwardUnlock[]) {
    setAwards(next);
    localStorage.setItem("bb_awards", JSON.stringify(next));
  }

  function writeAwardsMeta(next: AwardsMeta) {
    setAwardsMeta(next);
    localStorage.setItem("bb_awards_meta", JSON.stringify(next));
  }

  function awardSOTM(studentId: string) {
    if (!validClass || !validDateRange || !fromDT || !toDT) return;

    const effectiveFrom = sotmInfo.effectiveFrom ?? fromDT;
    const effectiveTo = sotmInfo.effectiveTo ?? toDT;
    const periodKey = `${effectiveFrom.toISOString()}|${effectiveTo.toISOString()}`;

    const newAward: AwardUnlock = {
      id: makeId("award"),
      awardId: "student_of_month",
      studentId,
      classId: selectedClassId,
      periodType: "RANGE",
      periodKey,
      unlockedAtISO: isoNow(),
      decidedBy: "TEACHER",
    };

    const nextAwards = [newAward, ...awards];
    writeAwards(nextAwards);

    const nextMeta: AwardsMeta = {
      ...(awardsMeta ?? {}),
      sotm: {
        ...(awardsMeta?.sotm ?? {}),
        [selectedClassId]: {
          lastRequestedAtISO: isoNow(),
          lastWinnerStudentId: studentId,
        },
      },
    };
    writeAwardsMeta(nextMeta);

    const name = students.find((s) => s.id === studentId)?.name ?? "Student";
    setToast(`Awarded Student of the Month to ${name}`);
  }

  function awardMostImproved(studentId: string) {
    if (!validClass) return;
    const now = new Date();
    const { key } = getAcademicYearBounds(now);

    const newAward: AwardUnlock = {
      id: makeId("award"),
      awardId: "most_improved_year",
      studentId,
      classId: selectedClassId,
      periodType: "ACADEMIC_YEAR",
      periodKey: key,
      unlockedAtISO: isoNow(),
      decidedBy: "TEACHER",
    };

    writeAwards([newAward, ...awards]);
    const name = students.find((s) => s.id === studentId)?.name ?? "Student";
    setToast(`Awarded Most Improved to ${name}`);
  }

  function awardStudentOfYear(studentId: string) {
    if (!validClass) return;
    const now = new Date();
    const { key } = getAcademicYearBounds(now);

    const newAward: AwardUnlock = {
      id: makeId("award"),
      awardId: "student_of_year",
      studentId,
      classId: selectedClassId,
      periodType: "ACADEMIC_YEAR",
      periodKey: key,
      unlockedAtISO: isoNow(),
      decidedBy: "TEACHER",
    };

    writeAwards([newAward, ...awards]);
    const name = students.find((s) => s.id === studentId)?.name ?? "Student";
    setToast(`Awarded Student of the Year to ${name}`);
  }

  const sotmTopSuggestion = sotmInfo.top3[0]?.student?.id ?? "";
  const miTopSuggestion = mostImprovedInfo.top3[0]?.student?.id ?? "";
  const sotyTopSuggestion = studentOfYearInfo.top3[0]?.student?.id ?? "";

  const sotmAwardEnabled = validClass && validDateRange && !!(sotmOverrideStudentId || sotmTopSuggestion);
  const miAwardEnabled = validClass && !!(miOverrideStudentId || miTopSuggestion);
  const sotyAwardEnabled = validClass && !!(sotyOverrideStudentId || sotyTopSuggestion);

  const lastWinnerName = useMemo(() => {
    const id = sotmInfo.lastWinnerStudentId;
    if (!id) return "—";
    return students.find((s) => s.id === id)?.name ?? "—";
  }, [sotmInfo.lastWinnerStudentId, students]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto w-full max-w-md px-4 pb-24 pt-4">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="shrink-0 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-100 shadow-sm ring-1 ring-zinc-800 active:scale-[0.99]"
          >
            ← Back
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">Awards</h1>
            <p className="text-sm text-zinc-400">Attendance + points tools (local only).</p>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-zinc-800">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-200">Class</label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSotmOverrideStudentId("");
                  setMiOverrideStudentId("");
                  setSotyOverrideStudentId("");
                }}
                className="w-full rounded-xl bg-zinc-950 px-4 py-3 text-base ring-1 ring-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-600"
              >
                {classes.length === 0 && <option value="">No classes found</option>}
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name?.trim() ? c.name : c.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-zinc-200">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 px-4 py-3 text-base ring-1 ring-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-600"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-zinc-200">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 px-4 py-3 text-base ring-1 ring-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-600"
                />
              </div>
            </div>

            {!validDateRange && (
              <div className="rounded-xl bg-zinc-950 px-4 py-3 text-sm text-amber-200 ring-1 ring-amber-900/40">
                Date range invalid. Make sure “From” is not after “To”.
              </div>
            )}
          </div>
        </div>

        {/* 1) Attendance leaderboard */}
        <section className="mb-6 rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-zinc-800">
          <h2 className="text-lg font-bold">Attendance leaderboard</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Ranked by attendance % (PRESENT + LATE attended, EXCUSED ignored).
          </p>

          <div className="mt-4 space-y-2">
            {!validClass || !validDateRange ? (
              <div className="rounded-xl bg-zinc-950 px-4 py-3 text-sm text-zinc-400 ring-1 ring-zinc-800">Select a class and valid range.</div>
            ) : attendanceLeaderboard.length === 0 ? (
              <div className="rounded-xl bg-zinc-950 px-4 py-3 text-sm text-zinc-400 ring-1 ring-zinc-800">No students found in this class.</div>
            ) : (
              attendanceLeaderboard.map((r, idx) => (
                <div key={r.student.id} className="flex items-center justify-between gap-3 rounded-xl bg-zinc-950 px-4 py-3 ring-1 ring-zinc-800">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-extrabold text-zinc-200">#{idx + 1}</span>
                      <span className="truncate text-base font-semibold">{r.student.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {r.counted > 0 ? (
                        <>
                          {r.attended}/{r.counted} sessions counted
                        </>
                      ) : (
                        <>No counted sessions in range</>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-base font-bold">{pct(r.pct01)}</div>
                    <div className="text-xs text-zinc-400">attendance</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 2) Student of the Month */}
        <section className="mb-6 rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-zinc-800">
          <h2 className="text-lg font-bold">Student of the Month</h2>
          <p className="mt-1 text-sm text-zinc-400">Score = 70% attendance + 30% points, per class.</p>

          <div className="mt-4 rounded-xl bg-zinc-950 px-4 py-3 text-sm ring-1 ring-zinc-800">
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-400">Last winner</span>
              <span className="font-semibold text-zinc-200">{lastWinnerName}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-zinc-400">Last requested</span>
              <span className="font-semibold text-zinc-200">{formatPrettyDateTime(sotmInfo.lastRequestedAtISO)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-zinc-400">Period</span>
              <span className="font-semibold text-zinc-200">
                {sotmInfo.effectiveFrom ? formatPrettyDate(sotmInfo.effectiveFrom.toISOString()) : "—"} →{" "}
                {sotmInfo.effectiveTo ? formatPrettyDate(sotmInfo.effectiveTo.toISOString()) : "—"}
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {!validClass || !validDateRange ? (
              <div className="rounded-xl bg-zinc-950 px-4 py-3 text-sm text-zinc-400 ring-1 ring-zinc-800">Select a class and valid range.</div>
            ) : sotmInfo.top3.length === 0 ? (
              <div className="rounded-xl bg-zinc-950 px-4 py-3 text-sm text-zinc-400 ring-1 ring-zinc-800">
                No suggestions yet (needs attendance marks/points in the period).
              </div>
            ) : (
              sotmInfo.top3.map((r, idx) => (
                <div key={r.student.id} className="flex items-center justify-between gap-3 rounded-xl bg-zinc-950 px-4 py-3 ring-1 ring-zinc-800">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-extrabold text-zinc-200">#{idx + 1}</span>
                      <span className="truncate text-base font-semibold">{r.student.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      Attendance {pct(r.attendancePct01)} • Points {r.pointsTotal}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-base font-bold">{round3(r.score)}</div>
                    <div className="text-xs text-zinc-400">score</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 space-y-3">
            <button
              type="button"
              disabled={!sotmAwardEnabled}
              onClick={() => awardSOTM(sotmOverrideStudentId || sotmTopSuggestion)}
              className={[
                "w-full rounded-xl px-4 py-4 text-base font-bold shadow-sm ring-1 active:scale-[0.99]",
                sotmAwardEnabled
                  ? "bg-emerald-600 text-zinc-950 ring-emerald-500/40"
                  : "bg-zinc-800 text-zinc-400 ring-zinc-700 cursor-not-allowed",
              ].join(" ")}
            >
              Award top suggestion
            </button>

            <div className="rounded-2xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
              <label className="mb-2 block text-sm font-semibold text-zinc-200">Override (pick any student)</label>
              <select
                value={sotmOverrideStudentId}
                onChange={(e) => setSotmOverrideStudentId(e.target.value)}
                className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-base ring-1 ring-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-600"
              >
                <option value="">— No override —</option>
                {classStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* 3) Most Improved */}
        <section className="mb-6 rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-zinc-800">
          <h2 className="text-lg font-bold">Most Improved</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Academic year {mostImprovedInfo.yearKey} (Sep 1 → Jul 31). Linear regression slope on per-session attendance (≥4 sessions).
          </p>

          <div className="mt-4 space-y-2">
            {!validClass ? (
              <div className="rounded-xl bg-zinc-950 px-4 py-3 text-sm text-zinc-400 ring-1 ring-zinc-800">Select a class.</div>
            ) : mostImprovedInfo.top3.length === 0 ? (
              <div className="rounded-xl bg-zinc-950 px-4 py-3 text-sm text-zinc-400 ring-1 ring-zinc-800">
                Not enough data yet. Need at least 4 non-excused marked sessions per student.
              </div>
            ) : (
              mostImprovedInfo.top3.map((r: any, idx: number) => (
                <div key={r.student.id} className="flex items-center justify-between gap-3 rounded-xl bg-zinc-950 px-4 py-3 ring-1 ring-zinc-800">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-extrabold text-zinc-200">#{idx + 1}</span>
                      <span className="truncate text-base font-semibold">{r.student.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      Sessions {r.sessionsUsed} • {formatPrettyDate(r.firstDateISO)} → {formatPrettyDate(r.lastDateISO)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-base font-bold">{round3(r.slopePerDay)}</div>
                    <div className="text-xs text-zinc-400">slope/day</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 space-y-3">
            <button
              type="button"
              disabled={!miAwardEnabled}
              onClick={() => awardMostImproved(miOverrideStudentId || miTopSuggestion)}
              className={[
                "w-full rounded-xl px-4 py-4 text-base font-bold shadow-sm ring-1 active:scale-[0.99]",
                miAwardEnabled ? "bg-emerald-600 text-zinc-950 ring-emerald-500/40" : "bg-zinc-800 text-zinc-400 ring-zinc-700 cursor-not-allowed",
              ].join(" ")}
            >
              Award top suggestion
            </button>

            <div className="rounded-2xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
              <label className="mb-2 block text-sm font-semibold text-zinc-200">Override (pick any student)</label>
              <select
                value={miOverrideStudentId}
                onChange={(e) => setMiOverrideStudentId(e.target.value)}
                className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-base ring-1 ring-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-600"
              >
                <option value="">— No override —</option>
                {classStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* 4) Student of the Year */}
        <section className="mb-6 rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-zinc-800">
          <h2 className="text-lg font-bold">Student of the Year</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Academic year {studentOfYearInfo.yearKey} (Sep 1 → Jul 31). Score = 60% attendance + 40% points.
          </p>

          <div className="mt-4 space-y-2">
            {!validClass ? (
              <div className="rounded-xl bg-zinc-950 px-4 py-3 text-sm text-zinc-400 ring-1 ring-zinc-800">Select a class.</div>
            ) : studentOfYearInfo.top3.length === 0 ? (
              <div className="rounded-xl bg-zinc-950 px-4 py-3 text-sm text-zinc-400 ring-1 ring-zinc-800">No suggestions yet (needs attendance marks/points this year).</div>
            ) : (
              studentOfYearInfo.top3.map((r: any, idx: number) => (
                <div key={r.student.id} className="flex items-center justify-between gap-3 rounded-xl bg-zinc-950 px-4 py-3 ring-1 ring-zinc-800">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-extrabold text-zinc-200">#{idx + 1}</span>
                      <span className="truncate text-base font-semibold">{r.student.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      Attendance {pct(r.attendancePct01)} • Points {r.pointsTotal}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-base font-bold">{round3(r.score)}</div>
                    <div className="text-xs text-zinc-400">score</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 space-y-3">
            <button
              type="button"
              disabled={!sotyAwardEnabled}
              onClick={() => awardStudentOfYear(sotyOverrideStudentId || sotyTopSuggestion)}
              className={[
                "w-full rounded-xl px-4 py-4 text-base font-bold shadow-sm ring-1 active:scale-[0.99]",
                sotyAwardEnabled
                  ? "bg-emerald-600 text-zinc-950 ring-emerald-500/40"
                  : "bg-zinc-800 text-zinc-400 ring-zinc-700 cursor-not-allowed",
              ].join(" ")}
            >
              Award top suggestion
            </button>

            <div className="rounded-2xl bg-zinc-950 p-3 ring-1 ring-zinc-800">
              <label className="mb-2 block text-sm font-semibold text-zinc-200">Override (pick any student)</label>
              <select
                value={sotyOverrideStudentId}
                onChange={(e) => setSotyOverrideStudentId(e.target.value)}
                className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-base ring-1 ring-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-600"
              >
                <option value="">— No override —</option>
                {classStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Footer hint */}
        <div className="rounded-2xl bg-zinc-900/60 p-4 text-sm text-zinc-400 ring-1 ring-zinc-800">
          <div className="font-semibold text-zinc-200">Notes</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>No auto-awarding. Buttons only write to localStorage.</li>
            <li>EXCUSED marks are ignored in attendance % and Most Improved.</li>
            <li>Attendance counts only sessions after join date (or sessions where a mark exists).</li>
          </ul>
        </div>
      </div>

      {/* Toast (no popups) */}
      {toast ? (
        <div className="fixed bottom-4 left-0 right-0 mx-auto w-full max-w-md px-4">
          <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-950 shadow-lg ring-1 ring-zinc-300">
            {toast}
          </div>
        </div>
      ) : null}
    </div>
  );
}
