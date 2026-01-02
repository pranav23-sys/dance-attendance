// lib/awards/awards.definitions.ts

import type { AwardDefinition } from "./awards.types";

export const AWARD_DEFINITIONS: AwardDefinition[] = [
  {
    id: "student_of_month",
    name: "Student of the Month",
    description: "Outstanding attendance and participation in a given month",
    category: "MONTHLY_BADGE",
  },
  {
    id: "most_improved_year",
    name: "Most Improved",
    description: "Greatest improvement in attendance over the academic year",
    category: "MAJOR",
  },
  {
    id: "student_of_year",
    name: "Student of the Year",
    description: "Overall top performer for the academic year",
    category: "MAJOR",
  },
];

export function getAwardDefinition(awardId: string): AwardDefinition | undefined {
  return AWARD_DEFINITIONS.find(def => def.id === awardId);
}
