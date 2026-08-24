export type Day = "MON" | "TUE" | "WED" | "THU" | "FRI";
export type AttendanceStatus = "attended" | "missed";

export type StudentProfile = {
  semester: string;
  section: string;
  startDate: string;
  endDate: string;
};

export type Course = {
  id: string;
  name: string;
  code: string;
  faculty: string;
  conducted: number;
  attended: number;
};

export type TimetableEntry = {
  id: string;
  day: Day;
  startTime: string;
  endTime: string;
  courseId: string;
  room: string;
};

export type AttendanceRecord = {
  id: string;
  date: string;
  courseId: string;
  entryId?: string;
  status: AttendanceStatus;
};

export type StudentData = {
  profile: StudentProfile;
  courses: Course[];
  timetable: TimetableEntry[];
  attendanceRecords: AttendanceRecord[];
  settings: { targetAttendance: number };
};
