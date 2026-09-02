"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { attendancePercent } from "@/lib/attendance";
import { saveStudentData } from "@/lib/storage";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { loadRemoteStudentData, saveRemoteStudentData } from "@/lib/supabase-data";
import { DAYS, timeIsValid } from "@/lib/timetable";
import type { Course, Day, StudentData, StudentProfile, TimetableEntry } from "@/types";

const emptyProfile: StudentProfile = { semester: "", section: "", startDate: "", endDate: "" };
const emptyCourse = { name: "", code: "", faculty: "", conducted: "0", attended: "0" };
const emptyEntry = { day: "MON" as Day, startTime: "09:00", endTime: "10:00", courseId: "", room: "" };

export function SetupFlow() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(emptyProfile);
  const [target, setTarget] = useState("75");
  const [courses, setCourses] = useState<Course[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<StudentData["attendanceRecords"]>([]);
  const [courseForm, setCourseForm] = useState(emptyCourse);
  const [entryForm, setEntryForm] = useState(emptyEntry);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadSetup() {
      const supabase = createSupabaseBrowserClient();
      let user = null;
      try {
        const result = supabase ? await supabase.auth.getUser() : null;
        user = result?.data.user ?? null;
      } catch (authError) {
        console.error("Failed to initialize authentication for setup:", authError);
        if (!cancelled) setError("We could not verify your session. Check your connection and retry.");
      }
      if (cancelled) return;
      setUserId(user?.id ?? null);
      if (user) {
        try {
          const stored = await loadRemoteStudentData(user.id);
          if (!cancelled && stored) { setProfile(stored.profile); setTarget(String(stored.settings.targetAttendance)); setCourses(stored.courses); setTimetable(stored.timetable); setAttendanceRecords(stored.attendanceRecords); }
        } catch (remoteError) {
          console.error("Failed to load authenticated setup data:", remoteError);
          if (!cancelled) setError(remoteError instanceof Error ? remoteError.message : "Could not load your data.");
        }
      }
      if (!cancelled) setRemoteLoading(false);
    }
    loadSetup();
    return () => { cancelled = true; };
  }, []);

  const duplicateNames = useMemo(() => courses.map((course) => course.name.toLowerCase()).filter((name, index, list) => list.indexOf(name) !== index), [courses]);
  const courseName = (id: string) => courses.find((course) => course.id === id)?.code ?? "Unknown";
  function goNext(event?: FormEvent) {
    event?.preventDefault(); setError("");
    if (step === 1 && (!profile.semester || !profile.section || !profile.startDate || !profile.endDate || Number(target) < 1 || Number(target) > 100 || profile.startDate > profile.endDate)) return setError("Fill in your details and check the dates.");
    if (step === 2 && (!courses.length || duplicateNames.length)) return setError("Add at least one course. Names and codes must be unique.");
    if (step === 3 && (!timetable.length || timetable.some((entry) => !timeIsValid(entry.startTime, entry.endTime)))) return setError("Add a valid timetable entry with an end time after its start time.");
    setStep((current) => Math.min(4, current + 1));
  }
  function addCourse(event: FormEvent) {
    event.preventDefault();
    const conducted = Number(courseForm.conducted); const attended = Number(courseForm.attended);
    const duplicate = courses.some((course) => course.id !== editingCourseId && (course.name.toLowerCase() === courseForm.name.trim().toLowerCase() || course.code.toLowerCase() === courseForm.code.trim().toLowerCase()));
    if (!courseForm.name.trim() || !courseForm.code.trim() || conducted < 0 || attended < 0 || attended > conducted || duplicate) return setError("Check the course details. Names and codes must be unique.");
    const nextCourse = { id: editingCourseId ?? `${courseForm.code.toLowerCase()}-${Date.now()}`, name: courseForm.name.trim(), code: courseForm.code.trim().toUpperCase(), faculty: courseForm.faculty.trim(), conducted, attended };
    setCourses(editingCourseId ? courses.map((course) => course.id === editingCourseId ? nextCourse : course) : [...courses, nextCourse]);
    setCourseForm(emptyCourse); setEditingCourseId(null); setError("");
  }
  function editCourse(course: Course) { setEditingCourseId(course.id); setCourseForm({ name: course.name, code: course.code, faculty: course.faculty, conducted: String(course.conducted), attended: String(course.attended) }); setError(""); }
  function addEntry(event: FormEvent) {
    event.preventDefault();
    if (!entryForm.courseId || !timeIsValid(entryForm.startTime, entryForm.endTime)) return setError("Choose a course and use a valid time range.");
    const nextEntry = { ...entryForm, id: editingEntryId ?? `${entryForm.courseId}-${Date.now()}` };
    setTimetable(editingEntryId ? timetable.map((entry) => entry.id === editingEntryId ? nextEntry : entry) : [...timetable, nextEntry]);
    setEntryForm({ ...emptyEntry, courseId: courses[0]?.id ?? "" }); setEditingEntryId(null); setError("");
  }
  function editEntry(entry: TimetableEntry) { setEditingEntryId(entry.id); setEntryForm({ day: entry.day, startTime: entry.startTime, endTime: entry.endTime, courseId: entry.courseId, room: entry.room }); setError(""); }
  async function createDashboard() { const nextData = { profile, courses, timetable, attendanceRecords, settings: { targetAttendance: Number(target) } }; if (!userId) return setError("Please log in again before saving your dashboard."); try { await saveRemoteStudentData(userId, nextData); saveStudentData(nextData); router.push("/dashboard"); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Could not save your setup."); } }

  const courseStep = <div className="setup-content"><form className="setup-form course-add-form" onSubmit={addCourse}><div className="form-grid"><label>Course name<input placeholder="Database Management Systems" value={courseForm.name} onChange={(event) => setCourseForm({ ...courseForm, name: event.target.value })} /></label><label>Short code<input placeholder="DBMS" value={courseForm.code} onChange={(event) => setCourseForm({ ...courseForm, code: event.target.value })} /></label><label>Faculty <span>(optional)</span><input value={courseForm.faculty} onChange={(event) => setCourseForm({ ...courseForm, faculty: event.target.value })} /></label><label>Classes conducted<input min="0" type="number" value={courseForm.conducted} onChange={(event) => setCourseForm({ ...courseForm, conducted: event.target.value })} /></label><label>Classes attended<input min="0" type="number" value={courseForm.attended} onChange={(event) => setCourseForm({ ...courseForm, attended: event.target.value })} /></label></div><button className="outline-button" type="submit">{editingCourseId ? "Save course" : "+ Add course"}</button></form><div className="setup-list">{courses.map((course) => <div className="setup-list-row" key={course.id}><div><strong>{course.code} / {course.name}</strong><span>{course.faculty || "Faculty not added"}</span></div><div><b>{course.conducted - course.attended} missed</b><strong>{attendancePercent(course).toFixed(1)}%</strong></div><button onClick={() => editCourse(course)} type="button">Edit</button><button aria-label={`Remove ${course.name}`} onClick={() => setCourses(courses.filter((item) => item.id !== course.id))} type="button">×</button></div>)}</div><div className="setup-footer-actions"><button className="text-button" onClick={() => setStep(1)} type="button">← Back</button><button className="button-primary" onClick={() => goNext()} type="button">Next: timetable →</button></div></div>;
  const timetableStep = <div className="setup-content"><form className="setup-form course-add-form" onSubmit={addEntry}><div className="form-grid"><label>Day<select value={entryForm.day} onChange={(event) => setEntryForm({ ...entryForm, day: event.target.value as Day })}>{DAYS.map((day) => <option key={day}>{day}</option>)}</select></label><label>Course<select value={entryForm.courseId} onChange={(event) => setEntryForm({ ...entryForm, courseId: event.target.value })}><option value="">Choose course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.code} / {course.name}</option>)}</select></label><label>Starts<input required type="time" value={entryForm.startTime} onChange={(event) => setEntryForm({ ...entryForm, startTime: event.target.value })} /></label><label>Ends<input required type="time" value={entryForm.endTime} onChange={(event) => setEntryForm({ ...entryForm, endTime: event.target.value })} /></label><label>Room <span>(optional)</span><input placeholder="C-204" value={entryForm.room} onChange={(event) => setEntryForm({ ...entryForm, room: event.target.value })} /></label></div><button className="outline-button" type="submit">{editingEntryId ? "Save timetable entry" : "+ Add timetable entry"}</button></form><div className="setup-list">{[...timetable].sort((a, b) => `${a.day}${a.startTime}`.localeCompare(`${b.day}${b.startTime}`)).map((entry) => <div className="setup-list-row" key={entry.id}><div><strong>{entry.day} / {entry.startTime}—{entry.endTime}</strong><span>{courseName(entry.courseId)} {entry.room && `· ${entry.room}`}</span></div><button onClick={() => editEntry(entry)} type="button">Edit</button><button aria-label="Remove timetable entry" onClick={() => setTimetable(timetable.filter((item) => item.id !== entry.id))} type="button">×</button></div>)}</div><div className="setup-footer-actions"><button className="text-button" onClick={() => setStep(2)} type="button">← Back</button><button className="button-primary" onClick={() => goNext()} type="button">Review setup →</button></div></div>;
  const reviewStep = <div className="review-grid"><div className="review-block"><span>STUDENT</span><strong>Semester {profile.semester} / Section {profile.section}</strong><small>{target}% target · {profile.startDate} to {profile.endDate}</small></div><div className="review-block"><span>COURSES / {courses.length}</span>{courses.map((course) => <div className="review-row" key={course.id}><strong>{course.code}</strong><span>{course.name}</span><b>{attendancePercent(course).toFixed(1)}%</b></div>)}</div><div className="review-block"><span>WEEKLY TIMETABLE / {timetable.length}</span>{timetable.map((entry) => <div className="review-row" key={entry.id}><strong>{entry.day}</strong><span>{entry.startTime}—{entry.endTime} · {courseName(entry.courseId)}</span><b>{entry.room || "TBA"}</b></div>)}</div><div className="setup-footer-actions"><button className="text-button" onClick={() => setStep(3)} type="button">← Back</button><button className="button-primary" onClick={createDashboard} type="button">Create my dashboard →</button></div></div>;
  const currentStep = step === 1 ? <form className="setup-form" onSubmit={goNext}><div className="form-grid"><label>Semester<input required placeholder="e.g. 5th" value={profile.semester} onChange={(event) => setProfile({ ...profile, semester: event.target.value })} /></label><label>Section<input required placeholder="e.g. A" value={profile.section} onChange={(event) => setProfile({ ...profile, section: event.target.value })} /></label><label>Target attendance %<input required max="100" min="1" type="number" value={target} onChange={(event) => setTarget(event.target.value)} /></label><label>Semester starts<input required type="date" value={profile.startDate} onChange={(event) => setProfile({ ...profile, startDate: event.target.value })} /></label><label>Semester ends<input required type="date" value={profile.endDate} onChange={(event) => setProfile({ ...profile, endDate: event.target.value })} /></label></div><button className="button-primary setup-next" type="submit">Next: add courses →</button></form> : step === 2 ? courseStep : step === 3 ? timetableStep : reviewStep;
  if (remoteLoading) return <div className="setup-shell dashboard-loading"><span>Loading your setup...</span></div>;
  return <div className="setup-shell"><header className="dashboard-nav"><Link className="brand" href="/"><span className="brand-mark">GB</span>Galgotias Bunk</Link><Link className="back-link" href="/">Exit setup</Link></header><main className="setup-main"><div className="setup-progress"><span>SETUP / 0{step}—04</span><div>{[1, 2, 3, 4].map((item) => <i className={item <= step ? "active" : ""} key={item} />)}</div></div><div className="setup-heading"><div className="eyebrow">LET&apos;S GET YOU SORTED</div><h1>{step === 1 ? "Start with the basics." : step === 2 ? "Add your courses." : step === 3 ? "Build your week." : "Ready to check."}</h1><p>{step === 1 ? "A few details, then we can do the useful bits." : step === 2 ? "Add the subjects you want to keep an eye on." : step === 3 ? "Put your classes in once. We&apos;ll show them when they matter." : "Give it a quick look before we save your dashboard."}</p></div>{error && <div className="form-error" role="alert">{error}</div>}{currentStep}</main></div>;
}
