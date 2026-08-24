import type { StudentData } from "@/types";

export const STORAGE_KEY = "galgotias-bunk-student-data";

export function loadStudentData(): StudentData | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as StudentData; } catch { return null; }
}

export function saveStudentData(data: StudentData) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearStudentData() {
  window.localStorage.removeItem(STORAGE_KEY);
}
