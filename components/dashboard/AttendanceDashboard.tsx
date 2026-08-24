"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { attendancePercent, classesToTarget, safeBunks } from "@/lib/attendance";
import { clearStudentData } from "@/lib/storage";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { loadRemoteStudentData, saveRemoteStudentData } from "@/lib/supabase-data";
import { dayFromDate } from "@/lib/timetable";
import type { AttendanceRecord, Course, StudentData, TimetableEntry } from "@/types";

function formatPercent(value: number) { return `${value.toFixed(1)}%`; }
function status(value: number) { return value >= 75 ? "SAFE" : value >= 65 ? "WARNING" : "AT RISK"; }
function todayDate() { return new Date().toISOString().slice(0, 10); }
function dateKey(date: Date) { return date.toISOString().slice(0, 10); }
function addDays(date: Date, days: number) { const next = new Date(date); next.setDate(next.getDate() + days); return next; }
function entryCourse(entry: TimetableEntry, courses: Course[]) { return courses.find((course) => course.id === entry.courseId); }

function DailyAttendance({ data, todayEntries, onChange }: { data: StudentData; todayEntries: TimetableEntry[]; onChange: (entry: TimetableEntry, attended: boolean | null) => void }) {
  const today = todayDate();
  return <section className="daily-tracker panel" aria-labelledby="daily-tracker-title"><div className="panel-heading"><div><span className="panel-kicker">TODAY / {todayEntries.length} CLASSES</span><h2 id="daily-tracker-title">Mark today&apos;s attendance</h2></div><span className="count-label">{today}</span></div>{todayEntries.length ? todayEntries.map((entry) => {
    const course = entryCourse(entry, data.courses);
    const record = data.attendanceRecords.find((item) => item.date === today && item.entryId === entry.id);
    return <div className="daily-row" key={entry.id}><div className="daily-time">{entry.startTime}<small>{entry.endTime}</small></div><div className="daily-course"><strong>{course?.code ?? "Unknown course"}</strong><span>{course?.name ?? "Course removed"} · {entry.room || "Room TBA"}</span><b>{course ? formatPercent(attendancePercent(course)) : "-"} current</b></div>{record ? <div className="daily-marked"><strong className={record.status}>{record.status === "attended" ? "PRESENT" : "ABSENT"}</strong><button onClick={() => onChange(entry, null)} type="button">Change</button></div> : <div className="daily-actions"><button className="present-button" onClick={() => onChange(entry, true)} type="button">Present</button><button className="absent-button" onClick={() => onChange(entry, false)} type="button">Absent</button></div>}</div>;
  }) : <p className="empty-state">No classes today. Enjoy the quiet.</p>}</section>;
}

