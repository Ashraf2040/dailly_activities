"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ========= Types ========= */
type Cls = { id: string; name: string };
type Subj = { id: string; name: string };
type Teacher = {
  id: string;
  name: string;
  username: string;
  phone?: string | null; // optional if fetched from backend
  subjects?: { id: string; name: string }[];
  classes?: { id: string; name: string }[];
};

type FetchedSchedule = {
  id: string;
  classId: string;
  name?: string | null;
  items: Array<{
    dayIndex: number;
    session: number;
    start: string;
    end: string;
    subject: { id: string; name: string };
    teacher: { id: string; name: string };
  }>;
  class?: { id: string; name: string };
  createdAt?: string;
};

type SessionDef = { start: string; end: string };
type DayKey = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday";
const DAYS: DayKey[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

type Selection = { subjectId: string; weeklyCount: number; teacherId: string };
type PlacedCell = { subjectId: string; teacherId?: string };

type SavedSub = {
  id: string;
  date: string;
  dayIndex: number;
  session: number;
  start: string;
  end: string;
  classId: string;
  subjectId?: string | null;
  absentId: string;
  replacementId: string;
  class?: { id: string; name: string };
  subject?: { id: string; name: string | null };
  absent?: { id: string; name: string };
  replacement?: { id: string; name: string };
};

/* ========= Utils ========= */
async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  let data: any = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error((data as any)?.error ?? res.statusText);
  return data as T;
}

