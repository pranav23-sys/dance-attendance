// lib/awards/awards.storage.ts

import type { AwardUnlock } from "./awards.types";

const LS_AWARDS = "bb_awards";

/**
 * Read all awards from localStorage
 */
export function loadAwards(): AwardUnlock[] {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(LS_AWARDS) || "[]");
}

/**
 * Save all awards to localStorage
 */
export function saveAwards(awards: AwardUnlock[]) {
  localStorage.setItem(LS_AWARDS, JSON.stringify(awards));
}

/**
 * Add a new award IF it does not already exist
 * (prevents duplicates)
 */
export function addAwardUnlock(
  existing: AwardUnlock[],
  unlock: AwardUnlock
): AwardUnlock[] {
  const alreadyExists = existing.some(
    (a) =>
      a.awardId === unlock.awardId &&
      a.studentId === unlock.studentId &&
      a.periodKey === unlock.periodKey
  );

  if (alreadyExists) return existing;

  const updated = [...existing, unlock];
  saveAwards(updated);
  return updated;
}
