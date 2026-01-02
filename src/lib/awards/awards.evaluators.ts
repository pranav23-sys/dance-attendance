// lib/awards/awards.evaluators.ts

import type { Student, RegisterSession, PointEvent, AwardUnlock } from "../sync-manager";
import type { AwardCandidate, AwardPeriodType } from "./awards.types";


// Helper function to mark attendance as attended
function markToAttended(mark: string): boolean {
  return mark === "PRESENT" || mark === "LATE";
}

// Helper function to check if excused
function isExcused(mark: string): boolean {
  return mark === "EXCUSED";
}

// Helper function to get academic year bounds
function getAcademicYearBounds(now: Date) {
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based
  const startYear = m >= 8 ? y : y - 1;
  const start = new Date(startYear, 8, 1, 0, 0, 0, 0); // Sep 1
  const end = new Date(startYear + 1, 6, 31, 23, 59, 59, 999); // Jul 31
  const key = `${startYear}-${startYear + 1}`;
  return { start, end, key };
}

// Linear regression slope calculation for Most Improved
function linearRegressionSlope(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
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

// Calculate attendance percentage for a student
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
    if (dt.getTime() < rangeFrom.getTime() || dt.getTime() > rangeTo.getTime()) continue;

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

// Calculate total points for a student
function sumPointsForStudent(opts: {
  studentId: string;
  classId: string;
  rangeFrom: Date;
  rangeTo: Date;
  points: PointEvent[];
}): number {
  const { studentId, classId, rangeFrom, rangeTo, points } = opts;
  let total = 0;
  for (const p of points) {
    if (p.classId !== classId) continue;
    if (p.studentId !== studentId) continue;
    const dt = new Date(p.createdAtISO);
    if (Number.isNaN(dt.getTime())) continue;
    if (dt.getTime() < rangeFrom.getTime() || dt.getTime() > rangeTo.getTime()) continue;
    total += Number(p.points) || 0;
  }
  return total;
}

// Evaluate Student of the Month
export function evaluateStudentOfMonth(opts: {
  classId: string;
  students: Student[];
  sessions: RegisterSession[];
  points: PointEvent[];
  rangeFrom: Date;
  rangeTo: Date;
  existingAwards: AwardUnlock[];
}): AwardCandidate[] {
  const { classId, students, sessions, points, rangeFrom, rangeTo } = opts;

  const classStudents = students.filter(s => s.classId === classId && !s.archived && !s.deleted);
  const classSessions = sessions.filter(s => s.classId === classId);

  // Attendance + points
  const baseRows = classStudents.map((st) => {
    const att = computeAttendanceStatsForStudent({
      student: st,
      rangeFrom,
      rangeTo,
      sessionsInClass: classSessions,
    });

    const ptsTotal = sumPointsForStudent({
      studentId: st.id,
      classId,
      rangeFrom,
      rangeTo,
      points,
    });

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

  return rows;
}

// Evaluate Most Improved (Academic Year)
export function evaluateMostImproved(opts: {
  classId: string;
  students: Student[];
  sessions: RegisterSession[];
}): AwardCandidate[] {
  const { classId, students, sessions } = opts;
  const now = new Date();
  const { start, end } = getAcademicYearBounds(now);

  const classStudents = students.filter(s => s.classId === classId && !s.archived && !s.deleted);
  const classSessions = sessions.filter(s => s.classId === classId);

  const rows: AwardCandidate[] = [];

  for (const st of classStudents) {
    // Collect per-session attendance (excluding excused), over time
    const sessRows: Array<{ tDays: number; y: number; iso: string }> = [];
    for (const sess of classSessions) {
      const dt = new Date(sess.startedAtISO);
      if (Number.isNaN(dt.getTime())) continue;
      if (dt.getTime() < start.getTime() || dt.getTime() > end.getTime()) continue;

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
      score: slope, // Higher slope = more improved
      attendancePct01: 0, // Not used for this award
      pointsTotal: 0, // Not used for this award
      slopePerDay: slope,
      sessionsUsed: sessRows.length,
    });
  }

  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.sessionsUsed !== a.sessionsUsed) return b.sessionsUsed - a.sessionsUsed;
    return a.student.name.localeCompare(b.student.name);
  });

  return rows;
}

// Evaluate Student of the Year
export function evaluateStudentOfYear(opts: {
  classId: string;
  students: Student[];
  sessions: RegisterSession[];
  points: PointEvent[];
}): AwardCandidate[] {
  const { classId, students, sessions, points } = opts;
  const now = new Date();
  const { start, end } = getAcademicYearBounds(now);

  const classStudents = students.filter(s => s.classId === classId && !s.archived && !s.deleted);
  const classSessions = sessions.filter(s => s.classId === classId);

  const baseRows = classStudents.map((st) => {
    const att = computeAttendanceStatsForStudent({
      student: st,
      rangeFrom: start,
      rangeTo: end,
      sessionsInClass: classSessions,
    });

    const ptsTotal = sumPointsForStudent({
      studentId: st.id,
      classId,
      rangeFrom: start,
      rangeTo: end,
      points,
    });

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

  return rows;
}

// Auto-award function (called when register closes or manually)
export function autoAward(opts: {
  awardType: "student_of_month" | "most_improved_year" | "student_of_year";
  classId: string;
  students: Student[];
  sessions: RegisterSession[];
  points: PointEvent[];
  rangeFrom?: Date;
  rangeTo?: Date;
  existingAwards: AwardUnlock[];
}): AwardUnlock | null {
  const { awardType, classId, students, sessions, points, existingAwards } = opts;

  let candidates: AwardCandidate[] = [];

  switch (awardType) {
    case "student_of_month":
      if (!opts.rangeFrom || !opts.rangeTo) return null;
      candidates = evaluateStudentOfMonth({
        classId,
        students,
        sessions,
        points,
        rangeFrom: opts.rangeFrom,
        rangeTo: opts.rangeTo,
        existingAwards,
      });
      break;

    case "most_improved_year":
      candidates = evaluateMostImproved({
        classId,
        students,
        sessions,
      });
      break;

    case "student_of_year":
      candidates = evaluateStudentOfYear({
        classId,
        students,
        sessions,
        points,
      });
      break;

    default:
      return null;
  }

  if (candidates.length === 0) return null;

  const winner = candidates[0]!;
  const periodKey = awardType === "student_of_month"
    ? `${opts.rangeFrom!.getFullYear()}-${String(opts.rangeFrom!.getMonth() + 1).padStart(2, "0")}`
    : getAcademicYearBounds(new Date()).key;

  const periodType: AwardPeriodType = awardType === "student_of_month" ? "MONTH" : "YEAR";

  return {
    id: `auto_${awardType}_${classId}_${periodKey}_${Date.now()}`,
    awardId: awardType,
    studentId: winner.student.id,
    classId,
    periodType,
    periodKey,
    unlockedAtISO: new Date().toISOString(),
    decidedBy: "SYSTEM",
  };
}
