// lib/awards/runMonthlyAwards.server.ts

import type { Student, RegisterSession, PointEvent, AwardUnlock } from "../sync-manager";
import { autoAward } from "./awards.evaluators";
import { awardExists } from "./awards.utils";

/**
 * Run automatic award calculations for the current month
 * This should be called at the end of each month or when registers are closed
 */
export function runMonthlyAwards(opts: {
  students: Student[];
  sessions: RegisterSession[];
  points: PointEvent[];
  existingAwards: AwardUnlock[];
}): AwardUnlock[] {
  const { students, sessions, points, existingAwards } = opts;
  const newAwards: AwardUnlock[] = [];

  // Get unique class IDs
  const classIds = [...new Set(students.map(s => s.classId))];

  // Current month range (last 30 days for Student of the Month)
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  for (const classId of classIds) {
    // Check Student of the Month
    const sotmAward = autoAward({
      awardType: "student_of_month",
      classId,
      students,
      sessions,
      points,
      rangeFrom: monthAgo,
      rangeTo: now,
      existingAwards: [...existingAwards, ...newAwards],
    });

    if (sotmAward && !awardExists([...existingAwards, ...newAwards], sotmAward.awardId, sotmAward.studentId, sotmAward.periodKey)) {
      newAwards.push(sotmAward);
    }

    // Check Most Improved (academic year)
    const miAward = autoAward({
      awardType: "most_improved_year",
      classId,
      students,
      sessions,
      points,
      existingAwards: [...existingAwards, ...newAwards],
    });

    if (miAward && !awardExists([...existingAwards, ...newAwards], miAward.awardId, miAward.studentId, miAward.periodKey)) {
      newAwards.push(miAward);
    }

    // Check Student of the Year (academic year)
    const sotyAward = autoAward({
      awardType: "student_of_year",
      classId,
      students,
      sessions,
      points,
      existingAwards: [...existingAwards, ...newAwards],
    });

    if (sotyAward && !awardExists([...existingAwards, ...newAwards], sotyAward.awardId, sotyAward.studentId, sotyAward.periodKey)) {
      newAwards.push(sotyAward);
    }
  }

  return newAwards;
}

/**
 * Run awards for a specific class when a register is closed
 */
export function runAwardsOnRegisterClose(opts: {
  classId: string;
  students: Student[];
  sessions: RegisterSession[];
  points: PointEvent[];
  existingAwards: AwardUnlock[];
}): AwardUnlock[] {
  const { classId, students, sessions, points, existingAwards } = opts;
  const newAwards: AwardUnlock[] = [];

  // Current month range
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Check if we should award Student of the Month
  const sotmAward = autoAward({
    awardType: "student_of_month",
    classId,
    students,
    sessions,
    points,
    rangeFrom: monthAgo,
    rangeTo: now,
    existingAwards,
  });

  if (sotmAward && !awardExists(existingAwards, sotmAward.awardId, sotmAward.studentId, sotmAward.periodKey)) {
    newAwards.push(sotmAward);
  }

  return newAwards;
}
