export const EVENT_FORMAT_OPTIONS = [
  "Single Elimination",
  "Double Elimination",
  "Round Robin",
  "Swiss",
  "Group Stage + Knockout",
  "In-house",
] as const;

export type EventFormat = (typeof EVENT_FORMAT_OPTIONS)[number];

export const PLAYOFF_FORMAT_OPTIONS = [
  { value: "single_elimination", label: "Single Elimination" },
  { value: "double_elimination", label: "Double Elimination" },
  { value: "round_robin", label: "Round Robin" },
  { value: "swiss", label: "Swiss" },
  { value: "group_stage_knockout", label: "Group Stage + Knockout" },
  { value: "in_house", label: "In-house" },
] as const;

export const MATCH_FORMAT_OPTIONS = ["BO1", "BO3", "BO5"] as const;
export type MatchFormat = (typeof MATCH_FORMAT_OPTIONS)[number];

export function getScoreOptions(format: string): string[] {
  if (format === "BO3") return ["2-0", "2-1"];
  if (format === "BO5") return ["3-0", "3-1", "3-2"];
  return ["1-0"];
}
