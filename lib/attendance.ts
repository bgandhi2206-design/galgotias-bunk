import type { Course } from "@/types";

export function attendancePercent(course: Course) {
  return course.conducted ? (course.attended / course.conducted) * 100 : 0;
}

export function classesToTarget(course: Course, target: number) {
  if (attendancePercent(course) >= target) return 0;
  return Math.ceil((target * course.conducted - course.attended * 100) / (100 - target));
}

export function safeBunks(course: Course, target: number) {
  if (target <= 0) return 0;
  return Math.max(0, Math.floor(course.attended / (target / 100) - course.conducted + 0.00001));
}

export function projectedPercent(course: Course, futureMisses: number) {
  return course.conducted + futureMisses ? (course.attended / (course.conducted + futureMisses)) * 100 : 0;
}