export function AttendanceDashboard() {
  const router = useRouter();
  const [data, setData] = useState<StudentData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dateKey(addDays(new Date(), 7)));
  const [bunkCourseId, setBunkCourseId] = useState("");
  const [bunkCount, setBunkCount] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [loadError, setLoadError] = useState("");
  const [remoteReady, setRemoteReady] = useState(false);
  const skipInitialSave = useRef(true);

  useEffect(() => {
    window.setTimeout(async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
      setUserId(user?.id ?? null);
      setUserEmail(user?.email ?? "");
      if (user) {
        try { const stored = await loadRemoteStudentData(user.id); setData(stored); setBunkCourseId(stored?.courses[0]?.id ?? ""); } catch (error) { setLoadError(error instanceof Error ? error.message : "Could not load your data."); }
      }
      setRemoteReady(true);
      setLoaded(true);
    }, 0);
  }, []);
  useEffect(() => {
    if (!remoteReady || !data || !userId) return;
    if (skipInitialSave.current) { skipInitialSave.current = false; return; }
    saveRemoteStudentData(userId, data).catch((error) => setLoadError(error instanceof Error ? error.message : "Could not save your data."));
  }, [data, remoteReady, userId]);

  const projected = useMemo(() => {
    if (!data) return 0;
    const targetDate = new Date(`${selectedDate}T12:00:00`);
    const start = new Date(); start.setHours(12, 0, 0, 0);
    let future = 0;
    for (let cursor = new Date(start); cursor <= targetDate; cursor = addDays(cursor, 1)) {
      const day = dayFromDate(cursor);
      if (day) future += data.timetable.filter((entry) => entry.day === day).length;
    }
    const totals = data.courses.reduce((result, course) => ({ conducted: result.conducted + course.conducted, attended: result.attended + course.attended }), { conducted: 0, attended: 0 });
    return totals.conducted + future ? (totals.attended + future) / (totals.conducted + future) * 100 : 0;
  }, [data, selectedDate]);

  if (!loaded) return <div className="dashboard-shell dashboard-loading"><span>Loading your attendance...</span></div>;
  if (loadError) return <div className="dashboard-shell"><main className="empty-dashboard"><div className="eyebrow">GB / ACCOUNT</div><h1>Couldn&apos;t load your data.</h1><p>{loadError}</p><Link className="button-primary" href="/login">Back to login →</Link></main></div>;
  if (!data) return <div className="dashboard-shell"><header className="dashboard-nav"><Link className="brand" href="/"><span className="brand-mark">GB</span>Galgotias Bunk</Link><Link className="back-link" href="/">Back to home</Link></header><main className="empty-dashboard"><div className="eyebrow">GB / ATTENDANCE</div><h1>Let&apos;s set this up.</h1><p>Add your courses and timetable first.</p><Link className="button-primary" href="/setup">Set up my timetable →</Link></main></div>;

  const target = data.settings.targetAttendance;
  const totals = data.courses.reduce((result, course) => ({ conducted: result.conducted + course.conducted, attended: result.attended + course.attended }), { conducted: 0, attended: 0 });
  const overall = totals.conducted ? totals.attended / totals.conducted * 100 : 0;
  const missed = totals.conducted - totals.attended;
  const overallSafeBunks = totals.conducted ? Math.max(0, Math.floor(totals.attended / (target / 100) - totals.conducted + 0.00001)) : 0;
  const selectedCourse = data.courses.find((course) => course.id === bunkCourseId) ?? data.courses[0];
  const today = dayFromDate(new Date());
  const todayEntries = data.timetable.filter((entry) => entry.day === today).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const upcomingEntries = data.timetable.filter((entry) => entry.day !== today).sort((a, b) => a.startTime.localeCompare(b.startTime)).slice(0, 4);
  const bunkedAttendance = selectedCourse ? selectedCourse.attended / (selectedCourse.conducted + bunkCount) * 100 : 0;

  function markAttendance(courseId: string, attended: boolean) {
    setData((current) => {
      if (!current) return current;
      const nextRecord: AttendanceRecord = { id: `${courseId}-${current.attendanceRecords.length + 1}`, date: todayDate(), courseId, status: attended ? "attended" : "missed" };
      return { ...current, courses: current.courses.map((course) => course.id === courseId ? { ...course, conducted: course.conducted + 1, attended: course.attended + (attended ? 1 : 0) } : course), attendanceRecords: [...current.attendanceRecords, nextRecord] };
    });
  }
  function updateTodayAttendance(entry: TimetableEntry, attended: boolean | null) {
    setData((current) => {
      if (!current) return current;
      const date = todayDate();
      const existing = current.attendanceRecords.find((record) => record.date === date && record.entryId === entry.id);
      const course = current.courses.find((item) => item.id === entry.courseId);
      if (!course) return current;
      const nextRecords = existing ? current.attendanceRecords.filter((record) => record.id !== existing.id) : current.attendanceRecords;
      const nextCourse = existing
        ? attended === null
          ? { ...course, conducted: Math.max(0, course.conducted - 1), attended: Math.max(0, course.attended - (existing.status === "attended" ? 1 : 0)) }
          : { ...course, attended: course.attended + (attended ? 1 : -1) }
        : { ...course, conducted: course.conducted + 1, attended: course.attended + (attended ? 1 : 0) };
      if (attended === null) return { ...current, courses: current.courses.map((item) => item.id === course.id ? nextCourse : item), attendanceRecords: nextRecords };
      const nextRecord: AttendanceRecord = { id: existing?.id ?? `${entry.id}-${date}`, date, courseId: entry.courseId, entryId: entry.id, status: attended ? "attended" : "missed" };
      return { ...current, courses: current.courses.map((item) => item.id === course.id ? nextCourse : item), attendanceRecords: [...nextRecords, nextRecord] };
    });
  }
  function resetData() {
    if (window.confirm("Reset all courses, timetable, and attendance data?")) { clearStudentData(); setData(null); }
  }
  async function logout() { const supabase = createSupabaseBrowserClient(); if (supabase) await supabase.auth.signOut(); router.push("/login"); }
  function courseStatus(course: Course) { return status(attendancePercent(course)); }
  return <div className="dashboard-shell"><header className="dashboard-nav"><Link className="brand" href="/"><span className="brand-mark">GB</span>Galgotias Bunk</Link><div className="dashboard-nav-right"><span className="account-email">{userEmail}</span><span className="dashboard-date">{new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span><Link className="back-link" href="/setup">Edit setup</Link><button className="logout-button" onClick={logout} type="button">Log out</button></div></header>
    <main className="dashboard-main"><div className="dashboard-header"><div><div className="eyebrow">GB / ATTENDANCE</div><h1>Semester {data.profile.semester}, section {data.profile.section}.</h1><p>Check the numbers before you make plans.</p></div><Link className="dashboard-action" href="/setup">Manage data</Link></div>
      <section className="summary-grid" aria-label="Attendance summary"><div className="summary-card summary-main"><span>OVERALL ATTENDANCE</span><strong>{formatPercent(overall)}</strong><div className="summary-bar"><i style={{ width: `${Math.min(100, overall)}%` }} /></div><b className={`status-text ${status(overall).toLowerCase().replace(" ", "-")}`}>{status(overall)} / TARGET {target}%</b></div><div className="summary-card"><span>TOTAL CLASSES</span><strong>{totals.conducted}</strong><small>conducted</small></div><div className="summary-card"><span>CLASSES ATTENDED</span><strong>{totals.attended}</strong><small>so far</small></div><div className="summary-card"><span>CLASSES MISSED</span><strong>{missed}</strong><small>keep an eye on this</small></div><div className="summary-card summary-bunks"><span>SAFE BUNKS</span><strong>{overallSafeBunks}</strong><small>while staying at {target}%</small></div></section>
      <DailyAttendance data={data} onChange={updateTodayAttendance} todayEntries={todayEntries} />
      <section className="dashboard-grid"><div className="panel courses-panel"><div className="panel-heading"><div><span className="panel-kicker">YOUR COURSES</span><h2>Course health</h2></div><Link className="text-button" href="/setup">Edit list</Link></div><div className="course-list">{data.courses.map((course) => <article className="course-item" key={course.id}><div className="course-item-head"><div><h3>{course.code} / {course.name}</h3><span>{course.faculty || "Faculty not added"}</span></div><strong className={courseStatus(course).toLowerCase().replace(" ", "-")}>{formatPercent(attendancePercent(course))}</strong></div><div className="course-progress"><i className={courseStatus(course).toLowerCase().replace(" ", "-")} style={{ width: `${Math.min(100, attendancePercent(course))}%` }} /></div><div className="course-facts"><span>{course.conducted} conducted</span><span>{course.attended} attended</span><span>{course.conducted - course.attended} missed</span><b>{classesToTarget(course, target) ? `Attend ${classesToTarget(course, target)} more` : `Bunk ${safeBunks(course, target)}`}</b></div><div className="course-actions"><button onClick={() => markAttendance(course.id, true)} type="button">Mark attended</button><button onClick={() => markAttendance(course.id, false)} type="button">Mark missed</button></div></article>)}</div></div>
        <aside className="panel day-panel"><div className="panel-heading"><div><span className="panel-kicker">{today ?? "WEEKEND"} / TODAY</span><h2>Today&apos;s classes</h2></div><span className="count-label">{todayEntries.length} classes</span></div>{todayEntries.length ? todayEntries.map((entry) => { const course = entryCourse(entry, data.courses); return <div className="day-class" key={entry.id}><span>{entry.startTime}</span><div><strong>{course?.code ?? "Unknown course"}</strong><small>{entry.room || "Room TBA"} · {entry.endTime}</small></div><i className={course ? courseStatus(course).toLowerCase().replace(" ", "-") : "warning"} /></div>; }) : <p className="empty-state">No classes today. Enjoy the quiet.</p>}<div className="upcoming-title">UP NEXT</div>{upcomingEntries.map((entry) => <div className="upcoming-class" key={entry.id}><span>{entry.day}</span><strong>{entryCourse(entry, data.courses)?.code ?? "Unknown"}</strong><small>{entry.startTime}</small></div>)}</aside></section>
      <section className="lower-grid"><div className="panel projection-panel"><div className="panel-heading"><div><span className="panel-kicker">LOOKING AHEAD</span><h2>Where will I land?</h2></div><label className="date-label">SELECT DATE<input type="date" value={selectedDate} min={dateKey(new Date())} onChange={(event) => setSelectedDate(event.target.value)} /></label></div><div className="projection-value"><strong>{formatPercent(projected)}</strong><span>projected attendance by {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span></div><div className="projection-line"><i style={{ width: `${Math.min(100, projected)}%` }} /><b>{target}%</b></div><p>Projection assumes you attend your scheduled classes until this date.</p></div><div className="panel calculator-panel"><div className="panel-heading"><div><span className="panel-kicker">QUICK CHECK</span><h2>Can I bunk this class?</h2></div></div><select aria-label="Select a course" value={bunkCourseId} onChange={(event) => setBunkCourseId(event.target.value)}>{data.courses.map((course) => <option key={course.id} value={course.id}>{course.code} / {course.name}</option>)}</select><div className="bunk-selector"><button aria-label="Remove one bunk" onClick={() => setBunkCount(Math.max(1, bunkCount - 1))} type="button">−</button><strong>{bunkCount} class{bunkCount > 1 ? "es" : ""}</strong><button aria-label="Add one bunk" onClick={() => setBunkCount(bunkCount + 1)} type="button">+</button></div><div className="bunk-result"><span>AFTER SKIPPING</span><strong>{formatPercent(bunkedAttendance)}</strong><b className={bunkedAttendance >= target ? "safe" : "risk"}>{bunkedAttendance >= target ? "YES, YOU'RE SAFE." : "NOT SAFE."}</b></div></div></section>
      <section className="panel data-panel"><div><span className="panel-kicker">SETTINGS / MANAGE DATA</span><h2>Keep your setup current.</h2><p>Change your profile, courses, or weekly timetable from setup.</p></div><div className="data-actions"><Link className="button-secondary" href="/setup">Edit profile and timetable</Link><button className="danger-button" onClick={resetData} type="button">Reset all data</button></div></section>
    </main></div>;
}