function addMinutes(timeHHMM: string, mins: number) {
  const [h, m] = timeHHMM.split(":").map(Number);
  const base = new Date();
  base.setHours(h, m, 0, 0);
  base.setMinutes(base.getMinutes() + mins);
  const hh = String(base.getHours()).padStart(2, "0");
  const mm = String(base.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

const ENGLISH_NAMES = new Set(["English", "english", "ENGLISH", "لغة إنجليزية", "إنجليزي"]);
function isEnglishByName(subjectId: string, subjects: Subj[]) {
  const s = subjects.find(x => x.id === subjectId)?.name?.trim() || "";
  return ENGLISH_NAMES.has(s);
}

/* ========= Shared Timetable ========= */
type CellView = { subject?: string; teacher?: string; className?: string; start?: string; end?: string };
type TableProps = {
  title: string;
  sessionTimes: { start: string; end: string }[];
  grid: CellView[][];
  showBreakAt?: number | null;
  breakLengthMin?: number;
};

function Timetable({ title, sessionTimes, grid, showBreakAt, breakLengthMin = 0 }: TableProps) {
  const maxSession = sessionTimes.length;
  return (
    <div className="rounded-2xl bg-white p-4 shadow-lg ring-1 ring-gray-100">
      <div className="mb-3 text-center text-xl font-bold text-[#064e4f]">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
          <thead className="bg-[#006d77] text-white">
            <tr>
              <th className="sticky left-0 z-10 w-28 border-r border-white px-3 py-2 text-left font-semibold bg-[#006d77]">Day</th>
              {Array.from({ length: maxSession }, (_, i) => (
                <th key={i} className="min-w-40 border-l border-white px-3 py-2 text-left font-semibold">
                  Session {i+1}
                  <div className="text-[11px] opacity-80">{sessionTimes[i]?.start}–{sessionTimes[i]?.end}</div>
                  {showBreakAt === i+1 && (
                    <div className="mt-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800 ring-1 ring-amber-200">
                      Break +{breakLengthMin}m
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {DAYS.map((dn, di) => (
              <tr key={dn} className="even:bg-gray-50">
                <td className="sticky left-0 z-10 border-r border-gray-200 bg-white px-3 py-2 font-medium">{dn}</td>
                {grid[di].map((cell, si) => (
                  <td key={si} className="border-l border-gray-200 px-3 py-2 align-top">
                    {cell?.subject ? (
                      <div className="space-y-0.5">
                        <div className="font-medium">{cell.subject}</div>
                        {cell.teacher && <div className="text-[11px] text-gray-600">{cell.teacher}</div>}
                        {cell.className && <div className="text-[11px] text-gray-500">{cell.className}</div>}
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                ))}
              </tr>
            ))}\r\n          </tbody>
        </table>
      </div>
    </div>
  );
}


/* ========= Page ========= */
export default function SchedulePage() {
  const router = useRouter();

  // Data
  const [classes, setClasses] = useState<Cls[]>([]);
  const [subjects, setSubjects] = useState<Subj[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
// Add near other state declarations
const [globalTeacherSchedule, setGlobalTeacherSchedule] = useState<Map<string, Set<string>>>(new Map());
// Key format: "dayIndex-session" -> Set of teacher IDs

  // Inputs
  const [classId, setClassId] = useState("");
  const [sessionsPerDay, setSessionsPerDay] = useState(6);
  const [sessionLengthMin, setSessionLengthMin] = useState(45);
  const [dayStartTime, setDayStartTime] = useState("07:00");
  const [breakAfterSession, setBreakAfterSession] = useState<number | null>(3);
  const [breakLengthMin, setBreakLengthMin] = useState(20);
// Add near other state declarations
const [maxConsecutiveSessions, setMaxConsecutiveSessions] = useState(2); // Configurable

  // Remote schedules / teachers view
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [remoteSchedules, setRemoteSchedules] = useState<FetchedSchedule[]>([]);
  const [allTeacherMap, setAllTeacherMap] = useState<Map<string, Array<{
    classId: string;
    className: string;
    dayIndex: number;
    session: number;
    start: string;
    end: string;
    subjectId: string;
    subjectName: string;
  }>>>(new Map());
  const [teacherFilterId, setTeacherFilterId] = useState<string>("");

  // Selections
  const [selections, setSelections] = useState<Selection[]>([]);

  // Generated
  const [generated, setGenerated] = useState<Record<DayKey, PlacedCell[]>>({
    Sunday: [],
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
  });

  // UI
  const [editCell, setEditCell] = useState<{ dayIndex: number; sessionIdx: number } | null>(null);
  const [savedScheduleId, setSavedScheduleId] = useState<string | null>(null);
  const [showRecords, setShowRecords] = useState(false);
  const [showTeachersView, setShowTeachersView] = useState(false);
  const [filterClassId, setFilterClassId] = useState<string>("");

  // Substitutions (generator)
  type SubRow = {
    dayIndex: number;
    session: number;
    start: string;
    end: string;
    classId: string;
    className: string;
    subjectId?: string;
    subjectName?: string;
    absentTeacherId: string;
    replacementId: string;
    candidates: { id: string; name: string }[];
  };
  const [showSubs, setShowSubs] = useState(false);
  const [subsDate, setSubsDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [absentTeacherId, setAbsentTeacherId] = useState<string>("");
  const [subsRows, setSubsRows] = useState<SubRow[]>([]);
  const [savingSubs, setSavingSubs] = useState(false);
// Add these near your other state declarations
const [secondBreakAfterSession, setSecondBreakAfterSession] = useState<number | null>(null);
const [secondBreakLengthMin, setSecondBreakLengthMin] = useState(20);
const [customSessionTimes, setCustomSessionTimes] = useState<boolean>(false);
const [manualSessionTimes, setManualSessionTimes] = useState<Array<{ start: string; end: string }>>([]);

  // WhatsApp CSV
  const [whatsMap, setWhatsMap] = useState<Map<string, { phone: string; optIn: boolean }>>(new Map());

  // This-week subs count
  const subsWeekMapRef = useRef<Map<string, number>>(new Map());

  // Saved today substitutions
  const [todaySubs, setTodaySubs] = useState<SavedSub[]>([]);
  const [loadingTodaySubs, setLoadingTodaySubs] = useState(false);
useEffect(() => {
  if (!loading) {
    loadGlobalTeacherAvailability();
  }
}, [loading]);
function canAssignTeacherWithoutBurnout(
  teacherId: string,
  dayIndex: number,
  sessionIndex: number,
  maxConsecutive: number = maxConsecutiveSessions
): boolean {
  // Count consecutive sessions before this one
  let consecutiveBefore = 0;
  for (let s = sessionIndex - 1; s >= 0; s--) {
    const key = `${dayIndex}-${s + 1}`; // session is 1-based in storage
    const busyTeachers = globalTeacherSchedule.get(key);
    if (busyTeachers?.has(teacherId)) {
      consecutiveBefore++;
    } else {
      break; // No longer consecutive
    }
  }

  // Count consecutive sessions after this one
  let consecutiveAfter = 0;
  for (let s = sessionIndex + 1; s < sessionsPerDay; s++) {
    const key = `${dayIndex}-${s + 1}`; // session is 1-based
    const busyTeachers = globalTeacherSchedule.get(key);
    if (busyTeachers?.has(teacherId)) {
      consecutiveAfter++;
    } else {
      break;
    }
  }

  // Total consecutive would be: before + current (1) + after
  const totalConsecutive = consecutiveBefore + 1 + consecutiveAfter;

  return totalConsecutive <= maxConsecutive;
}
async function loadGlobalTeacherAvailability() {
  try {
    const schedules = await fetchJson<FetchedSchedule[]>("/api/schedules");
    const busyMap = new Map<string, Set<string>>();
    
    schedules.forEach(sch => {
      sch.items.forEach(it => {
        const key = `${it.dayIndex}-${it.session}`;
        if (!busyMap.has(key)) {
          busyMap.set(key, new Set());
        }
        busyMap.get(key)!.add(it.teacher.id);
      });
    });
    
    setGlobalTeacherSchedule(busyMap);
  } catch (e) {
    console.error("Failed to load teacher availability", e);
  }
}

  /* ---- Load base data ---- */
  useEffect(() => {
    (async () => {
      try {
        const [cls, subs, ts] = await Promise.all([
          fetchJson<Cls[]>("/api/classes"),
          fetchJson<Subj[]>("/api/subjects"),
          fetchJson<Teacher[]>("/api/admin/teachers"),
        ]);
        setClasses(cls);
        setSubjects(subs);
        setTeachers(ts);
      } catch (e) {
        console.error(e);
        alert("Failed to load schedule data");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  /* ---- Times ---- */
  const sessionGrid: SessionDef[] = useMemo(() => {
  // If using custom times, return manual times
  if (customSessionTimes && manualSessionTimes.length === sessionsPerDay) {
    return manualSessionTimes;
  }

  // Otherwise calculate automatically
  const arr: SessionDef[] = [];
  let cursor = dayStartTime;
  
  for (let i = 1; i <= sessionsPerDay; i++) {
    const end = addMinutes(cursor, sessionLengthMin);
    arr.push({ start: cursor, end });
    cursor = end;
    
    // Add first break
    if (breakAfterSession && i === breakAfterSession) {
      cursor = addMinutes(cursor, breakLengthMin);
    }
    
    // Add second break (NEW)
    if (secondBreakAfterSession && i === secondBreakAfterSession) {
      cursor = addMinutes(cursor, secondBreakLengthMin);
    }
  }
  
  return arr;
}, [
  dayStartTime, 
  sessionsPerDay, 
  sessionLengthMin, 
  breakAfterSession, 
  breakLengthMin, 
  secondBreakAfterSession, 
  secondBreakLengthMin, 
  customSessionTimes, 
  manualSessionTimes
]);


  useEffect(() => {
    if (sessionsPerDay) {
      setGenerated({
        Sunday: Array.from({ length: sessionsPerDay }, () => ({ subjectId: "" })),
        Monday: Array.from({ length: sessionsPerDay }, () => ({ subjectId: "" })),
        Tuesday: Array.from({ length: sessionsPerDay }, () => ({ subjectId: "" })),
        Wednesday: Array.from({ length: sessionsPerDay }, () => ({ subjectId: "" })),
        Thursday: Array.from({ length: sessionsPerDay }, () => ({ subjectId: "" })),
      });
    }
  }, [sessionsPerDay]);

  useEffect(() => { setSelections([]); setSavedScheduleId(null); }, [classId]);

  /* ---- Filters ---- */
  const classSubjects = useMemo(() => subjects, [subjects]);
  const classTeachers = useMemo(() => (!classId ? [] : teachers.filter(t => (t.classes ?? []).some(c => c.id === classId))), [teachers, classId]);
  const teachersBySubject = useMemo(() => {
    const map = new Map<string, Teacher[]>();
    for (const s of classSubjects) map.set(s.id, classTeachers.filter(t => (t.subjects ?? []).some(ss => ss.id === s.id)));
    return map;
  }, [classSubjects, classTeachers]);
// When switching to custom mode, initialize with current calculated times
useEffect(() => {
  if (customSessionTimes && manualSessionTimes.length === 0) {
    setManualSessionTimes(sessionGrid.map(s => ({ start: s.start, end: s.end })));
  }
}, [customSessionTimes]);

// Reset manual times when sessions per day changes
useEffect(() => {
  if (customSessionTimes) {
    setManualSessionTimes(sessionGrid.map(s => ({ start: s.start, end: s.end })));
  }
}, [sessionsPerDay]);

  /* ---- Selections ---- */
  function addSelection() { setSelections(prev => [...prev, { subjectId: "", weeklyCount: 1, teacherId: "" }]); }
  function removeSelection(idx: number) { setSelections(prev => prev.filter((_, i) => i !== idx)); }
  function updateSelection(idx: number, patch: Partial<Selection>) { setSelections(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s))); }

  /* ---- Generate constraints ---- */
  const totalWeeklySlots = sessionsPerDay * DAYS.length;
  const selectedWeeklySum = selections.reduce((a, s) => a + (s.weeklyCount || 0), 0);
  const selectionOk = selectedWeeklySum === totalWeeklySlots && !!classId && selections.length > 0;

function generateSchedule() {
  if (!classId) return alert("Please select a class.");
  if (!selections.length) return alert("Add at least one subject selection.");
  
  for (const sel of selections) {
    if (!sel.subjectId) return alert("Each row needs a subject.");
    if (!sel.teacherId) return alert("Each row needs a teacher.");
    if ((sel.weeklyCount || 0) <= 0) return alert("Weekly sessions must be > 0.");
  }
  
  if (selectedWeeklySum !== totalWeeklySlots) {
    return alert(`Total weekly sessions must equal ${totalWeeklySlots}, but got ${selectedWeeklySum}.`);
  }

  const remaining: Record<string, { left: number; teacherId: string }> = {};
  for (const sel of selections) {
    remaining[sel.subjectId] = { left: sel.weeklyCount, teacherId: sel.teacherId };
  }

  const grid: Record<DayKey, PlacedCell[]> = {
    Sunday: Array.from({ length: sessionsPerDay }, () => ({ subjectId: "" })),
    Monday: Array.from({ length: sessionsPerDay }, () => ({ subjectId: "" })),
    Tuesday: Array.from({ length: sessionsPerDay }, () => ({ subjectId: "" })),
    Wednesday: Array.from({ length: sessionsPerDay }, () => ({ subjectId: "" })),
    Thursday: Array.from({ length: sessionsPerDay }, () => ({ subjectId: "" })),
  };

  const usedTeacherBySession = new Map<number, Set<string>>();
  for (let i = 0; i < sessionsPerDay; i++) {
    usedTeacherBySession.set(i, new Set());
  }

  function isTeacherAvailableGlobally(teacherId: string, dayIndex: number, session: number): boolean {
    const key = `${dayIndex}-${session}`;
    const busyTeachers = globalTeacherSchedule.get(key);
    return !busyTeachers || !busyTeachers.has(teacherId);
  }

  // Daily presence pass
  for (let d = 0; d < 5; d++) {
    const day = DAYS[d];
    const dayPlaced = new Set<string>();
    let lastSubj = "";
    
    for (const subjId of Object.keys(remaining)) {
      if (remaining[subjId].left <= 0) continue;
      let placed = false;
      
      for (let sIdx = 0; sIdx < sessionsPerDay; sIdx++) {
        if (grid[day][sIdx].subjectId) continue;
        
        const teacherId = remaining[subjId].teacherId;
        const teacherFreeLocally = !usedTeacherBySession.get(sIdx)!.has(teacherId);
        const teacherFreeGlobally = isTeacherAvailableGlobally(teacherId, d, sIdx + 1);
        const okConsecutive = canAssignTeacherWithoutBurnout(teacherId, d, sIdx); // ✅ NEW
        const english = isEnglishByName(subjId, subjects);
        const duplicateToday = dayPlaced.has(subjId);
        const okNoDup = english || !duplicateToday;
        const okNoImmediateRepeat = lastSubj !== subjId;
        
        if (okNoDup && okNoImmediateRepeat && teacherFreeLocally && teacherFreeGlobally && okConsecutive) { // ✅ ADDED
          grid[day][sIdx] = { subjectId: subjId, teacherId };
          remaining[subjId].left--;
          dayPlaced.add(subjId);
          usedTeacherBySession.get(sIdx)!.add(teacherId);
          lastSubj = subjId;
          placed = true;
          break;
        }
      }
      
      if (!placed) {
        for (let sIdx = 0; sIdx < sessionsPerDay; sIdx++) {
          if (grid[day][sIdx].subjectId) continue;
          const english = isEnglishByName(subjId, subjects);
          if (!english && dayPlaced.has(subjId)) continue;
          if (lastSubj === subjId) continue;
          
          const teacherId = remaining[subjId].teacherId;
          const teacherFreeGlobally = isTeacherAvailableGlobally(teacherId, d, sIdx + 1);
          const okConsecutive = canAssignTeacherWithoutBurnout(teacherId, d, sIdx); // ✅ NEW
          
          if (teacherFreeGlobally && okConsecutive) { // ✅ ADDED
            grid[day][sIdx] = { subjectId: subjId, teacherId };
            remaining[subjId].left--;
            dayPlaced.add(subjId);
            usedTeacherBySession.get(sIdx)!.add(teacherId);
            lastSubj = subjId;
            break;
          }
        }
      }
    }
  }

  // Distribute remaining
  const bag: Array<{ subjectId: string; teacherId: string }> = [];
  for (const [sid, info] of Object.entries(remaining)) {
    for (let i = 0; i < info.left; i++) {
      bag.push({ subjectId: sid, teacherId: info.teacherId });
    }
  }
  
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }

  for (let d = 0; d < 5; d++) {
    const day = DAYS[d];
    const dayPlaced = new Set<string>(grid[day].filter(c => c.subjectId).map(c => c.subjectId!));
    let lastSubj = grid[day].find(c => c.subjectId)?.subjectId ?? "";
    
    for (let sIdx = 0; sIdx < sessionsPerDay; sIdx++) {
      if (grid[day][sIdx].subjectId) {
        lastSubj = grid[day][sIdx].subjectId!;
        continue;
      }
      
      let placed = false;
      for (let k = 0; k < bag.length; k++) {
        const { subjectId, teacherId } = bag[k];
        const english = isEnglishByName(subjectId, subjects);
        const okNoDup = english || !dayPlaced.has(subjectId);
        const okNoImmediateRepeat = lastSubj !== subjectId;
        const okTeacherLocal = !usedTeacherBySession.get(sIdx)!.has(teacherId);
        const okTeacherGlobal = isTeacherAvailableGlobally(teacherId, d, sIdx + 1);
        const okConsecutive = canAssignTeacherWithoutBurnout(teacherId, d, sIdx); // ✅ NEW
        
        if (okNoDup && okNoImmediateRepeat && okTeacherLocal && okTeacherGlobal && okConsecutive) { // ✅ ADDED
          grid[day][sIdx] = { subjectId, teacherId };
          dayPlaced.add(subjectId);
          usedTeacherBySession.get(sIdx)!.add(teacherId);
          lastSubj = subjectId;
          bag.splice(k, 1);
          placed = true;
          break;
        }
      }
      
      if (!placed && bag.length) {
        for (let k = 0; k < bag.length; k++) {
          const { subjectId, teacherId } = bag[k];
          const english = isEnglishByName(subjectId, subjects);
          if ((!english && dayPlaced.has(subjectId)) || lastSubj === subjectId) continue;
          
          const okTeacherGlobal = isTeacherAvailableGlobally(teacherId, d, sIdx + 1);
          const okConsecutive = canAssignTeacherWithoutBurnout(teacherId, d, sIdx); // ✅ NEW
          
          if (!okTeacherGlobal || !okConsecutive) continue; // ✅ ADDED
          
          grid[day][sIdx] = { subjectId, teacherId };
          dayPlaced.add(subjectId);
          usedTeacherBySession.get(sIdx)!.add(teacherId);
          lastSubj = subjectId;
          bag.splice(k, 1);
          placed = true;
          break;
        }
      }
      
      if (!placed && bag.length) {
        const { subjectId, teacherId } = bag[0];
        const okTeacherGlobal = isTeacherAvailableGlobally(teacherId, d, sIdx + 1);
        const okConsecutive = canAssignTeacherWithoutBurnout(teacherId, d, sIdx); // ✅ NEW
        
        if (okTeacherGlobal && okConsecutive) { // ✅ ADDED
          bag.shift();
          grid[day][sIdx] = { subjectId, teacherId };
          dayPlaced.add(subjectId);
          usedTeacherBySession.get(sIdx)!.add(teacherId);
          lastSubj = subjectId;
        }
      }
    }
  }
  
  if (bag.length) {
    return alert(
      `Could not place all sessions under constraints.\n` +
      `${bag.length} sessions remaining.\n` +
      `Possible reasons: teacher conflicts, consecutive session limits, or duplicate prevention.\n` +
      `Try adjusting teachers, session counts, or relaxing constraints.`
    );
  }
  
  setGenerated(grid);
  setSelections([]);
  setSavedScheduleId(null);
}



  /* ---- Export / Print ---- */
  function exportCsv() {
    const rows: string[][] = [["Day","Session","Start","End","Subject","Teacher"]];
    for (const d of DAYS) {
      for (let i = 0; i < sessionsPerDay; i++) {
        const sess = sessionGrid[i];
        const cell = generated[d][i];
        const subjName = subjects.find(s => s.id === cell?.subjectId)?.name ?? "";
        const teacherName = teachers.find(t => t.id === cell?.teacherId)?.name ?? "";
        rows.push([d, String(i+1), sess.start, sess.end, subjName, teacherName]);
        if (breakAfterSession === i+1) rows.push([d, "Break", sess.end, addMinutes(sess.end, breakLengthMin), "Break", ""]);
      }
    }
    const csv = rows.map(r => r.map(v => `"${(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const clsName = classes.find(c => c.id === classId)?.name ?? "Class";
    a.download = `${clsName}-schedule.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function printTable() { window.print(); }

  /* ---- Records / Save ---- */
  const flatRecords = useMemo(() => {
    const rows: Array<{ dayIndex: number; session: number; start: string; end: string; subjectId: string; teacherId: string }> = [];
    for (let d = 0; d < 5; d++) {
      const day = DAYS[d];
      for (let s = 0; s < sessionsPerDay; s++) {
        const cell = generated[day][s];
        if (!cell?.subjectId) continue;
        rows.push({ dayIndex: d, session: s + 1, start: sessionGrid[s].start, end: sessionGrid[s].end, subjectId: cell.subjectId, teacherId: cell.teacherId || "" });
      }
    }
    return rows;
  }, [generated, sessionsPerDay, sessionGrid]);

  async function saveSchedule() {
  if (!classId) return alert("Class is required.");
  if (!flatRecords.length) return alert("Nothing to save.");
  
  const payload = {
    classId,
    name: `${classes.find(c => c.id === classId)?.name || "Class"} - ${new Date().toLocaleDateString()}`,
    items: flatRecords,
  };
  
  const res = await fetch("/api/schedules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return alert(err?.error || "Failed to save schedule");
  }
  
  const saved = await res.json();
  setSavedScheduleId(saved.id);
  
  // ✅ Refresh global teacher availability after saving
  await loadGlobalTeacherAvailability();
  
  alert("Schedule saved successfully!");
}


  /* ---- Edit cell ---- */
  function startEdit(dayIndex: number, sessionIdx: number) { setEditCell({ dayIndex, sessionIdx }); }
  function applyEdit(subjectId: string, teacherId: string) {
    if (!editCell) return;
    const dayKey = DAYS[editCell.dayIndex];
    setGenerated(prev => {
      const next = { ...prev };
      const row = [...next[dayKey]];
      row[editCell.sessionIdx] = { subjectId, teacherId };
      next[dayKey] = row;
      return next;
    });
    setEditCell(null);
  }

  /* ---- Teachers view (all classes) ---- */
  async function fetchAllTeachersSchedules() {
    try {
      setLoadingRemote(true);
      const data = await fetchJson<FetchedSchedule[]>("/api/schedules");
      const tmap = new Map<string, Array<{
        classId: string;
        className: string;
        dayIndex: number;
        session: number;
        start: string;
        end: string;
        subjectId: string;
        subjectName: string;
      }>>();
      data.forEach(sch => {
        const className = sch.class?.name || classes.find(c => c.id === sch.classId)?.name || "";
        sch.items.forEach(it => {
          const tid = (it.teacher as any)?.id;
          if (!tid) return;
          const arr = tmap.get(tid) ?? [];
          arr.push({
            classId: sch.classId, className,
            dayIndex: it.dayIndex, session: it.session ?? 1,
            start: it.start, end: it.end,
            subjectId: it.subject?.id || "", subjectName: it.subject?.name || "",
          });
          tmap.set(tid, arr);
        });
      });
      setAllTeacherMap(tmap);
      if (!teacherFilterId) {
        const first = [...tmap.keys()][0];
        if (first) setTeacherFilterId(first);
      }
    } catch (e:any) {
      alert(e?.message || "Failed to fetch all teacher schedules");
    } finally {
      setLoadingRemote(false);
    }
  }

  function getDayIndexFromDate(isoDate: string): number {
    const d = new Date(isoDate + "T00:00:00");
    return d.getDay(); // 0..6
  }
  function countWeeklyLoadForTeacher(tid: string): number {
    return (allTeacherMap.get(tid) ?? []).length;
  }
  function teacherBusyAt(tid: string, dayIndex: number, session: number): boolean {
    return (allTeacherMap.get(tid) ?? []).some(i => i.dayIndex === dayIndex && i.session === session);
  }

  async function fetchSubsThisWeek(): Promise<Map<string, number>> {
    try {
      const res = await fetch("/api/substitutions?scope=week");
      if (!res.ok) return new Map();
      const data: Array<{ replacementId: string }> = await res.json();
      const m = new Map<string, number>();
      data.forEach(row => m.set(row.replacementId, (m.get(row.replacementId) ?? 0) + 1));
      return m;
    } catch { return new Map(); }
  }

  async function generateSubstitutions() {
    if (!absentTeacherId) return alert("Select absent teacher.");
    if (!subsDate) return alert("Select a date.");
    const dayIndex = getDayIndexFromDate(subsDate);
    if (dayIndex < 0 || dayIndex > 6) return alert("Invalid date.");
    if (allTeacherMap.size === 0) await fetchAllTeachersSchedules();
    const subsCountMap = await fetchSubsThisWeek();
    subsWeekMapRef.current = subsCountMap;

    const absentItems = (allTeacherMap.get(absentTeacherId) ?? []).filter(i => i.dayIndex === dayIndex);
    if (!absentItems.length) { setSubsRows([]); return alert("No scheduled classes for the absent teacher on this date."); }

    const rows: SubRow[] = [];
    for (const it of absentItems) {
      type Cand = { id: string; name: string; load: number; subs: number; normal: number; phone?: string; optIn?: boolean };
      const candidates: Cand[] = [];
      for (const t of teachers) {
        if (t.id === absentTeacherId) continue;
        if (teacherBusyAt(t.id, it.dayIndex, it.session)) continue;
        const load = countWeeklyLoadForTeacher(t.id);
        if (load >= 24) continue;
        const subs = subsCountMap.get(t.id) ?? 0;
        const normal = load;
        const w = whatsMap.get(t.id);
        candidates.push({ id: t.id, name: t.name, load, subs, normal, phone: w?.phone, optIn: w?.optIn });
      }
      candidates.sort((a, b) => a.load - b.load || a.subs - b.subs || a.name.localeCompare(b.name));
      const pick = candidates[0]?.id ?? "";
      rows.push({
        dayIndex: it.dayIndex, session: it.session, start: it.start, end: it.end,
        classId: it.classId, className: it.className,
        subjectId: it.subjectId, subjectName: it.subjectName,
        absentTeacherId, replacementId: pick,
        candidates: candidates.map(c => ({ id: c.id, name: `${c.name} · load:${c.load} · subs:${c.subs} · normal:${c.normal}` })),
      });
    }
    setSubsRows(rows);
  }

  function importWhatsCsv(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const lines = text.split(/\r?\n/).filter(Boolean);
        const header = lines.shift()!;
        const cols = header.split(",").map(s => s.trim());
        const idxId = cols.indexOf("teacher_id");
        const idxPhone = cols.indexOf("phone_e164");
        const idxOpt = cols.indexOf("whatsapp_opt_in");
        if (idxId < 0 || idxPhone < 0 || idxOpt < 0) {
          alert("CSV must contain teacher_id, phone_e164, whatsapp_opt_in headers.");
          return;
        }
        const map = new Map<string, { phone: string; optIn: boolean }>();
        for (const line of lines) {
          const parts = line.split(",");
          const id = (parts[idxId] || "").trim();
          const phone = (parts[idxPhone] || "").trim();
          const optIn = ((parts[idxOpt] || "").trim().toLowerCase()) === "true";
          if (id && phone) map.set(id, { phone, optIn });
        }
        setWhatsMap(map);
        alert(`Imported ${map.size} WhatsApp contacts.`);
      } catch (e:any) {
        alert(e?.message || "Failed to parse CSV.");
      }
    };
    reader.readAsText(file);
  }

  async function fetchSubsForDate(isoDate: string) {
    try {
      setLoadingTodaySubs(true);
      const res = await fetch(`/api/substitutions?date=${encodeURIComponent(isoDate)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to fetch substitutions");
      }
      const data: SavedSub[] = await res.json();
      setTodaySubs(data.sort((a, b) => a.session - b.session));
    } catch (e:any) {
      alert(e?.message || "Failed to load substitutions");
    } finally {
      setLoadingTodaySubs(false);
    }
  }

  useEffect(() => { if (showSubs) fetchSubsForDate(subsDate); }, [showSubs]);
  useEffect(() => { if (showSubs) fetchSubsForDate(subsDate); }, [subsDate]);

  /* ========= Render ========= */
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#f1fbf9] to-[#eaf7f5] p-6">
      <div className="mx-auto mb-6 h-1 w-full max-w-7xl rounded-full bg-[#006d77]" />
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold tracking-tight text-[#064e4f]">Auto Schedule Builder</h1>
        <p className="text-sm text-gray-600">Unified timetables, teachers view, and substitutions with WhatsApp notifications.</p>

        {loading ? (
          <div className="mt-6 animate-pulse rounded-xl border border-gray-100 bg-white p-6">
            <div className="h-6 w-40 rounded bg-gray-200" />
            <div className="mt-3 h-40 w-full rounded bg-gray-200" />
          </div>
        ) : (
          <>
            {/* Inputs */}
            <div className="mt-6 rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
  <div className="mb-4 flex items-center justify-between">
    <h2 className="text-xl font-semibold text-[#064e4f]">Schedule Configuration</h2>
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={customSessionTimes}
        onChange={e => setCustomSessionTimes(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-[#006d77] focus:ring-[#83c5be]"
      />
      <span className="font-medium text-gray-700">Custom session times</span>
    </label>
  </div>

  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">Class</label>
      <select 
        value={classId} 
        onChange={(e) => setClassId(e.target.value)} 
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
      >
        <option value="">Select Class</option>
        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">Sessions per day</label>
      <input 
        type="number" 
        min={1} 
        max={10} 
        value={sessionsPerDay} 
        onChange={e => setSessionsPerDay(parseInt(e.target.value || "1", 10))} 
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]" 
      />
      <p className="mt-1 text-xs text-gray-500">Weekly slots = {sessionsPerDay} × 5</p>
    </div>

    {!customSessionTimes && (
      <>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Day start time</label>
          <input 
            type="time" 
            value={dayStartTime} 
            onChange={e => setDayStartTime(e.target.value)} 
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]" 
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Session length (min)</label>
          <input 
            type="number" 
            min={20} 
            max={120} 
            value={sessionLengthMin} 
            onChange={e => setSessionLengthMin(parseInt(e.target.value || "45", 10))} 
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]" 
          />
        </div>
      </>
    )}

    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">First break after session</label>
      <select 
        value={breakAfterSession ?? ""} 
        onChange={e => setBreakAfterSession(e.target.value ? parseInt(e.target.value, 10) : null)} 
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
      >
        <option value="">No break</option>
        {Array.from({ length: sessionsPerDay }, (_, i) => (
          <option key={i+1} value={i+1}>After session {i+1}</option>
        ))}
      </select>
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">First break length (min)</label>
      <input 
        type="number" 
        min={5} 
        max={60} 
        value={breakLengthMin} 
        onChange={e => setBreakLengthMin(parseInt(e.target.value || "20", 10))} 
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]" 
      />
    </div>

    {/* NEW: Second Break Controls */}
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">Second break after session</label>
      <select 
        value={secondBreakAfterSession ?? ""} 
        onChange={e => setSecondBreakAfterSession(e.target.value ? parseInt(e.target.value, 10) : null)} 
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
      >
        <option value="">No second break</option>
        {Array.from({ length: sessionsPerDay }, (_, i) => (
          <option key={i+1} value={i+1} disabled={breakAfterSession === i+1}>
            After session {i+1}
          </option>
        ))}
      </select>
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">Second break length (min)</label>
      <input 
        type="number" 
        min={5} 
        max={60} 
        value={secondBreakLengthMin} 
        onChange={e => setSecondBreakLengthMin(parseInt(e.target.value || "20", 10))} 
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]" 
      />
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Max consecutive sessions per teacher
      </label>
      <input 
        type="number" 
        min={1} 
        max={6} 
        value={maxConsecutiveSessions} 
        onChange={e => setMaxConsecutiveSessions(parseInt(e.target.value || "2", 10))} 
        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]" 
      />
      <p className="mt-1 text-xs text-gray-500">Prevent teacher burnout</p>
    </div>
  </div>

  {/* NEW: Custom Session Times Editor */}
  {customSessionTimes && (
    <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">Custom Session Times</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: sessionsPerDay }, (_, i) => (
          <div key={i} className="rounded-md border border-gray-300 bg-white p-3">
            <div className="mb-2 text-xs font-medium text-gray-600">Session {i + 1}</div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={manualSessionTimes[i]?.start || "07:00"}
                onChange={e => {
                  const updated = [...manualSessionTimes];
                  if (!updated[i]) updated[i] = { start: "07:00", end: "07:45" };
                  updated[i].start = e.target.value;
                  setManualSessionTimes(updated);
                }}
                className="w-24 rounded border border-gray-300 px-2 py-1 text-xs focus:border-[#83c5be] focus:ring-1 focus:ring-[#83c5be]"
              />
              <span className="text-gray-400">–</span>
              <input
                type="time"
                value={manualSessionTimes[i]?.end || "07:45"}
                onChange={e => {
                  const updated = [...manualSessionTimes];
                  if (!updated[i]) updated[i] = { start: "07:00", end: "07:45" };
                  updated[i].end = e.target.value;
                  setManualSessionTimes(updated);
                }}
                className="w-24 rounded border border-gray-300 px-2 py-1 text-xs focus:border-[#83c5be] focus:ring-1 focus:ring-[#83c5be]"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )}
</div>


            {/* Selections */}
            <div className="mt-6 rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
              <h2 className="mb-3 text-xl font-semibold text-[#064e4f]">Subject selections</h2>
              <p className="mb-4 text-xs text-gray-600">Every selected subject will be taught each day. English may appear multiple times per day.</p>
              <div className="space-y-3">
                {selections.map((sel, idx) => {
                  const subjTeachers = sel.subjectId ? (teachersBySubject.get(sel.subjectId) ?? []) : classTeachers;
                  return (
                    <div key={idx} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-3 sm:grid-cols-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Subject</label>
                        <select
                          value={sel.subjectId}
                          onChange={e => {
                            const subjectId = e.target.value;
                            const firstTeacher = (teachersBySubject.get(subjectId) ?? [])[0]?.id ?? "";
                            updateSelection(idx, { subjectId, teacherId: firstTeacher });
                          }}
                          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                        >
                          <option value="">Select subject</option>
                          {classSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Weekly sessions</label>
                        <input type="number" min={1} value={sel.weeklyCount} onChange={e => updateSelection(idx, { weeklyCount: Math.max(1, parseInt(e.target.value || "1", 10)) })} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">Teacher</label>
                        <select value={sel.teacherId} onChange={e => updateSelection(idx, { teacherId: e.target.value })} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]">
                          <option value="">Select teacher</option>
                          {subjTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button onClick={() => removeSelection(idx)} className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">Remove</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-sm text-gray-700">Selected sessions: {selectedWeeklySum} / {totalWeeklySlots}</div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={addSelection} className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50">Add subject</button>
                  <button onClick={generateSchedule} disabled={!selectionOk} className="rounded-lg bg-[#006d77] px-4 py-2.5 text-sm font-medium text-white shadow-sm ring-1 ring-[#006d77]/20 transition enabled:hover:bg-[#006d77]/90 disabled:cursor-not-allowed disabled:opacity-60">Generate schedule</button>
                  <button onClick={() => setShowSubs(true)} className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50">Add Substitution</button>
                </div>
              </div>
            </div>

            {/* Class timetable */}
            <div className="mt-6">
              <Timetable
                title={`${classes.find(c => c.id === classId)?.name || "Class"} timetable`}
                sessionTimes={sessionGrid}
                grid={(() => {
                  const out: CellView[][] = Array.from({ length: 5 }, () => Array.from({ length: sessionsPerDay }, () => []));
                  for (let d = 0; d < 5; d++) {
                    const day = DAYS[d];
                    for (let s = 0; s < sessionsPerDay; s++) {
                      const cell = generated[day][s];
                      if (!cell?.subjectId) continue;
                      out[d][s].push({
                        subject: subjects.find(x => x.id === cell.subjectId)?.name,
                        teacher: teachers.find(t => t.id === cell.teacherId)?.name,
                      });
                    }
                  }
                  return out;
                })()}
                showBreakAt={breakAfterSession ?? null}
                breakLengthMin={breakLengthMin}
              />
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={printTable} className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-800 shadow-sm transition hover:bg-gray-50">Print</button>
              <button onClick={exportCsv} className="rounded-lg bg-[#e29578] px-4 py-2.5 font-medium text-white shadow-sm ring-1 ring-[#e29578]/20 transition hover:bg-[#e29578]/90">Export CSV</button>
              <button onClick={saveSchedule} className="rounded-lg bg-[#006d77] px-4 py-2.5 font-medium text-white shadow-sm ring-1 ring-[#006d77]/20 transition hover:bg-[#006d77]/90">Save schedule</button>
              <button onClick={() => setShowRecords(true)} className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-800 shadow-sm transition hover:bg-gray-50">Show records</button>
              <button onClick={() => setShowTeachersView(true)} className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-800 shadow-sm transition hover:bg-gray-50">Show teachers schedule</button>
            </div>

            {/* Records viewer */}
            {showRecords && (
              <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[#064e4f]">Schedule records</h3>
                  <button onClick={() => setShowRecords(false)} className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm">Close</button>
                </div>
                <div className="mb-3 flex gap-3">
                  <select value={filterClassId} onChange={(e) => setFilterClassId(e.target.value)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">
                    <option value="">All classes</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button
                    onClick={async () => {
                      try {
                        setLoadingRemote(true);
                        const url = filterClassId ? `/api/schedules?classId=${filterClassId}` : `/api/schedules`;
                        const data = await fetchJson<FetchedSchedule[]>(url);
                        setRemoteSchedules(data);
                      } catch (e:any) {
                        alert(e?.message || "Failed to fetch schedules");
                      } finally {
                        setLoadingRemote(false);
                      }
                    }}
                    className="rounded-md bg-[#006d77] px-3 py-1.5 text-sm text-white"
                  >
                    Fetch from DB
                  </button>
                </div>
                {loadingRemote && <div className="text-sm text-gray-600">Loading schedules...</div>}
               {!loadingRemote && remoteSchedules.length > 0 && (
  <div className="mt-6 space-y-6">
    {remoteSchedules.map((sch) => {
      const maxSession = Math.max(...sch.items.map(it => it.session || 0), sessionsPerDay);
      const sessionTimes = Array.from({ length: maxSession }, (_, i) => {
        let start = sessionGrid[i]?.start ?? ""; 
        let end = sessionGrid[i]?.end ?? "";
        for (let d = 0; d < 5 && (!start || !end); d++) {
          const hit = sch.items.find(it => it.dayIndex === d && (it.session ?? 1) === i+1 && it.start && it.end);
          if (hit) { start = hit.start; end = hit.end; }
        }
        return { start, end };
      });
      
      const grid: TeacherCell[][][] = Array.from({ length: 5 }, () => 
        Array.from({ length: maxSession }, () => [])
      );
      
      sch.items.forEach(it => {
        const d = it.dayIndex; 
        const sIdx = (it.session ?? 1) - 1;
        
        if (d >= 0 && d < 5 && sIdx >= 0 && sIdx < maxSession) {
          grid[d][sIdx].push({ 
            subjectName: it.subject?.name || "",  // ✅ Fixed
            className: it.teacher?.name || "",     // ✅ Fixed (shows teacher name in class field)
            start: it.start, 
            end: it.end 
          });
        }
      });
      
      return (
        <TimetableTeachers
          key={sch.id}
          title={`${sch.name || "Schedule"} - ${sch.class?.name || classes.find(c => c.id === sch.classId)?.name || sch.classId}`}
          sessionTimes={sessionTimes}
          grid={grid}
          showBreakAt={breakAfterSession ?? null}
          breakLengthMin={breakLengthMin}
        />
      );
    })}
  </div>
)}

              </div>
            )}

            {/* Teachers schedule viewer (all classes) */}
            {showTeachersView && (
  <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-lg ring-1 ring-gray-100">
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <h3 className="text-xl font-semibold text-[#064e4f]">Teachers Schedule (All Classes)</h3>
      <button 
        onClick={fetchAllTeachersSchedules} 
        className="rounded-lg bg-[#006d77] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#00525d] focus:outline-none focus:ring-2 focus:ring-[#006d77] focus:ring-offset-2"
      >
        Fetch All Schedules
      </button>
      <select 
        value={teacherFilterId} 
        onChange={(e) => setTeacherFilterId(e.target.value)} 
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-[#83c5be] focus:outline-none focus:ring-2 focus:ring-[#83c5be]"
      >
        <option value="">Select teacher</option>
        {[...allTeacherMap.keys()].map(tid => {
          const t = teachers.find(x => x.id === tid);
          return <option key={tid} value={tid}>{t?.name || tid}</option>;
        })}
      </select>
      <button 
        onClick={() => setShowTeachersView(false)} 
        className="ml-auto rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
      >
        Close
      </button>
    </div>

    {loadingRemote && (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-[#006d77] border-t-transparent"></div>
          <div className="text-sm text-gray-600">Loading schedules...</div>
        </div>
      </div>
    )}

   {!loadingRemote && teacherFilterId && allTeacherMap.has(teacherFilterId) && (() => {
    
  const items = allTeacherMap.get(teacherFilterId)!;
  console.log("Teacher items:", items);
  const maxSession = Math.max(...items.map(i => i.session || 1));
  
  // Build session times
  const sessionTimes = Array.from({ length: maxSession }, (_, i) => {
    let start = sessionGrid[i]?.start ?? "";
    let end = sessionGrid[i]?.end ?? "";
    for (let d = 0; d < 5 && (!start || !end); d++) {
      const hit = items.find(it => it.dayIndex === d && (it.session ?? 1) === i + 1 && it.start && it.end);
      if (hit) { start = hit.start; end = hit.end; }
    }
    return { start, end };
  });

  // ✅ CORRECT TYPE: TeacherCell[][][] not CellView[][]
  const grid: TeacherCell[][][] = Array.from({ length: 5 }, () =>
    Array.from({ length: maxSession }, () => [])
  );
  
  items.forEach(it => {
    const d = it.dayIndex;
    const sIdx = (it.session ?? 1) - 1;
    console.log(`Placing class ${it.className} at day=${d}, session=${sIdx}, grid[${d}][${sIdx}]`);

    if (d >= 0 && d < 5 && sIdx >= 0 && sIdx < maxSession) {
      grid[d][sIdx].push({
        subjectName: it.subjectName,
        className: it.className,
        start: it.start,
        end: it.end,
      });
    }
  });
console.log("Built grid:", grid);
  console.log("Sample grid[0][0]:", grid[0][0]);
  const t = teachers.find(x => x.id === teacherFilterId);
      
      // Calculate summary by class
      const byClass = new Map<string, number>();
      items.forEach(it => {
        const key = it.className || it.classId;
        byClass.set(key, (byClass.get(key) ?? 0) + 1);
      });

      const totalSessions = items.length;

      return (
        <div className="space-y-4">
          <TimetableTeachers
            title={`Teacher: ${t?.name || teacherFilterId}`}
            sessionTimes={sessionTimes}
            grid={grid}
            showBreakAt={breakAfterSession ?? null}
            breakLengthMin={breakLengthMin}
          />

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Total Load Card */}
            <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-[#006d77]/5 to-[#83c5be]/5 p-4">
              <div className="mb-1 text-sm font-medium text-gray-600">Total Weekly Load</div>
              <div className="text-3xl font-bold text-[#006d77]">{totalSessions}</div>
              <div className="text-xs text-gray-500">sessions per week</div>
            </div>

            {/* Classes Count Card */}
            <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-[#2a9d8f]/5 to-[#264653]/5 p-4">
              <div className="mb-1 text-sm font-medium text-gray-600">Classes Teaching</div>
              <div className="text-3xl font-bold text-[#2a9d8f]">{byClass.size}</div>
              <div className="text-xs text-gray-500">different classes</div>
            </div>
          </div>

          {/* Breakdown by Class */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-semibold text-[#064e4f]">Sessions by Class</div>
              <div className="text-xs text-gray-500">{byClass.size} classes total</div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[...byClass.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([cls, cnt]) => (
                  <div
                    key={cls}
                    className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <span className="font-medium text-gray-900">{cls}</span>
                    <span className="rounded-full bg-[#006d77] px-2 py-0.5 text-xs font-semibold text-white">
                      {cnt}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      );
    })()}

    {!loadingRemote && !teacherFilterId && (
      <div className="py-12 text-center text-sm text-gray-500">
        Select a teacher to view their schedule
      </div>
    )}

    {!loadingRemote && teacherFilterId && !allTeacherMap.has(teacherFilterId) && (
      <div className="py-12 text-center text-sm text-gray-500">
        No schedule found for selected teacher
      </div>
    )}
  </div>
)}


            {/* Substitutions panel */}
            {showSubs && (
              <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[#064e4f]">Substitutions</h3>
                  <div className="flex items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-gray-600">
                      <span>WhatsApp CSV</span>
                      <input type="file" accept=".csv,text/csv" onChange={e => { const f = e.target.files?.[0]; if (f) importWhatsCsv(f); }} className="hidden" />
                      <span className="rounded border border-gray-300 bg-white px-2 py-1">Import</span>
                    </label>
                    <button onClick={() => setShowSubs(false)} className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm">Close</button>
                  </div>
                </div>
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Absent teacher</label>
                    <select value={absentTeacherId} onChange={e => setAbsentTeacherId(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                      <option value="">Select teacher</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
                    <input type="date" value={subsDate} onChange={e => setSubsDate(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={async () => { if (allTeacherMap.size === 0) await fetchAllTeachersSchedules(); await generateSubstitutions(); }}
                      className="w-full rounded-md bg-[#006d77] px-4 py-2.5 text-sm font-medium text-white"
                    >
                      Generate substitutions
                    </button>
                  </div>
                </div>

                {/* Generated rows */}
                {subsRows.length > 0 && (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full table-auto text-sm">
                        <thead className="bg-[#006d77] text-white">
                          <tr>
                            <th className="px-3 py-2 text-left">Day</th>
                            <th className="px-3 py-2 text-left">Session</th>
                            <th className="px-3 py-2 text-left">Time</th>
                            <th className="px-3 py-2 text-left">Class</th>
                            <th className="px-3 py-2 text-left">Subject</th>
                            <th className="px-3 py-2 text-left">Absent</th>
                            <th className="px-3 py-2 text-left">Replacement</th>
                            <th className="px-3 py-2 text-left">Weekly load</th>
                            <th className="px-3 py-2 text-left">Subs this week</th>
                            <th className="px-3 py-2 text-left">Normal sessions</th>
                            <th className="px-3 py-2 text-left">Notify</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {subsRows.sort((a,b) => a.dayIndex - b.dayIndex || a.session - b.session).map((r, i) => {
                            const repId = r.replacementId;
                            const load = repId ? countWeeklyLoadForTeacher(repId) : 0;
                            const subsCount = repId ? (subsWeekMapRef.current.get(repId) ?? 0) : 0;
                            const normal = load;
                            const rep = repId ? teachers.find(x => x.id === repId) : undefined;
                            const absentName = teachers.find(x => x.id === r.absentTeacherId)?.name || "-";
                            const clsName = r.className;
                            const subjName = r.subjectName || "-";
                            const w = repId ? whatsMap.get(repId) : undefined;
                            const msg = encodeURIComponent(
`Substitution notice:
Date: ${subsDate} (${DAYS[r.dayIndex]})
Session: ${r.session} (${r.start}-${r.end})
Class: ${clsName}
Subject: ${subjName}
Absent: ${absentName}
Assigned to: ${rep?.name || "-"}
Please confirm.`);
                            const href = w?.phone && w?.optIn ? `https://wa.me/${w.phone.replace(/\D/g,"")}?text=${msg}` : `https://wa.me/?text=${msg}`;
                            const disabled = !w?.phone || !w?.optIn;

                            return (
                              <tr key={`${r.dayIndex}-${r.session}-${i}`} className="even:bg-gray-50">
                                <td className="px-3 py-2">{DAYS[r.dayIndex]}</td>
                                <td className="px-3 py-2">Session {r.session}</td>
                                <td className="px-3 py-2">{r.start}-{r.end}</td>
                                <td className="px-3 py-2">{clsName}</td>
                                <td className="px-3 py-2">{subjName}</td>
                                <td className="px-3 py-2">{absentName}</td>
                                <td className="px-3 py-2">
                                  <select value={r.replacementId} onChange={e => setSubsRows(prev => prev.map((x, idx) => idx === i ? { ...x, replacementId: e.target.value } : x))} className="w-56 rounded-md border border-gray-300 px-2 py-1">
                                    <option value="">Select replacement</option>
                                    {r.candidates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                  </select>
                                </td>
                                <td className="px-3 py-2">{load}</td>
                                <td className="px-3 py-2">{subsCount}</td>
                                <td className="px-3 py-2">{normal}</td>
                                <td className="px-3 py-2">
                                  <a target="_blank" rel="noreferrer" href={href} className={`rounded-md border px-2 py-1 text-xs ${disabled ? "cursor-not-allowed border-gray-200 text-gray-300" : "border-gray-300 bg-white"}`}
                                     onClick={e => { if (disabled) { e.preventDefault(); alert("No WhatsApp number/opt-in for this teacher or not imported."); } }}>
                                    WhatsApp
                                  </a>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <button
                        disabled={savingSubs}
                        onClick={async () => {
                          try {
                            setSavingSubs(true);
                            const payload = {
                              date: subsDate,
                              rows: subsRows
                                .filter(r => r.replacementId)
                                .map(r => ({
                                  dayIndex: r.dayIndex,
                                  session: r.session,
                                  start: r.start,
                                  end: r.end,
                                  classId: r.classId,
                                  subjectId: r.subjectId,
                                  absentTeacherId: r.absentTeacherId,
                                  replacementId: r.replacementId,
                                })),
                            };
                            const res = await fetch("/api/substitutions", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(payload),
                            });
                            if (!res.ok) {
                              const err = await res.json().catch(() => ({}));
                              throw new Error(err?.error || "Failed to save substitutions");
                            }
                            await fetchSubsForDate(subsDate);
                            alert("Substitutions saved.");
                          } catch (e:any) {
                            alert(e?.message || "Failed to save substitutions");
                          } finally {
                            setSavingSubs(false);
                          }
                        }}
                        className="rounded-md bg-[#006d77] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                      >
                        {savingSubs ? "Saving..." : "Save substitutions"}
                      </button>
                    </div>
                  </>
                )}

                {/* Today’s saved substitutions */}
                <div className="mt-6 rounded-xl border border-gray-200 bg-white p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-md font-semibold text-[#064e4f]">Today’s substitutions ({subsDate})</h4>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fetchSubsForDate(subsDate)}
                        className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm"
                      >
                        Refresh
                      </button>
                      <button
                        className="rounded-md bg-[#006d77] px-3 py-1.5 text-sm text-white"
                        onClick={async () => {
                          const tasks = todaySubs.map(async (row) => {
                            const w = whatsMap.get(row.replacementId);
                            const repName = row.replacement?.name || teachers.find(t => t.id === row.replacementId)?.name || "-";
                            const absentName = row.absent?.name || teachers.find(t => t.id === row.absentId)?.name || "-";
                            const clsName = row.class?.name || classes.find(c => c.id === row.classId)?.name || row.classId;
                            const subjName = row.subject?.name || subjects.find(s => s.id === row.subjectId)?.name || "-";
                            const body =
`Substitution notice:
Date: ${subsDate} (${DAYS[row.dayIndex]})
Session: ${row.session} (${row.start}-${row.end})
Class: ${clsName}
Subject: ${subjName}
Absent: ${absentName}
Assigned to: ${repName}
Please confirm.`;
                            if (w?.phone && w?.optIn) {
                              const msg = encodeURIComponent(body);
                              const href = `https://wa.me/${w.phone.replace(/\D/g,"")}?text=${msg}`;
                              window.open(href, "_blank", "noreferrer");
                              return { ok: true };
                            }
                            return { ok: false, reason: "No WhatsApp phone/opt-in" };
                          });
                          const results = await Promise.allSettled(tasks);
                          const failures = results.filter(r => r.status === "rejected");
                          if (failures.length) {
                            alert(`Some messages failed or were skipped (${failures.length}). Check numbers/opt-in.`);
                          } else {
                            alert("Opened WhatsApp chats (or sent via API if implemented) for all rows.");
                          }
                        }}
                      >
                        Send all WhatsApp
                      </button>
                    </div>
                  </div>

                  {loadingTodaySubs ? (
                    <div className="text-sm text-gray-600">Loading saved substitutions...</div>
                  ) : todaySubs.length === 0 ? (
                    <div className="text-sm text-gray-600">No saved substitutions for this date.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full table-auto text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left">Session</th>
                            <th className="px-3 py-2 text-left">Time</th>
                            <th className="px-3 py-2 text-left">Class</th>
                            <th className="px-3 py-2 text-left">Subject</th>
                            <th className="px-3 py-2 text-left">Absent</th>
                            <th className="px-3 py-2 text-left">Replacement</th>
                            <th className="px-3 py-2 text-left">WhatsApp</th>
                            <th className="px-3 py-2 text-left">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {todaySubs.map((row) => {
                            const clsName = row.class?.name || classes.find(c => c.id === row.classId)?.name || row.classId;
                            const subjName = row.subject?.name || subjects.find(s => s.id === row.subjectId)?.name || "-";
                            const absentName = row.absent?.name || teachers.find(t => t.id === row.absentId)?.name || "-";
                            const repName = row.replacement?.name || teachers.find(t => t.id === row.replacementId)?.name || "-";
                            const w = whatsMap.get(row.replacementId);
                            const msg = encodeURIComponent(
`Substitution notice:
Date: ${subsDate} (${DAYS[row.dayIndex]})
Session: ${row.session} (${row.start}-${row.end})
Class: ${clsName}
Subject: ${subjName}
Absent: ${absentName}
Assigned to: ${repName}
Please confirm.`);
                            const href = w?.phone && w?.optIn ? `https://wa.me/${w.phone.replace(/\D/g,"")}?text=${msg}` : `https://wa.me/?text=${msg}`;
                            const disabled = !w?.phone || !w?.optIn;

                            return (
                              <tr key={row.id} className="even:bg-gray-50">
                                <td className="px-3 py-2">S{row.session}</td>
                                <td className="px-3 py-2">{row.start}-{row.end}</td>
                                <td className="px-3 py-2">{clsName}</td>
                                <td className="px-3 py-2">{subjName}</td>
                                <td className="px-3 py-2">{absentName}</td>
                                <td className="px-3 py-2">{repName}</td>
                                <td className="px-3 py-2">
                                  <a
                                    target="_blank"
                                    rel="noreferrer"
                                    href={href}
                                    className={`rounded-md border px-2 py-1 text-xs ${disabled ? "cursor-not-allowed border-gray-200 text-gray-300" : "border-gray-300 bg-white"}`}
                                    onClick={e => { if (disabled) { e.preventDefault(); alert("No WhatsApp number/opt-in for this teacher or not imported."); } }}
                                  >
                                    WhatsApp
                                  </a>
                                </td>
                                <td className="px-3 py-2">
                                  <button
                                    className="rounded-md border border-red-300 bg-white px-2 py-1 text-xs text-red-600"
                                    onClick={async () => {
                                      if (!confirm("Delete this substitution?")) return;
                                      const res = await fetch(`/api/substitutions/${row.id}`, { method: "DELETE" });
                                      if (!res.ok) {
                                        const err = await res.json().catch(() => ({}));
                                        return alert(err?.error || "Delete failed");
                                      }
                                      await fetchSubsForDate(subsDate);
                                    }}
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`@media print { body { background: white; } .no-print { display: none !important; } }`}</style>
    </div>
  );
}




/* ========= Teacher-specific Timetable Component ========= */
/* ========= Teacher-specific Timetable Component ========= */
/* ========= Teacher-specific Timetable Component ========= */
type TeacherCell = { subjectName: string; className: string; start?: string; end?: string };

function TimetableTeachers({
  title,
  sessionTimes,
  grid,
  showBreakAt,
  breakLengthMin = 0,
}: {
  title: string;
  sessionTimes: { start: string; end: string }[];
  grid: TeacherCell[][][];
  showBreakAt?: number | null;
  breakLengthMin?: number;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-lg ring-1 ring-gray-100">
      <div className="mb-3 text-center text-xl font-bold text-[#064e4f]">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-[#006d77] text-white">
            <tr>
              <th className="sticky left-0 z-10 w-32 border border-white bg-[#006d77] px-3 py-2 text-left font-semibold">
                Day
              </th>
              {sessionTimes.map((session, idx) => (
                <th key={idx} className="min-w-[10rem] border border-white px-3 py-2 text-left font-semibold">
                  <div>Session {idx + 1}</div>
                  <div className="text-[11px] font-normal opacity-90">
                    {session.start}–{session.end}
                  </div>
                  {showBreakAt === idx + 1 && (
                    <div className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-900">
                      Break +{breakLengthMin}m
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"].map((dayName, dayIdx) => (
              <tr key={dayName} className="even:bg-gray-50">
                <td className="sticky left-0 z-10 border border-gray-200 bg-white px-3 py-3 font-medium even:bg-gray-50">
                  {dayName}
                </td>
                {sessionTimes.map((_, sessionIdx) => {
                  const classes = grid[dayIdx]?.[sessionIdx] || [];
                  return (
                    <td key={sessionIdx} className="border border-gray-200 px-3 py-3 align-top">
                      {classes.length === 0 ? (
                        <div className="flex h-12 items-center justify-center text-gray-300">—</div>
                      ) : (
                        <div className="space-y-2">
                          {classes.map((cls, idx) => (
                            <div
                              key={idx}
                              className="rounded-md border border-gray-300 bg-gradient-to-br from-white to-gray-50 p-2.5 shadow-sm"
                            >
                              <div className="font-semibold text-gray-900">{cls.subjectName}</div>
                              <div className="mt-0.5 text-xs text-gray-600">{cls.className}</div>
                              {cls.start && cls.end && (
                                <div className="mt-1 font-mono text-[10px] text-gray-500">
                                  {cls.start}–{cls.end}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
