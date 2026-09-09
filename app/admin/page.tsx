'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import EditSchedule from '../components/EditSchedule';

// ─── Types ──────────────────────────────────────────────────────
type TeacherClass = { id: string; name: string };
type TeacherSubject = { id: string; name: string };

type Teacher = {
  id: string;
  username: string;
  name: string;
  password?: string | null;
  classes: TeacherClass[];
  subjects: TeacherSubject[];
};

type Lesson = {
  id: string;
  teacherId: string;
  classId: string;
  subjectId: string;
  date: string;
  unit: string;
  lesson: string;
  objective: string;
  homework?: string | null;
  pages: string;
  comments?: string | null;
  createdAt?: string;
  subject?: TeacherSubject;
  subjectName?: string;
  teacher?: { id: string; name: string; username: string };
  class?: TeacherClass;
};

type AssignedTeacherStatus = {
  id: string;
  username: string;
  name: string;
  submitted: boolean;
  submittedAt?: string | null;
};

type AllTeacherRow = {
  id: string;
  username: string;
  name: string;
  classes: { name: string; subjects: string[]; submitted: boolean }[];
  allSubmitted: boolean;
};

// ─── Module-level cache ─────────────────────────────────────────
type AdminCache = {
  teachers: Teacher[];
  classes: TeacherClass[];
  subjects: TeacherSubject[];
};

let _cache: AdminCache | null = null;
let _isLoading = false;

// ─── Icons ──────────────────────────────────────────────────────
const Icon = {
  Shield: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Users: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Classes: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v2M2 10l8-4 8 4-8 4-8-4z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  ),
  Book: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  Plus: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Download: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Print: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ),
  Edit: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Trash: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Close: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Search: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Calendar: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Check: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Alert: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Card: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
  Clipboard: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  ),
};

// ─── Helper functions ───────────────────────────────────────────
const subjectOrder = [
  'English', 'Math', 'Science', 'Social Studies', 'Life Skills',
  'ICT', 'French', 'Computer', 'Arabic', 'S.S in Arabic', 'Islamic Studies',
];

function subjectSortIndex(subjectName: string) {
  const idx = subjectOrder.findIndex((key) =>
    subjectName.trim().toLowerCase().startsWith(key.trim().toLowerCase())
  );
  return idx === -1 ? 999 : idx;
}

const formatTime = (ts?: string | Date | null) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

