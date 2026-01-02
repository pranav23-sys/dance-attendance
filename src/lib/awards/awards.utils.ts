// lib/awards/awards.utils.ts

import type { AwardUnlock } from "../sync-manager";

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
  if (award.periodType === "RANGE") {
    // periodKey format: "2024-03-01T00:00:00.000Z|2024-03-31T23:59:59.999Z"
    const [startISO, endISO] = award.periodKey.split("|");
    if (startISO && endISO) {
      const start = new Date(startISO);
      const end = new Date(endISO);
      const startMonth = start.toLocaleDateString(undefined, { month: "short" });
      const endMonth = end.toLocaleDateString(undefined, { month: "short" });
      const year = start.getFullYear();
      if (startMonth === endMonth) {
        return `${startMonth} ${year}`;
      } else {
        return `${startMonth} - ${endMonth} ${year}`;
      }
    }
  } else if (award.periodType === "ACADEMIC_YEAR") {
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
