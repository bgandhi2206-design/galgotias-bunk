import type { Course, StudentData, TimetableEntry } from "@/types";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export async function loadRemoteStudentData(userId: string): Promise<StudentData | null> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase is not configured. Add the public keys to .env.local.");
  let profileResult = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (profileResult.error) {
    console.error("Failed to load the authenticated user's profile:", profileResult.error);
    throw profileResult.error;
  }
  if (!profileResult.data) {
    profileResult = await supabase.from("profiles").upsert({ id: userId }).select("id").single();
    if (profileResult.error) {
      console.error("Failed to create the authenticated user's profile:", profileResult.error);
      throw profileResult.error;
    }
  }
  const [semesterResult, coursesResult, timetableResult, attendanceResult] = await Promise.all([
    supabase.from("semesters").select("semester, section, start_date, end_date, target_attendance").eq("user_id", userId).maybeSingle(),
    supabase.from("courses").select("id, name, code, faculty, conducted, attended").eq("user_id", userId).order("name"),
    supabase.from("timetable_entries").select("id, day, start_time, end_time, course_id, room").eq("user_id", userId),
    supabase.from("attendance_records").select("id, date, course_id, entry_id, status").eq("user_id", userId).order("date", { ascending: false }),
  ]);
  const failure = [semesterResult, coursesResult, timetableResult, attendanceResult].find((result) => result.error);
  if (failure?.error) {
    console.error("Failed to load authenticated user data:", failure.error);
    throw failure.error;
  }
  if (!semesterResult.data && !coursesResult.data?.length) return null;
  return {
    profile: { semester: semesterResult.data?.semester ?? "", section: semesterResult.data?.section ?? "", startDate: semesterResult.data?.start_date ?? "", endDate: semesterResult.data?.end_date ?? "" },
    courses: (coursesResult.data ?? []) as Course[],
    timetable: (timetableResult.data ?? []).map((entry) => ({ id: entry.id, day: entry.day, startTime: entry.start_time, endTime: entry.end_time, courseId: entry.course_id, room: entry.room })) as TimetableEntry[],
    attendanceRecords: (attendanceResult.data ?? []).map((record) => ({ id: record.id, date: record.date, courseId: record.course_id, entryId: record.entry_id ?? undefined, status: record.status })) as StudentData["attendanceRecords"],
    settings: { targetAttendance: Number(semesterResult.data?.target_attendance ?? 75) },
  };
}

export async function saveRemoteStudentData(userId: string, data: StudentData) {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase is not configured. Add the public keys to .env.local.");
  const profile = await supabase.from("profiles").upsert({ id: userId }).select("id").single();
  if (profile.error) throw profile.error;
  const semester = await supabase.from("semesters").upsert({ user_id: userId, semester: data.profile.semester, section: data.profile.section, start_date: data.profile.startDate || null, end_date: data.profile.endDate || null, target_attendance: data.settings.targetAttendance }, { onConflict: "user_id" });
  if (semester.error) throw semester.error;
  const deletedAttendance = await supabase.from("attendance_records").delete().eq("user_id", userId);
  if (deletedAttendance.error) throw deletedAttendance.error;
  const deletedTimetable = await supabase.from("timetable_entries").delete().eq("user_id", userId);
  if (deletedTimetable.error) throw deletedTimetable.error;
  const deletedCourses = await supabase.from("courses").delete().eq("user_id", userId);
  if (deletedCourses.error) throw deletedCourses.error;
  const courseRows = data.courses.map((course) => ({ user_id: userId, name: course.name, code: course.code, faculty: course.faculty, conducted: course.conducted, attended: course.attended }));
  const insertedCourses = courseRows.length ? await supabase.from("courses").insert(courseRows).select("id, name, code") : { data: [], error: null };
  if (insertedCourses.error) throw insertedCourses.error;
  const courseMap = new Map(data.courses.map((course, index) => [course.id, insertedCourses.data[index].id]));
  const entryRows = data.timetable.map((entry) => ({ user_id: userId, day: entry.day, start_time: entry.startTime, end_time: entry.endTime, course_id: courseMap.get(entry.courseId), room: entry.room }));
  const insertedEntries = entryRows.length ? await supabase.from("timetable_entries").insert(entryRows).select("id") : { data: [], error: null };
  if (insertedEntries.error) throw insertedEntries.error;
  const entryMap = new Map(data.timetable.map((entry, index) => [entry.id, insertedEntries.data[index].id]));
  const recordRows = data.attendanceRecords.map((record) => ({ user_id: userId, date: record.date, course_id: courseMap.get(record.courseId), entry_id: record.entryId ? entryMap.get(record.entryId) : null, status: record.status }));
  if (recordRows.length) { const insertedRecords = await supabase.from("attendance_records").insert(recordRows); if (insertedRecords.error) throw insertedRecords.error; }
}