const toCsv = (rows: string[][]) => {
  const esc = (v: string) => {
    const s = String(v ?? '').replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  return rows.map((r) => r.map(esc).join(',')).join('\n');
};

const downloadCsv = (filename: string, csv: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// ─── Component ──────────────────────────────────────────────────
export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [teachers, setTeachers] = useState<Teacher[]>(() => _cache?.teachers ?? []);
  const [classes, setClasses] = useState<TeacherClass[]>(() => _cache?.classes ?? []);
  const [subjects, setSubjects] = useState<TeacherSubject[]>(() => _cache?.subjects ?? []);
  const [isInitialLoad, setIsInitialLoad] = useState(() => _cache === null);

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [filter, setFilter] = useState({ classId: '', date: '' });

  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [newTeacher, setNewTeacher] = useState({
    username: '', name: '', password: '',
    classIds: [] as string[], subjectIds: [] as string[],
  });
  const [newClass, setNewClass] = useState({ name: '' });
  const [newSubject, setNewSubject] = useState({ name: '' });

  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [showTeacherDetails, setShowTeacherDetails] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [showLessons, setShowLessons] = useState(false);
  const [showAssigned, setShowAssigned] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const [showAllTeachers, setShowAllTeachers] = useState(false);
  const [allTeachersData, setAllTeachersData] = useState<AllTeacherRow[]>([]);

  const [assignedTeachersStatus, setAssignedTeachersStatus] = useState<AssignedTeacherStatus[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const track = <T,>(p: Promise<T>) => {
    setPendingCount((c) => c + 1);
    return p.finally(() => setPendingCount((c) => Math.max(0, c - 1)));
  };

  const fetchJson = async (input: RequestInfo, init?: RequestInit) => {
    const res = await fetch(input, init);
    let data: any = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      const message = data?.error || res.statusText || 'Request failed';
      throw new Error(message);
    }
    return data;
  };

  // ── Initial load ──
  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      router.push('/login');
      return;
    }
    if (_cache) return;
    if (_isLoading) return;
    _isLoading = true;

    const load = async () => {
      try {
        const [t, c, s] = await Promise.all([
          fetchJson('/api/admin/teachers'),
          fetchJson('/api/classes'),
          fetchJson('/api/subjects'),
        ]);
        setTeachers(t);
        setClasses(c);
        setSubjects(s);
        _cache = { teachers: t, classes: c, subjects: s };
        setIsInitialLoad(false);
      } catch (e) {
        toast.error(`Failed to load admin data: ${String((e as any)?.message || e)}`);
        setIsInitialLoad(false);
      } finally {
        _isLoading = false;
      }
    };
    load();
  }, [session, status, router]);

  const sortedLessons = useMemo(
    () => [...lessons].sort((a, b) =>
      subjectSortIndex(a.subject?.name ?? a.subjectName ?? '') -
      subjectSortIndex(b.subject?.name ?? b.subjectName ?? '')
    ),
    [lessons]
  );

  // ── Handlers ──
  const handleFilter = async () => {
    if (!filter.classId || !filter.date) {
      toast.error('Choose class and date first');
      return;
    }
    try {
      setLessonsLoading(true);
      const data = await fetch(`/api/lessons?classId=${filter.classId}&date=${filter.date}`).then((r) => r.json());
      setLessons(data ?? []);
      setShowLessons(true);
      setShowAssigned(false);
    } catch {
      toast.error('Failed to load lessons');
    } finally {
      setLessonsLoading(false);
    }
  };

  const handleShowAssignedTeachers = async () => {
    if (!filter.classId || !filter.date) {
      toast.error('Choose class and date first');
      return;
    }

    let dbSchedule: { [dayIndex: number]: string[] } = {};
    try {
      const data = await fetchJson(`/api/schedule?classId=${filter.classId}`);
      dbSchedule = data.schedule ?? {};
    } catch {
      toast.error('Failed to load schedule from database');
      return;
    }

    const dayIndex = new Date(filter.date).getDay();
    const scheduledSubjectIds = dbSchedule[dayIndex] ?? [];

    if (scheduledSubjectIds.length === 0) {
      toast.error('No schedule found for this class on this day');
      return;
    }

    const scheduledSet = new Set(scheduledSubjectIds);

    const assigned = teachers.filter((t) => {
      if (!(t.classes ?? []).some((c) => c.id === filter.classId)) return false;
      const teacherSubjectIds = (t.subjects ?? []).map((s) => s.id);
      return teacherSubjectIds.some((id) => scheduledSet.has(id));
    });

    const firstSubmitByTeacher = new Map<string, string | null>();
    const sorted = [...(lessons ?? [])].sort((a, b) => {
      const ta = new Date(a.createdAt ?? a.date).getTime();
      const tb = new Date(b.createdAt ?? b.date).getTime();
      return ta - tb;
    });
    for (const l of sorted) {
      if (!firstSubmitByTeacher.has(l.teacherId)) {
        firstSubmitByTeacher.set(l.teacherId, (l.createdAt ?? l.date) as string | null);
      }
    }

    const rows: AssignedTeacherStatus[] = assigned.map((t) => {
      const teacherSubjectIds = (t.subjects ?? []).map((s) => s.id);
      const relevantSubjectIds = teacherSubjectIds.filter((id) => scheduledSet.has(id));

      const teacherLessons = (lessons ?? []).filter(
        (l) => l.teacherId === t.id && relevantSubjectIds.includes(l.subjectId)
      );

      const missingSubjectIds = relevantSubjectIds.filter(
        (id) => !teacherLessons.some((l) => l.subjectId === id)
      );

      return {
        id: t.id,
        username: t.username,
        name: t.name,
        submitted: missingSubjectIds.length === 0,
        submittedAt: firstSubmitByTeacher.get(t.id) ?? null,
      };
    });

    setAssignedTeachersStatus(rows);
    setShowAssigned(true);
  };

  const handleShowAllTeachers = async () => {
    if (!filter.date) {
      toast.error('Choose a date first');
      return;
    }

    let schedules: any[] = [];
    try {
      const data = await fetchJson('/api/schedules');
      schedules = data.schedules ?? [];
    } catch {
      toast.error('Failed to load schedules');
      return;
    }

    const dayIndex = new Date(filter.date).getDay();
    const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
    const classMap = new Map(classes.map((c) => [c.id, c.name]));

    // teacherId → { info, className → { classId, subjects, subjectIds } }
    const teacherMap = new Map<string, {
      id: string; username: string; name: string;
      classEntries: Map<string, { classId: string; subjects: Set<string>; subjectIds: Set<string> }>;
    }>();

    for (const sch of schedules) {
      if (!sch.isActive) continue;
      const daySubjects = (sch.items ?? [])
        .filter((item: any) => item.dayIndex === dayIndex)
        .map((item: any) => item.subjectId);
      if (daySubjects.length === 0) continue;

      const className = classMap.get(sch.classId) ?? sch.className;

      for (const t of teachers) {
        const teachesClass = (t.classes ?? []).some((c) => c.id === sch.classId);
        if (!teachesClass) continue;

        const teacherSubjectsInDay = daySubjects.filter((subId: string) =>
          (t.subjects ?? []).some((s) => s.id === subId)
        );
        if (teacherSubjectsInDay.length === 0) continue;

        if (!teacherMap.has(t.id)) {
          teacherMap.set(t.id, {
            id: t.id, username: t.username, name: t.name,
            classEntries: new Map(),
          });
        }
        const entry = teacherMap.get(t.id)!;
        if (!entry.classEntries.has(className)) {
          entry.classEntries.set(className, { classId: sch.classId, subjects: new Set(), subjectIds: new Set() });
        }
        const classEntry = entry.classEntries.get(className)!;
        for (const subId of teacherSubjectsInDay) {
          classEntry.subjects.add(subjectMap.get(subId) ?? subId);
          classEntry.subjectIds.add(subId);
        }
      }
    }

    const rows: AllTeacherRow[] = Array.from(teacherMap.values()).map((t) => {
      const classDetails = Array.from(t.classEntries.entries()).map(([className, ce]) => {
        const submitted = (lessons ?? []).some(
          (l) => l.teacherId === t.id && l.classId === ce.classId && ce.subjectIds.has(l.subjectId)
        );
        return {
          name: className,
          subjects: Array.from(ce.subjects),
          submitted,
        };
      });
      return {
        id: t.id,
        username: t.username,
        name: t.name,
        classes: classDetails,
        allSubmitted: classDetails.every((c) => c.submitted),
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    if (rows.length === 0) {
      toast.error('No teachers found with subjects scheduled for this day');
      return;
    }

    setAllTeachersData(rows);
    setShowAllTeachers(true);
  };

  const handlePrintAllTeachers = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print.');
      return;
    }

    const dateStr = new Date(filter.date).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const missingCount = allTeachersData.filter((t) => !t.allSubmitted).length;
    const submittedCount = allTeachersData.length - missingCount;

    const tableRows = allTeachersData.map((t, idx) => {
      const submittedClasses = t.classes.filter((c) => c.submitted);
      const missingClasses = t.classes.filter((c) => !c.submitted);
      return `
      <tr class="${!t.allSubmitted ? 'row-missing' : 'row-submitted'}">
        <td class="number-cell">${idx + 1}</td>
        <td><strong>${escapeHtml(t.name)}</strong></td>
        <td>${escapeHtml(t.username)}</td>
        <td>${submittedClasses.map((c) => `<span class="pill pill-green">${escapeHtml(c.name)}</span> <span class="sub-text">${escapeHtml(c.subjects.join(', '))}</span>`).join('<br>') || '<span class="no-data">—</span>'}</td>
        <td>${missingClasses.map((c) => `<span class="pill pill-red">${escapeHtml(c.name)}</span> <span class="sub-text">${escapeHtml(c.subjects.join(', '))}</span>`).join('<br>') || '<span class="no-data">—</span>'}</td>
      </tr>`;
    }).join('');

    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Teacher Submission Report — ${dateStr}</title>
<style>
  @page { margin: 1.2cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, sans-serif;
    color: #1e293b;
    padding: 30px 40px;
    border: 2px solid #006d77;
    border-radius: 8px;
  }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #006d77; padding-bottom: 16px; margin-bottom: 24px; }
  .school-name { font-size: 22px; font-weight: bold; color: #006d77; }
  .school-sub { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px; }
  .title { text-align: center; margin-bottom: 20px; }
  .title h1 { font-size: 20px; font-weight: bold; color: #064e4f; text-transform: uppercase; letter-spacing: 2px; }
  .info-bar { display: flex; justify-content: space-around; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 12px; margin-bottom: 20px; }
  .info-item { text-align: center; flex: 1; }
  .info-item + .info-item { border-left: 1px solid #ccfbf1; }
  .info-label { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 1.2px; color: #64748b; margin-bottom: 3px; }
  .info-value { font-size: 13px; font-weight: 600; color: #006d77; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
  thead th { background: #006d77; color: #fff; padding: 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  tbody td { border: 1px solid #e2e8f0; padding: 8px 10px; vertical-align: top; }
  .number-cell { text-align: center; color: #94a3b8; font-weight: 600; }
  .row-missing { border-left: 4px solid #f87171; background: #fef2f2; }
  .row-submitted { border-left: 4px solid #34d399; background: #f0fdf4; }
  .pill { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; }
  .pill-green { background: #d1fae5; color: #065f46; }
  .pill-red { background: #fee2e2; color: #991b1b; }
  .sub-text { font-size: 10px; color: #64748b; }
  .no-data { color: #cbd5e1; font-size: 10px; }
  .footer { margin-top: 30px; padding-top: 16px; border-top: 1.5px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b; font-style: italic; }
  @media print { body { border: none; padding: 20px 30px; } }
</style>
</head>
<body>
  <div class="header">
    <div><p class="school-name">Alforqan Private School</p><p class="school-sub">American Division</p></div>
    <img src="/logo.svg" alt="Logo" style="height:70px" />
  </div>
  <div class="title"><h1>Teacher Submission Report</h1></div>
  <div class="info-bar">
    <div class="info-item"><span class="info-label">Date</span><span class="info-value">${dateStr}</span></div>
    <div class="info-item"><span class="info-label">Total Teachers</span><span class="info-value">${allTeachersData.length}</span></div>
    <div class="info-item"><span class="info-label">Submitted</span><span class="info-value">${submittedCount}</span></div>
    <div class="info-item"><span class="info-label">Missing</span><span class="info-value">${missingCount}</span></div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:30px">#</th>
        <th>Name</th>
        <th>Username</th>
        <th style="color:#bbf7d0">Submitted</th>
        <th style="color:#fecaca">Unsubmitted</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="footer">
    <p>Please submit your lesson plan before the end of the school day.</p>
  </div>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await toast.promise(
        track((async () => {
          await fetchJson('/api/admin/teachers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...newTeacher, role: 'TEACHER' }),
          });
          const t = await fetchJson('/api/admin/teachers');
          setTeachers(t);
          if (_cache) _cache = { ..._cache, teachers: t };
          setNewTeacher({ username: '', name: '', password: '', classIds: [], subjectIds: [] });
          setShowTeacherForm(false);
        })()),
        { loading: 'Creating teacher…', success: 'Teacher created', error: (e) => `Failed to create teacher: ${String((e as any)?.message || e)}` }
      );
    } catch {}
  };

  const handleUpdateTeacher = async (payload: { id: string; username: string; name: string; password?: string; classIds: string[]; subjectIds: string[] }) => {
    const body: any = { username: payload.username, name: payload.name, classIds: payload.classIds, subjectIds: payload.subjectIds };
    if (payload.password && payload.password.trim().length > 0) body.password = payload.password;
    try {
      await toast.promise(
        track((async () => {
          await fetchJson(`/api/admin/teachers/${payload.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          const t = await fetchJson('/api/admin/teachers');
          setTeachers(t);
          if (_cache) _cache = { ..._cache, teachers: t };
          setShowEditModal(false);
          setEditingTeacher(null);
        })()),
        { loading: 'Saving changes…', success: 'Teacher updated', error: (e) => `Failed to update teacher: ${String((e as any)?.message || e)}` }
      );
    } catch {}
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this teacher?')) return;
    try {
      await toast.promise(
        track((async () => {
          await fetchJson(`/api/admin/teachers/${id}`, { method: 'DELETE' });
          const t = await fetchJson('/api/admin/teachers');
          setTeachers(t);
          if (_cache) _cache = { ..._cache, teachers: t };
        })()),
        { loading: 'Deleting teacher…', success: 'Teacher deleted', error: (e) => `Failed to delete teacher: ${String((e as any)?.message || e)}` }
      );
    } catch {}
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await toast.promise(
        track((async () => {
          await fetchJson('/api/classes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newClass) });
          const c = await fetchJson('/api/classes');
          setClasses(c);
          if (_cache) _cache = { ..._cache, classes: c };
          setNewClass({ name: '' });
        })()),
        { loading: 'Creating class…', success: 'Class created', error: (e) => `Failed to create class: ${String((e as any)?.message || e)}` }
      );
    } catch {}
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await toast.promise(
        track((async () => {
          await fetchJson('/api/subjects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSubject) });
          const s = await fetchJson('/api/subjects');
          setSubjects(s);
          if (_cache) _cache = { ..._cache, subjects: s };
          setNewSubject({ name: '' });
        })()),
        { loading: 'Creating subject…', success: 'Subject created', error: (e) => `Failed to create subject: ${String((e as any)?.message || e)}` }
      );
    } catch {}
  };

  // ★ NEW — Delete class handler
  const handleDeleteClass = async (id: string) => {
    const cls = classes.find((c) => c.id === id);
    if (!window.confirm(`Are you sure you want to delete "${cls?.name ?? 'this class'}"? Teachers assigned to this class will lose the assignment.`)) return;
    try {
      await toast.promise(
        track((async () => {
          await fetchJson(`/api/classes/${id}`, { method: 'DELETE' });
          const [c, t] = await Promise.all([
            fetchJson('/api/classes'),
            fetchJson('/api/admin/teachers'),
          ]);
          setClasses(c);
          setTeachers(t);
          if (_cache) _cache = { ..._cache, classes: c, teachers: t };
        })()),
        { loading: 'Deleting class…', success: 'Class deleted', error: (e) => `Failed to delete class: ${String((e as any)?.message || e)}` }
      );
    } catch {}
  };

  // ★ NEW — Delete subject handler
  const handleDeleteSubject = async (id: string) => {
    const sub = subjects.find((s) => s.id === id);
    if (!window.confirm(`Are you sure you want to delete "${sub?.name ?? 'this subject'}"? Teachers assigned to this subject will lose the assignment.`)) return;
    try {
      await toast.promise(
        track((async () => {
          await fetchJson(`/api/subjects/${id}`, { method: 'DELETE' });
          const [s, t] = await Promise.all([
            fetchJson('/api/subjects'),
            fetchJson('/api/admin/teachers'),
          ]);
          setSubjects(s);
          setTeachers(t);
          if (_cache) _cache = { ..._cache, subjects: s, teachers: t };
        })()),
        { loading: 'Deleting subject…', success: 'Subject deleted', error: (e) => `Failed to delete subject: ${String((e as any)?.message || e)}` }
      );
    } catch {}
  };

  // ★ ENHANCED — Professional print report for parents
   const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print the report.');
      return;
    }

    const currentDate = new Date();
    const dateStr = currentDate.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const selectedClass = classes.find((cls) => cls.id === filter.classId);
    const className = selectedClass ? selectedClass.name : 'All Classes';
    const filterDateStr = filter.date
      ? new Date(filter.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : dateStr;

    const tableRows = sortedLessons.length > 0
      ? sortedLessons.map((l, idx) => `
        <tr>
          <td class="number-cell">${idx + 1}</td>
          <td class="subject-cell">${escapeHtml(l.subject?.name ?? l.subjectName ?? '—')}</td>
          <td>${escapeHtml(l.lesson ?? '—')}</td>
          <td>${escapeHtml(l.objective ?? '—')}</td>
          <td class="center-cell">${escapeHtml(l.pages ?? '—')}</td>
          <td>${escapeHtml(l.homework ?? '—')}</td>
          <td>${escapeHtml(l.comments ?? '—')}</td>
        </tr>
      `).join('')
      : `<tr><td colspan="7" style="text-align:center;padding:40px;color:#94a3b8;font-style:italic">No lessons recorded for this date.</td></tr>`;

    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Daily Academic Report — ${className} — ${filterDateStr}</title>
<style>
  @page { margin: 1.2cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── Body with border frame ── */
  body {
    font-family: Georgia, 'Times New Roman', serif;
    color: #1e293b;
    line-height: 1.6;
    padding: 35px 42px;
    border: 2.5px solid #006d77;
    border-radius: 10px;
    box-shadow: inset 0 0 0 1px #ccfbf1, 0 1px 6px rgba(0,109,119,0.08);
    min-height: 96vh;
  }

  /* ── Letterhead ── */
  .letterhead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 3px solid #006d77;
    padding-bottom: 20px;
    margin-bottom: 30px;
    position: relative;
  }
  .letterhead::after {
    content: '';
    position: absolute;
    bottom: -3px;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent 5%, #83c5be 50%, transparent 95%);
    transform: translateY(4px);
  }
  .school-info { flex: 1; }
  .school-name {
    font-family: Arial, sans-serif;
    font-size: 24px;
    font-weight: bold;
    color: #006d77;
    margin: 0;
    letter-spacing: -0.5px;
  }
  .school-sub {
    font-family: Arial, sans-serif;
    font-size: 11px;
    color: #64748b;
    margin-top: 6px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }
 .school-logo {
  width: 85px;
  height: 85px;
  object-fit: contain;
  display: block;
  flex-shrink: 0;
}

  /* ── Title block ── */
  .title-wrapper {
    text-align: center;
    margin: 25px 0 28px;
  }
  .title-divider {
    width: 60px;
    height: 3px;
    background: linear-gradient(90deg, #006d77, #83c5be);
    margin: 0 auto 14px;
    border-radius: 2px;
  }
  .report-title {
    font-family: Arial, sans-serif;
    font-size: 22px;
    font-weight: bold;
    color: #064e4f;
    margin: 0;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .report-subtitle {
    font-family: Arial, sans-serif;
    font-size: 13px;
    color: #64748b;
    margin-top: 8px;
  }

  /* ── Info bar ── */
  .info-bar {
    display: flex;
    justify-content: space-around;
    align-items: center;
    background: linear-gradient(135deg, #f0fdfa 0%, #e6fffa 100%);
    border: 1px solid #99f6e4;
    border-radius: 10px;
    padding: 14px 24px;
    margin-bottom: 25px;
    font-family: Arial, sans-serif;
  }
  .info-item {
    text-align: center;
    flex: 1;
  }
  .info-item + .info-item {
    border-left: 1px solid #ccfbf1;
  }
  .info-label {
    display: block;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: #64748b;
    margin-bottom: 4px;
  }
  .info-value {
    font-size: 13px;
    font-weight: 600;
    color: #006d77;
  }

  /* ── Table ── */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 0;
    font-size: 11px;
    font-weight: 700;
  }
  thead th {
    background: linear-gradient(135deg, #006d77, #005a63);
    color: #ffffff;
    padding: 11px 12px;
    text-align: left;
    font-family: Arial, sans-serif;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border: 1px solid #005a63;
  }
  thead th:first-child { border-top-left-radius: 8px; }
  thead th:last-child { border-top-right-radius: 8px; }
  tbody td {
    border: 1px solid #e2e8f0;
    padding: 9px 12px;
    vertical-align: top;
    font-family: Arial, sans-serif;
    font-weight: 700;
  }
  tbody tr:nth-child(even) { background: #f8fafc; }
  .subject-cell {
    font-weight: 700;
    color: #064e4f;
    white-space: nowrap;
  }
  .number-cell {
    text-align: center;
    color: #94a3b8;
    font-weight: 700;
  }
  .center-cell { text-align: center; white-space: nowrap; }

  /* ── Footer (centered) ── */
  .footer {
    margin-top: 45px;
    padding-top: 25px;
    border-top: 1.5px solid #e2e8f0;
    text-align: center;
    font-family: Arial, sans-serif;
  }
  .footer-note {
    font-style: italic;
    font-size: 11px;
    color: #64748b;
    line-height: 1.8;
    max-width: 520px;
    margin: 0 auto 40px;
  }
  .signature-block {
    display: inline-block;
    text-align: center;
  }
  .signature-line {
    border-top: 1.5px solid #475569;
    width: 220px;
    margin: 0 auto 6px;
  }
  .signature-label {
    font-size: 11px;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    font-weight: 600;
  }
  .footer-meta {
    margin-top: 35px;
    padding-top: 15px;
    border-top: 1px solid #f1f5f9;
    font-size: 9px;
    color: #cbd5e1;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    text-align: center;
  }

  @media print {
    body {
      padding: 28px 35px;
      box-shadow: inset 0 0 0 1px #ccfbf1;
      min-height: auto;
    }
    .letterhead { page-break-after: avoid; }
    .title-wrapper { page-break-after: avoid; }
    .info-bar { page-break-after: avoid; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
    thead { display: table-header-group; }
  }
</style>
</head>
<body>

  <!-- ── Letterhead ── -->
 <div class="letterhead">

  <div class="school-info">
    <p class="school-name">Alforqan Private School</p>
    <p class="school-sub">American Division</p>
  </div>

  <img
    src="/logo.svg"
    alt="Alforqan Private School Logo"
    class="school-logo"
  />

</div>
  </div>

  <!-- ── Title ── -->
  <div class="title-wrapper">
    <h1 class="report-title">Daily Academic Plan</h1>
  </div>

  <!-- ── Info bar ── -->
  <div class="info-bar">
    <div class="info-item">
      <span class="info-label">Class</span>
      <span class="info-value">${className}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Date</span>
      <span class="info-value">${filterDateStr}</span>
    </div>
    <div class="info-item">
      <span class="info-label">Lessons Recorded</span>
      <span class="info-value">${sortedLessons.length}</span>
    </div>
  </div>

  <!-- ── Table ── -->
  <table>
    <thead>
      <tr>
        <th style="width:32px">#</th>
        <th style="width:130px">Subject</th>
        <th>Lesson</th>
        <th>Objective</th>
        <th style="width:65px">Pages</th>
        <th>Homework</th>
        <th>Comments</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <!-- ── Footer (centered) ── -->
  <div class="footer">
    <p class="footer-note">
      Please review the homework assignments with your child and ensure completion before the next class.
    </p>
  </div>

</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const handleExportLessonsCsv = () => {
    const header = ['Subject', 'Teacher', 'Unit', 'Lesson', 'Objective', 'Pages', 'Homework', 'Comments', 'Submitted At'];
    const rows = sortedLessons.map((l) => [
      l.subject?.name ?? l.subjectName ?? '',
      l.teacher?.name ?? '',
      l.unit ?? '', l.lesson ?? '', l.objective ?? '',
      l.pages ?? '', l.homework ?? '', l.comments ?? '',
      l.createdAt ? formatTime(l.createdAt) : '',
    ]);
    const date = filter.date || new Date().toISOString().slice(0, 10);
    downloadCsv(`lessons_${date}.csv`, toCsv([header, ...rows]));
  };

  // ── Loading screen ──
  if (status === 'loading' || isInitialLoad) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-4 border-teal-100" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#006d77]" />
          </div>
          <p className="text-sm font-medium text-slate-500">Loading admin dashboard…</p>
        </div>
      </div>
    );
  }

  // ── Shared class strings ──
  const inputCls =
    'block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#006d77] focus:ring-2 focus:ring-[#006d77]/20 disabled:cursor-not-allowed disabled:opacity-60';
  const labelCls = 'mb-1.5 block text-sm font-medium text-slate-700';
  const btnPrimary =
    'inline-flex items-center justify-center gap-2 rounded-lg bg-[#006d77] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#005a63] focus:outline-none focus:ring-2 focus:ring-[#006d77] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';
  const btnSecondary =
    'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#83c5be] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';
  const btnAccent =
    'inline-flex items-center justify-center gap-2 rounded-lg bg-[#e29578] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#d17e62] focus:outline-none focus:ring-2 focus:ring-[#e29578] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ─── Header ─────────────────────────────────────────── */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#006d77] text-white shadow-sm">
                <Icon.Shield className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
                <p className="text-sm text-slate-500">Manage teachers, classes, subjects, and view lessons.</p>
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-lg bg-slate-100 px-3.5 py-2 text-sm font-medium text-slate-600 sm:flex">
              <Icon.Calendar className="h-4 w-4 text-slate-400" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {/* ─── Stats ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-[#006d77]"><Icon.Users className="h-6 w-6" /></div>
            <div><p className="text-2xl font-bold text-slate-900">{teachers.length}</p><p className="text-sm text-slate-500">Teachers</p></div>
          </div>
          <div className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-[#006d77]"><Icon.Classes className="h-6 w-6" /></div>
            <div><p className="text-2xl font-bold text-slate-900">{classes.length}</p><p className="text-sm text-slate-500">Classes</p></div>
          </div>
          <div className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-[#006d77]"><Icon.Book className="h-6 w-6" /></div>
            <div><p className="text-2xl font-bold text-slate-900">{subjects.length}</p><p className="text-sm text-slate-500">Subjects</p></div>
          </div>
        </div>

        {/* ─── Action buttons ─────────────────────────────────── */}
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowTeacherForm(!showTeacherForm)} className={btnPrimary} disabled={pendingCount > 0}>
            <Icon.Plus className="h-4 w-4" /> {showTeacherForm ? 'Hide Create Teacher' : 'Create Teacher'}
          </button>
          <button
            type="button"
            onClick={() => {
              const header = ['Username', 'Name', 'Classes', 'Subjects'];
              const rows = teachers.map((t) => [t.username, t.name, (t.classes ?? []).map((c) => c.name).join(' | '), (t.subjects ?? []).map((s) => s.name).join(' | ')]);
              downloadCsv(`teachers_${new Date().toISOString().slice(0, 10)}.csv`, toCsv([header, ...rows]));
            }}
            className={btnAccent}
          >
            <Icon.Download className="h-4 w-4" /> Export Teacher CSV
          </button>
          <button onClick={() => setShowTeacherDetails(!showTeacherDetails)} className={btnSecondary} disabled={pendingCount > 0}>
            <Icon.Users className="h-4 w-4" /> {showTeacherDetails ? 'Hide Teacher Details' : 'Show Teacher Details'}
          </button>
          <button onClick={() => router.push('/teacherData')} className={btnAccent} disabled={pendingCount > 0}>
            <Icon.Card className="h-4 w-4" /> Teachers Cards
          </button>
          <button onClick={() => setShowScheduleModal(true)} className={btnPrimary} disabled={pendingCount > 0}>
            <Icon.Card className="h-4 w-4" /> Schedules Hub
          </button>
          <button onClick={() => setShowClassForm(!showClassForm)} className={btnSecondary} disabled={pendingCount > 0}>
            <Icon.Plus className="h-4 w-4" /> {showClassForm ? 'Hide Classes' : 'Manage Classes'}
          </button>
          <button onClick={() => setShowSubjectForm(!showSubjectForm)} className={btnPrimary} disabled={pendingCount > 0}>
            <Icon.Plus className="h-4 w-4" /> {showSubjectForm ? 'Hide Subjects' : 'Manage Subjects'}
          </button>
        </div>

        {/* ─── Create Teacher Form ────────────────────────────── */}
        {showTeacherForm && (
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">Create New Teacher</h2>
              <p className="mt-0.5 text-sm text-slate-500">Add a teacher account and assign classes and subjects.</p>
            </div>
            <form onSubmit={handleCreateTeacher} className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Username <span className="text-red-500">*</span></label>
                <input type="text" value={newTeacher.username} onChange={(e) => setNewTeacher({ ...newTeacher, username: e.target.value })} className={inputCls} required disabled={pendingCount > 0} />
              </div>
              <div>
                <label className={labelCls}>Name <span className="text-red-500">*</span></label>
                <input type="text" value={newTeacher.name} onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })} className={inputCls} required disabled={pendingCount > 0} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Password <span className="text-red-500">*</span></label>
                <input type="password" value={newTeacher.password} onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })} className={inputCls} required disabled={pendingCount > 0} />
              </div>
              <div>
                <label className={labelCls}>Assign Classes</label>
                <select multiple value={newTeacher.classIds} onChange={(e) => setNewTeacher({ ...newTeacher, classIds: Array.from(e.target.selectedOptions, (o) => o.value) })} className={`${inputCls} min-h-[120px]`} disabled={pendingCount > 0}>
                  {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                </select>
                <p className="mt-1 text-xs text-slate-400">Hold Ctrl/Cmd to select multiple</p>
              </div>
              <div>
                <label className={labelCls}>Assign Subjects</label>
                <select multiple value={newTeacher.subjectIds} onChange={(e) => setNewTeacher({ ...newTeacher, subjectIds: Array.from(e.target.selectedOptions, (o) => o.value) })} className={`${inputCls} min-h-[120px]`} disabled={pendingCount > 0}>
                  {subjects.map((sub) => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                </select>
                <p className="mt-1 text-xs text-slate-400">Hold Ctrl/Cmd to select multiple</p>
              </div>
              <div className="sm:col-span-2">
                <button type="submit" disabled={pendingCount > 0} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#006d77] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#005a63] disabled:cursor-not-allowed disabled:opacity-60">
                  {pendingCount > 0 ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Working…</> : <><Icon.Plus className="h-4 w-4" /> Create Teacher</>}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ─── Class Manager (create + delete) ────────────────── */}
        {showClassForm && (
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">Manage Classes</h2>
              <p className="mt-0.5 text-sm text-slate-500">Create new classes or remove existing ones.</p>
            </div>
            <form onSubmit={handleCreateClass} className="space-y-4 p-6">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={labelCls}>Class Name <span className="text-red-500">*</span></label>
                  <input type="text" value={newClass.name} onChange={(e) => setNewClass({ ...newClass, name: e.target.value })} className={inputCls} placeholder="e.g. Grade 5A" required disabled={pendingCount > 0} />
                </div>
                <div className="flex items-end">
                  <button type="submit" disabled={pendingCount > 0} className="inline-flex items-center gap-2 rounded-lg bg-[#83c5be] px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-[#72b5ae] disabled:cursor-not-allowed disabled:opacity-60">
                    <Icon.Plus className="h-4 w-4" /> Add
                  </button>
                </div>
              </div>
            </form>
            {/* ★ NEW — Existing classes with delete buttons */}
            <div className="border-t border-slate-200 px-6 py-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Existing Classes</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">{classes.length} total</span>
              </div>
              {classes.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">No classes created yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {classes.map((cls) => (
                    <div key={cls.id} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-1.5">
                      <Icon.Classes className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-700">{cls.name}</span>
                      <button
                        onClick={() => handleDeleteClass(cls.id)}
                        disabled={pendingCount > 0}
                        className="rounded p-0.5 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        title="Delete class"
                      >
                        <Icon.Close className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── Subject Manager (create + delete) ─────────────── */}
        {showSubjectForm && (
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">Manage Subjects</h2>
              <p className="mt-0.5 text-sm text-slate-500">Create new subjects or remove existing ones.</p>
            </div>
            <form onSubmit={handleCreateSubject} className="space-y-4 p-6">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={labelCls}>Subject Name <span className="text-red-500">*</span></label>
                  <input type="text" value={newSubject.name} onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })} className={inputCls} placeholder="e.g. Mathematics" required disabled={pendingCount > 0} />
                </div>
                <div className="flex items-end">
                  <button type="submit" disabled={pendingCount > 0} className="inline-flex items-center gap-2 rounded-lg bg-[#e29578] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d17e62] disabled:cursor-not-allowed disabled:opacity-60">
                    <Icon.Plus className="h-4 w-4" /> Add
                  </button>
                </div>
              </div>
            </form>
            {/* ★ NEW — Existing subjects with delete buttons */}
            <div className="border-t border-slate-200 px-6 py-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Existing Subjects</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">{subjects.length} total</span>
              </div>
              {subjects.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">No subjects created yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {subjects.map((sub) => (
                    <div key={sub.id} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-1.5">
                      <Icon.Book className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-700">{sub.name}</span>
                      <button
                        onClick={() => handleDeleteSubject(sub.id)}
                        disabled={pendingCount > 0}
                        className="rounded p-0.5 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        title="Delete subject"
                      >
                        <Icon.Close className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── Teacher Details Table ──────────────────────────── */}
        {showTeacherDetails && (
          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Teachers</h2>
                <p className="mt-0.5 text-sm text-slate-500">{teachers.length} teacher(s) registered</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    {['Username', 'Name', 'Password', 'Classes', 'Subjects', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teachers.map((teacher, idx) => (
                    <tr key={teacher.id} className={`transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-teal-50/40`}>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{teacher.username}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{teacher.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-400">{teacher.password ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{teacher.classes.map((c) => c.name).join(', ') || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{teacher.subjects.map((s) => s.name).join(', ') || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingTeacher({ ...teacher, password: '', classIds: (teacher.classes ?? []).map((c) => c.id), subjectIds: (teacher.subjects ?? []).map((s) => s.id) } as any);
                              setShowEditModal(true);
                            }}
                            disabled={pendingCount > 0}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Icon.Edit className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTeacher(teacher.id)}
                            disabled={pendingCount > 0}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Icon.Trash className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ─── Edit Teacher Modal ──────────────────────────────── */}
        {showEditModal && editingTeacher && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h3 className="text-base font-semibold text-slate-900">Edit Teacher</h3>
                <button onClick={() => setShowEditModal(false)} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100">
                  <Icon.Close className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); if (editingTeacher) void handleUpdateTeacher(editingTeacher as any); }} className="space-y-6 p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Username <span className="text-red-500">*</span></label>
                    <input type="text" value={editingTeacher.username} onChange={(e) => setEditingTeacher({ ...editingTeacher, username: e.target.value })} className={inputCls} required />
                  </div>
                  <div>
                    <label className={labelCls}>Name <span className="text-red-500">*</span></label>
                    <input type="text" value={editingTeacher.name} onChange={(e) => setEditingTeacher({ ...editingTeacher, name: e.target.value })} className={inputCls} required />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Password <span className="text-slate-400 font-normal">(leave blank to keep)</span></label>
                    <input type="password" value={editingTeacher.password ?? ''} onChange={(e) => setEditingTeacher({ ...editingTeacher, password: e.target.value })} placeholder="Leave empty to keep current password" className={inputCls} />
                  </div>
                </div>

                {/* Dual-list: Classes */}
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">Classes</h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-200">
                      <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Available</div>
                      <div className="max-h-44 overflow-auto">
                        {classes.filter((c) => !((editingTeacher as any).classIds ?? []).includes(c.id)).map((c) => (
                          <button key={c.id} type="button" onClick={() => setEditingTeacher({ ...editingTeacher, classIds: [...((editingTeacher as any).classIds ?? []), c.id] } as any)} className="block w-full px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50">{c.name}</button>
                        ))}
                        {classes.filter((c) => !((editingTeacher as any).classIds ?? []).includes(c.id)).length === 0 && <div className="px-3 py-2 text-sm text-slate-400">No more classes</div>}
                      </div>
                    </div>
                    <div className="grid place-items-center">
                      <div className="flex flex-col gap-2">
                        <button type="button" onClick={() => { const rem = classes.filter((c) => !((editingTeacher as any).classIds ?? []).includes(c.id)).map((c) => c.id); setEditingTeacher({ ...editingTeacher, classIds: [...((editingTeacher as any).classIds ?? []), ...rem] } as any); }} className="rounded-lg bg-[#83c5be] px-3 py-1.5 text-xs font-medium text-slate-900 transition hover:bg-[#72b5ae]">Add all →</button>
                        <button type="button" onClick={() => setEditingTeacher({ ...editingTeacher, classIds: [] } as any)} className="rounded-lg bg-[#e29578] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#d17e62]">← Remove all</button>
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200">
                      <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned</div>
                      <div className="max-h-44 overflow-auto">
                        {classes.filter((c) => ((editingTeacher as any).classIds ?? []).includes(c.id)).map((c) => (
                          <div key={c.id} className="flex items-center justify-between px-3 py-2">
                            <span className="text-sm text-slate-600">{c.name}</span>
                            <button type="button" onClick={() => setEditingTeacher({ ...editingTeacher, classIds: ((editingTeacher as any).classIds ?? []).filter((id: string) => id !== c.id) } as any)} className="rounded px-2 py-0.5 text-xs text-red-600 transition hover:bg-red-50">Remove</button>
                          </div>
                        ))}
                        {((editingTeacher as any).classIds ?? []).length === 0 && <div className="px-3 py-2 text-sm text-slate-400">No classes assigned</div>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dual-list: Subjects */}
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">Subjects</h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-200">
                      <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Available</div>
                      <div className="max-h-44 overflow-auto">
                        {subjects.filter((s) => !((editingTeacher as any).subjectIds ?? []).includes(s.id)).map((s) => (
                          <button key={s.id} type="button" onClick={() => setEditingTeacher({ ...editingTeacher, subjectIds: [...((editingTeacher as any).subjectIds ?? []), s.id] } as any)} className="block w-full px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50">{s.name}</button>
                        ))}
                        {subjects.filter((s) => !((editingTeacher as any).subjectIds ?? []).includes(s.id)).length === 0 && <div className="px-3 py-2 text-sm text-slate-400">No more subjects</div>}
                      </div>
                    </div>
                    <div className="grid place-items-center">
                      <div className="flex flex-col gap-2">
                        <button type="button" onClick={() => { const rem = subjects.filter((s) => !((editingTeacher as any).subjectIds ?? []).includes(s.id)).map((s) => s.id); setEditingTeacher({ ...editingTeacher, subjectIds: [...((editingTeacher as any).subjectIds ?? []), ...rem] } as any); }} className="rounded-lg bg-[#83c5be] px-3 py-1.5 text-xs font-medium text-slate-900 transition hover:bg-[#72b5ae]">Add all →</button>
                        <button type="button" onClick={() => setEditingTeacher({ ...editingTeacher, subjectIds: [] } as any)} className="rounded-lg bg-[#e29578] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#d17e62]">← Remove all</button>
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200">
                      <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned</div>
                      <div className="max-h-44 overflow-auto">
                        {subjects.filter((s) => ((editingTeacher as any).subjectIds ?? []).includes(s.id)).map((s) => (
                          <div key={s.id} className="flex items-center justify-between px-3 py-2">
                            <span className="text-sm text-slate-600">{s.name}</span>
                            <button type="button" onClick={() => setEditingTeacher({ ...editingTeacher, subjectIds: ((editingTeacher as any).subjectIds ?? []).filter((id: string) => id !== s.id) } as any)} className="rounded px-2 py-0.5 text-xs text-red-600 transition hover:bg-red-50">Remove</button>
                          </div>
                        ))}
                        {((editingTeacher as any).subjectIds ?? []).length === 0 && <div className="px-3 py-2 text-sm text-slate-400">No subjects assigned</div>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                  <button type="button" onClick={() => setShowEditModal(false)} className={btnSecondary}>Cancel</button>
                  <button type="submit" disabled={pendingCount > 0} className="inline-flex items-center gap-2 rounded-lg bg-[#006d77] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#005a63] disabled:cursor-not-allowed disabled:opacity-60">
                    {pendingCount > 0 ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Saving…</> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── View Lessons (Filter + Table) ──────────────────── */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">View Lessons</h2>
              <p className="mt-0.5 text-sm text-slate-500">Filter by class and date to view submitted lessons.</p>
            </div>
            <button
              onClick={() => (showAllTeachers ? setShowAllTeachers(false) : handleShowAllTeachers())}
              disabled={!filter.date || pendingCount > 0}
              className="inline-flex items-center gap-2 rounded-lg bg-[#83c5be] px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-[#72b5ae] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon.Users className="h-4 w-4" /> {showAllTeachers ? 'Hide' : 'All Teachers'}
            </button>
          </div>
          <div className="p-6">
            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={labelCls}>Class</label>
                <select value={filter.classId} onChange={(e) => setFilter({ ...filter, classId: e.target.value })} className={inputCls}>
                  <option value="">Select Class</option>
                  {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Date</label>
                <input type="date" value={filter.date} onChange={(e) => setFilter({ ...filter, date: e.target.value })} className={inputCls} />
              </div>
              <div className="flex items-end">
                <button onClick={handleFilter} disabled={pendingCount > 0 || !filter.classId || !filter.date} className={btnPrimary + ' w-full'}>
                  <Icon.Search className="h-4 w-4" /> {pendingCount > 0 ? 'Loading…' : 'Show'}
                </button>
              </div>
              <div className="flex items-end gap-2">
                {showLessons && lessons.length > 0 && (
                  <button onClick={() => setShowLessons(false)} disabled={pendingCount > 0} className={btnSecondary + ' flex-1'}>Hide</button>
                )}
                <button onClick={() => (showAssigned ? setShowAssigned(false) : handleShowAssignedTeachers())} disabled={!filter.classId || !filter.date || pendingCount > 0} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#83c5be] px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-[#72b5ae] disabled:cursor-not-allowed disabled:opacity-60">
                  <Icon.Users className="h-4 w-4" /> {showAssigned ? 'Hide' : 'Teachers'}
                </button>
              </div>
            </div>

            {/* Lessons loading skeleton */}
            {showLessons && lessonsLoading && (
              <div className="rounded-xl border border-slate-100 bg-white p-4">
                <div className="mb-3 h-6 w-40 animate-pulse rounded bg-slate-200" />
                <div className="h-8 w-full animate-pulse rounded bg-slate-200" />
                <div className="mt-2 h-8 w-full animate-pulse rounded bg-slate-200" />
                <div className="mt-2 h-8 w-full animate-pulse rounded bg-slate-200" />
              </div>
            )}

            {/* Empty state */}
            {showLessons && !lessonsLoading && lessons.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
                  <Icon.Alert className="h-8 w-8 text-amber-400" />
                </div>
                <p className="mt-4 text-sm font-medium text-slate-600">No lessons submitted for this date.</p>
              </div>
            )}

            {/* Lessons table */}
            {showLessons && !lessonsLoading && lessons.length > 0 && (
              <div>
                <div className="mb-3 flex items-center justify-end gap-2">
                  <button onClick={handleExportLessonsCsv} className={btnSecondary}>
                    <Icon.Download className="h-4 w-4" /> Export CSV
                  </button>
                  <button onClick={handlePrint} className={btnSecondary}>
                    <Icon.Print className="h-4 w-4" /> Print Report
                  </button>
                </div>
                <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
                  <table id="lessons-table" className="w-full min-w-[900px] text-sm font-bold">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        {['Subject', 'Teacher', 'Unit', 'Lesson', 'Objective', 'Pages', 'Homework', 'Comments', 'Submitted'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedLessons.map((lesson, idx) => (
                        <tr key={lesson.id} className={`transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-teal-50/40`}>
                          <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-900">{lesson.subject?.name ?? lesson.subjectName ?? '—'}</td>
                          <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-600">{lesson.teacher?.name ?? '—'}</td>
                          <td className="px-4 py-3 font-bold text-slate-600">{lesson.unit}</td>
                          <td className="max-w-[180px] truncate px-4 py-3 font-bold text-slate-600" title={lesson.lesson}>{lesson.lesson}</td>
                          <td className="max-w-[180px] truncate px-4 py-3 font-bold text-slate-600" title={lesson.objective}>{lesson.objective}</td>
                          <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-600">{lesson.pages}</td>
                          <td className="max-w-[120px] truncate px-4 py-3 font-bold text-slate-600" title={lesson.homework ?? ''}>{lesson.homework || <span className="text-slate-300">—</span>}</td>
                          <td className="max-w-[120px] truncate px-4 py-3 font-bold text-slate-600" title={lesson.comments ?? ''}>{lesson.comments || <span className="text-slate-300">—</span>}</td>
                          <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-500">{lesson.createdAt ? formatTime(lesson.createdAt) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Assigned Teachers */}
            {showAssigned && assignedTeachersStatus.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Assigned Teachers — Submission Status</h3>
                <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        {['Username', 'Name', 'Status', 'Submitted At'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assignedTeachersStatus.map((t, idx) => (
                        <tr key={t.id} className={`transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-teal-50/40`}>
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{t.username}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{t.name}</td>
                          <td className="px-4 py-3">
                            {t.submitted ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                <Icon.Check className="h-3 w-3" /> Submitted
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                                <Icon.Alert className="h-3 w-3" /> Missing
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-500">{t.submittedAt ? formatTime(t.submittedAt) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── All Teachers Table ──────────────────────────── */}
            {showAllTeachers && allTeachersData.length > 0 && (() => {
              const missingTeachers = allTeachersData.filter((t) => !t.allSubmitted);
              const submittedTeachers = allTeachersData.filter((t) => t.allSubmitted);

              const renderClassPills = (classes: AllTeacherRow['classes'], submitted: boolean) => {
                const filtered = classes.filter((c) => c.submitted === submitted);
                if (filtered.length === 0) return <span className="text-slate-300 text-xs">—</span>;
                return (
                  <div className="flex flex-col gap-1.5">
                    {filtered.map((c) => (
                      <div key={c.name} className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${submitted ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{c.name}</span>
                        <span className="text-xs text-slate-500">{c.subjects.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                );
              };

              const renderRow = (t: AllTeacherRow, isMissing: boolean) => (
                <tr className={`transition-colors border-l-4 ${isMissing ? 'border-l-red-400 bg-red-50/30 hover:bg-red-50/60' : 'border-l-emerald-400 bg-emerald-50/20 hover:bg-emerald-50/50'}`}>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{t.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500 text-xs">{t.username}</td>
                  <td className="px-4 py-3">{renderClassPills(t.classes, true)}</td>
                  <td className="px-4 py-3">{renderClassPills(t.classes, false)}</td>
                </tr>
              );

              return (
                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">
                      All Teachers — {new Date(filter.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </h3>
                    <button onClick={handlePrintAllTeachers} className={btnSecondary}>
                      <Icon.Print className="h-4 w-4" /> Print Report
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
                    <table className="w-full min-w-[750px] text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Username</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-emerald-600">Submitted</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-600">Unsubmitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {missingTeachers.length > 0 && (
                          <>
                            <tr>
                              <td colSpan={4} className="bg-red-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-600 border-l-4 border-l-red-400">
                                Missing ({missingTeachers.length})
                              </td>
                            </tr>
                            {missingTeachers.map((t) => renderRow(t, true))}
                          </>
                        )}
                        {submittedTeachers.length > 0 && (
                          <>
                            <tr>
                              <td colSpan={4} className="bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-emerald-600 border-l-4 border-l-emerald-400">
                                All Submitted ({submittedTeachers.length})
                              </td>
                            </tr>
                            {submittedTeachers.map((t) => renderRow(t, false))}
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        </section>
      </main>

      {/* ─── Schedule Manager Modal ─────────────────────────── */}
      <EditSchedule
        show={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        classes={classes}
        subjects={subjects}
        user={{ id: session?.user?.id ?? '' }}
      />

      {/* ─── Global loading overlay ────────────────────────── */}
      {pendingCount > 0 && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/20 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-3 shadow-xl ring-1 ring-slate-200">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-[#006d77]" />
            <span className="text-sm font-medium text-slate-700">Processing…</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ★ NEW — small utility to escape HTML in print output
function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
