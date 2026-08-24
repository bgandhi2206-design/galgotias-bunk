const timetable = [
  ["09:00", "DBMS", "C-204", "82%", "safe"],
  ["10:00", "Operating Systems", "B-302", "71%", "risk"],
  ["11:00", "Artificial Intelligence", "Lab 3", "88%", "safe"],
  ["12:00", "Break", "", "", "break"],
] as const;

const days = ["MON", "TUE", "WED", "THU", "FRI"];

export function ProductPreview() {
  return <div className="schedule-wrap" id="preview">
    <div className="schedule-meta"><span>WEEK 08 / OCTOBER</span><span><b className="live-dot" />TODAY, MON 14</span></div>
    <div className="schedule-stats"><strong>5 classes</strong><span>2 safe bunks</span><span>75% target</span></div>
    <div className="timetable" role="table" aria-label="Weekly class timetable">
      <div className="time-column"><span />{timetable.map(([time]) => <span key={time}>{time}</span>)}</div>
      {days.map((day, dayIndex) => <div className="day-column" key={day}><div className={`day-head${dayIndex === 0 ? " current" : ""}`}>{day}{dayIndex === 0 && <i>•</i>}</div>{timetable.map(([time, subject, room, percent, state], rowIndex) => <div className={`class-block ${state}`} key={`${day}-${time}`} style={{ gridRow: rowIndex + 2 }} tabIndex={state !== "break" ? 0 : -1}>{state === "break" ? <span>Break</span> : <><strong>{subject}</strong><small>{room}</small><b>{percent} <em>{state === "risk" ? "AT RISK" : "SAFE"}</em></b></>}</div>)}</div>)}
    </div>
    <div className="schedule-foot"><span><i className="legend safe" />Safe</span><span><i className="legend risk" />At risk</span><span className="schedule-note">Tap a class to check it</span></div>
  </div>;
}