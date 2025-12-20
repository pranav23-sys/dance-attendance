// src/lib/awards/awards.types.ts

export type AwardCategory =
  | "MONTHLY_BADGE"
  | "MAJOR";

export type AwardPeriodType =
  | "MONTH"
  | "YEAR"
  | "CUSTOM";

export type AwardDefinition = {
  id: string;
  name: string;
  description: string;
  category: AwardCategory;
};

export type AwardUnlock = {
  id: string;

  awardId: string;
  studentId: string;
  classId: string;

  // what time period this award belongs to
  periodType: AwardPeriodType;
  periodKey: string; // e.g. "2025-03", "2024-2025"

  unlockedAtISO: string;

  // only for big awards
  decidedBy: "SYSTEM" | "TEACHER";
};

export {};