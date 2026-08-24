import type { Day, TimetableEntry } from "@/types";

export const DAYS: Day[] = ["MON", "TUE", "WED", "THU", "FRI"];

export function dayFromDate(date: Date): Day | null {
  const index = (date.getDay() + 6) % 7;
  return index < DAYS.length ? DAYS[index] : null;
}

export function timeIsValid(startTime: string, endTime: string) {
  return startTime < endTime;
}

export function entriesForDay(entries: TimetableEntry[], day: Day) {
  return entries.filter((entry) => entry.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
}
