// lib/awards/awards.utils.ts

import type { AwardUnlock } from "./awards.types";

/**
 * Check if an award already exists for the given criteria
 */
export function awardExists(
  existingAwards: AwardUnlock[],
  awardId: string,
  studentId: string,
  periodKey: string
): boolean {
  return existingAwards.some(
    (award) =>
      award.awardId === awardId &&
      award.studentId === studentId &&
      award.periodKey === periodKey
  );
}

/**
 * Get all awards for a specific student
 */
export function getStudentAwards(
  awards: AwardUnlock[],
  studentId: string
): AwardUnlock[] {
  return awards.filter((award) => award.studentId === studentId);
}

/**
 * Get awards for a specific class
 */
export function getClassAwards(
  awards: AwardUnlock[],
  classId: string
): AwardUnlock[] {
  return awards.filter((award) => award.classId === classId);
}

/**
 * Get awards for a specific period
 */
export function getPeriodAwards(
  awards: AwardUnlock[],
  periodKey: string
): AwardUnlock[] {
  return awards.filter((award) => award.periodKey === periodKey);
}

/**
 * Format award period for display
 */
export function formatAwardPeriod(award: AwardUnlock): string {
  if (award.periodType === "MONTH") {
    // periodKey format: "2024-03"
    const [year, month] = award.periodKey.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString(undefined, { year: "numeric", month: "long" });
  } else if (award.periodType === "YEAR") {
    // periodKey format: "2023-2024"
    return `Academic Year ${award.periodKey}`;
  }
  return award.periodKey;
}

/**
 * Get the latest award for each type for a student
 */
export function getLatestAwardsByType(
  awards: AwardUnlock[],
  studentId: string
): Record<string, AwardUnlock> {
  const studentAwards = getStudentAwards(awards, studentId);
  const latestByType: Record<string, AwardUnlock> = {};

  studentAwards.forEach((award) => {
    if (
      !latestByType[award.awardId] ||
      new Date(award.unlockedAtISO) > new Date(latestByType[award.awardId]!.unlockedAtISO)
    ) {
      latestByType[award.awardId] = award;
    }
  });

  return latestByType;
}
