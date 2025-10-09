'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

type ID = string;

interface Grade { id: ID; name: string; }
interface Subject { id: ID; name: string; }
interface WeeklyPlanItem {
  subjectId: ID;
  unit?: string | null;
  lessons?: string | null;
  pages?: string | null;
  homework?: string | null;
  classwork?: string | null;
}
interface WeeklyPlan {
  id: ID;
  gradeId: ID;
  week: string;
  fromDate: string;
  toDate: string;
  grade: Grade;
  items: (WeeklyPlanItem & { subject: Subject })[];
}

type PlanFields = { unit: string; lessons: string; pages: string; homework: string; classwork: string };

/* =======================================
   Prefill samples
======================================= */
const prefillExample: Record<string, PlanFields> = {
  English: {
    unit: 'Unit 1: Elements of Literature\nUnit 2: Analyzing Literature',
    lessons: 'Unit 1: Lesson 5: Wrap-Up: Elements of Literature\nUnit 2: Lesson 1: Poetry',
    pages: 'Unit 1: Lesson 5: P. 24 – 26',
    homework: 'Complete the study guide worksheet and send it to the teacher.\nIXL Codes: PZY 8XM 64Z',
    classwork: 'Complete the assignment worksheet and submit answers for grading.',
  },
  Math: {
    unit: 'Unit 2: Signed Numbers',
    lessons: 'Unit 2: Lesson 3: Absolute Value\nUnit 2: Lesson 4: Wrap-Up: Signed Numbers',
    pages: '',
    homework: 'IXL Codes: 2YZ NSB 9CW',
    classwork: '',
  },
  Science: { unit: '', lessons: 'Unit 2: Lesson 2: Tools and Measurement', pages: 'P.27', homework: '', classwork: '' },
  'Social Studies': { unit: '', lessons: '', pages: 'Complete your work in p. 23', homework: '', classwork: '' },
  'Life Skills': {
    unit: 'Unit (1): My Success Skills',
    lessons: '',
    pages: 'P.26 - 29',
    homework: 'Complete your study guide worksheet',
    classwork:
      'Checkup and review: Complete the exercises to review what was learned and watch the review video\nPractice: Complete the assignment worksheet and submit answers for grading. Take the quiz online.',
  },
  Computer: {
    unit: '6 - 12',
    lessons: 'Microsoft Excel: Revision',
    pages: 'Worksheet',
    homework: '',
    classwork: 'Formatting Cells using Microsoft Excel - Charts',
  },
  'اللغة العربية': {
    unit: 'الوحدة الأولى - قدوات ومثل عليا',
    lessons: 'اتبع مهارات القطع والوصل والهمزة المتوسطة',
    pages: '٣٧-٤٧-٥٧-٦٧-٧٧',
    homework: 'الواجب صفحة ٧٧',
    classwork: '',
  },
  'الدراسات الإسلامية': {
    unit: '1 - 2',
    lessons:
      'التوحيد: مظاهر الشرك\nالحديث: محبته صلى الله عليه وسلم لذوي رحمه\nالفقه: صلاة العيدين\nالقرآن: حفظ سورة القلم 1-34',
    pages: 'التوحيد: 34\nالحديث: 57\nالفقه: 110',
    homework: 'التوحيد: 36\nالحديث: 60\nالفقه: 113',
    classwork: '',
  },
  'الدراسات الاجتماعية باللغة العربية': {
    unit: 'الوحدة الأولى والوحدة الثانية',
    lessons: 'أئمة الدولة السعودية الأولى',
    pages: '',
    homework: 'نشاط 2',
    classwork: 'معرفة مراحل تأسيس الدولة السعودية الأولى',
  },
};

const aliasToExampleKey: Record<string, string> = {
  Arabic: 'اللغة العربية',
  Islamic: 'الدراسات الإسلامية',
  'Social Arabic': 'الدراسات الاجتماعية باللغة العربية',
  ICT: 'Computer',
  LifeSkills: 'Life Skills',
  'Life Skills': 'Life Skills',
};

/* =======================================
   Markup rendering helpers
   - **bold**
   - ==yellow highlight==
   - ~~red highlight~~
   - :: full-line yellow bar
======================================= */

const renderWithHighlight = (input?: string) => {
  if (!input) return '';
  let html = input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  html = html.replace(/^::(.*)$/gm, (_m, p1) => `<div style="background:#fff59d">${p1}</div>`);
  html = html.replace(/==([\s\S]*?)==/g, (_m, p1) => `<mark style="background:#fff59d">${p1}</mark>`);
  html = html.replace(/~~([\s\S]*?)~~/g, (_m, p1) => `<mark style="background:#ffb3b3;color:#7a0000">${p1}</mark>`);
  html = html.replace(/\*\*([\s\S]*?)\*\*/g, (_m, p1) => `<strong>${p1}</strong>`);
  html = html.replace(/\n/g, '<br/>');
  return html;
};

const wrapSelectionIn = (ta: HTMLTextAreaElement, delimiter: string) => {
  const { selectionStart, selectionEnd, value } = ta;
  if (selectionStart == null || selectionEnd == null || selectionStart === selectionEnd) return value;
  return value.slice(0, selectionStart) + delimiter + value.slice(selectionStart, selectionEnd) + delimiter + value.slice(selectionEnd);
};

export default function CoordinatorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);

  const [assignOpen, setAssignOpen] = useState(false);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [assignGradeId, setAssignGradeId] = useState<ID>('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<ID>>(new Set());
  const [subjectFilter, setSubjectFilter] = useState('');

  const [form, setForm] = useState<{ id: ID; gradeId: ID; week: string; fromDate: string; toDate: string }>({
    id: '',
    gradeId: '',
    week: '',
    fromDate: '',
    toDate: '',
  });

  const [planData, setPlanData] = useState<Record<ID, PlanFields>>({});
  const [assignedSubjects, setAssignedSubjects] = useState<Subject[]>([]);
  const [showPlan, setShowPlan] = useState(false);
  const [editing, setEditing] = useState(false);

  // Notes and its ref for buttons
  const [notes, setNotes] = useState('');
  const notesRef = useRef<HTMLTextAreaElement | null>(null);

  const [logoDataUrl, setLogoDataUrl] = useState<string>('');
  const [cogniaDataUrl, setCogniaDataUrl] = useState<string>('');

  const [pendingCount, setPendingCount] = useState(0);
  const track = <T,>(p: Promise<T>) => {
    setPendingCount((c) => c + 1);
    return p.finally(() => setPendingCount((c) => Math.max(0, c - 1)));
  };

  const loadedOnce = useRef(false);

  const fetchJson = async <T,>(input: RequestInfo, init?: RequestInit): Promise<T> => {
    const res = await fetch(input, init);
    let data: unknown = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      const message = (data as any)?.error || res.statusText || 'Request failed';
      throw new Error(String(message));
    }
    return data as T;
  };

  const isArabicBlock = (name: string): boolean => {
    const map: Record<string, string> = {
      Arabic: 'اللغة العربية',
      Islamic: 'الدراسات الإسلامية',
      'Social Arabic': 'الدراسات الاجتماعية',
      'الدراسات الاجتماعية باللغة العربية': 'الدراسات الاجتماعية',
    };
    const label = map[name] || name;
    return label === 'اللغة العربية' || label === 'الدراسات الإسلامية' || label === 'الدراسات الاجتماعية';
  };

  const toDisplayName = (name: string): string => {
    const map: Record<string, string> = {
      Arabic: 'اللغة العربية',
      Islamic: 'الدراسات الإسلامية',
      'Social Arabic': 'الدراسات الاجتماعية',
      'الدراسات الاجتماعية باللغة العربية': 'الدراسات الاجتماعية',
    };
    return map[name] || name;
  };

  const canonicalKey = (dbName: string) => aliasToExampleKey[dbName] || dbName;
  const getPrefillFor = (dbName: string): PlanFields => {
    const key = canonicalKey(dbName);
    return prefillExample[key] || { unit: '', lessons: '', pages: '', homework: '', classwork: '' };
  };

  // Refs for subject textareas
  const areaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const refKey = (subId: ID, field: keyof PlanFields) => `${subId}:${field}`;

  // Assign modal open
  const openAssignModal = async () => {
    try {
      if (grades.length === 0) {
        const gs = await fetchJson<Grade[]>('/api/grades');
        setGrades(gs);
      }
      const subs = await fetchJson<Subject[]>('/api/subjects');
      const ordered = [...subs].sort((a, b) => a.name.localeCompare(b.name));
      setAllSubjects(ordered);

      setAssignGradeId('');
      setSelectedSubjectIds(new Set());
      setSubjectFilter('');
      setAssignOpen(true);
    } catch (e) {
      toast.error(String((e as any)?.message || e));
    }
  };

  const toggleSubject = (id: ID) => {
    setSelectedSubjectIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAllFiltered = () => {
    const ids = allSubjects
      .filter(s => s.name.toLowerCase().includes(subjectFilter.toLowerCase()))
      .map(s => s.id);
    setSelectedSubjectIds(new Set(ids));
  };
  const clearSelection = () => setSelectedSubjectIds(new Set());

  const submitAssignSubjects = async () => {
    if (!assignGradeId) { toast.error('Please select a grade'); return; }
    if (selectedSubjectIds.size === 0) { toast.error('Please select at least one subject'); return; }
    try {
      const payload = { gradeId: assignGradeId, subjectIds: Array.from(selectedSubjectIds) };
      await toast.promise(
        track(fetchJson('/api/grades/assign-subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })),
        { loading: 'Assigning subjects…', success: 'Subjects assigned', error: (e) => `Failed to assign: ${String((e as any)?.message || e)}` }
      );

      if (form.gradeId && form.gradeId === assignGradeId) {
        const subs = await fetchJson<Subject[]>(`/api/grades/${assignGradeId}/subjects`);
        const ordered = [...subs].sort((a, b) => a.name.localeCompare(b.name));
        setAssignedSubjects(ordered);
        setSubjects(ordered);
        setPlanData(prev => {
          const next = { ...prev };
          for (const sub of ordered) if (!next[sub.id]) next[sub.id] = getPrefillFor(sub.name);
          return next;
        });
      }

      setAssignOpen(false);
    } catch {}
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !session.user || (session.user as any).role !== 'COORDINATOR') {
      router.push('/login');
      return;
    }
    if (loadedOnce.current) return;
    loadedOnce.current = true;

    const toDataUrl = async (path: string) => {
      const res = await fetch(path);
      if (!res.ok) return '';
      const blob = await res.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
      });
    };

    const load = async () => {
      await toast.promise(
        track(
          Promise.all([fetchJson<Grade[]>('/api/grades'), fetchJson<WeeklyPlan[]>('/api/weekly-plans')]).then(
            async ([g, plans]) => {
              setGrades(g);
              setWeeklyPlans(plans);
              const [logo, cognia] = await Promise.all([toDataUrl('/logo.png'), toDataUrl('/cognia.png')]);
              setLogoDataUrl(logo);
              setCogniaDataUrl(cognia);
            }
          )
        ),
        { loading: 'Loading data…', success: 'Data loaded', error: (e) => `Failed to load: ${String((e as any)?.message || e)}` }
      );
    };

    load().catch(() => undefined);
  }, [session, status, router]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGradeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const gradeId = e.target.value;
    setForm((prev) => ({ ...prev, gradeId }));
    if (!gradeId) { setAssignedSubjects([]); setPlanData({}); return; }

    try {
      const subs = await track(fetchJson<Subject[]>(`/api/grades/${gradeId}/subjects`));
      const ordered = [...subs].sort((a, b) => a.name.localeCompare(b.name));
      setAssignedSubjects(ordered);
      setSubjects(ordered);
      const init: Record<ID, PlanFields> = {};
      for (const sub of ordered) init[sub.id] = getPrefillFor(sub.name);
      setPlanData(init);
    } catch (e) {
      toast.error(String((e as any)?.message || e));
    }
  };

  const handlePlanChange = (subjectId: ID, field: keyof PlanFields, e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { value } = e.target;
    setPlanData((prev) => ({ ...prev, [subjectId]: { ...prev[subjectId], [field]: value } }));
  };

  const loadPlanForEdit = async (planId: string) => {
    try {
      const plan = await toast.promise(track(fetchJson<WeeklyPlan>(`/api/weekly-plans/${planId}`)), {
        loading: 'Loading plan…',
        success: 'Plan loaded',
        error: (e) => `Failed to load plan: ${String((e as any)?.message || e)}`,
      });

      setForm({
        id: plan.id,
        gradeId: plan.gradeId,
        week: plan.week,
        fromDate: plan.fromDate.split('T')[0],
        toDate: plan.toDate.split('T')[0],
      });

      const subs = await fetchJson<Subject[]>(`/api/grades/${plan.gradeId}/subjects`);
      const ordered = [...subs].sort((a, b) => a.name.localeCompare(b.name));
      setAssignedSubjects(ordered);
      setSubjects(ordered);

      const loaded: Record<ID, PlanFields> = {};
      for (const sub of ordered) {
        const itm = plan.items.find((x: any) => x.subjectId === sub.id);
        loaded[sub.id] = itm
          ? {
              unit: itm.unit ?? '',
              lessons: itm.lessons ?? '',
              pages: itm.pages ?? '',
              homework: '',
              classwork: '',
            }
          : getPrefillFor(sub.name);
      }
      setPlanData(loaded);
      setEditing(true);
      setShowPlan(true);
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.gradeId || !form.week || !form.fromDate || !form.toDate) {
      toast.error('Please select grade, week, and both dates');
      return;
    }

    const items = assignedSubjects.map((sub) => ({
      subjectId: sub.id,
      unit: planData[sub.id]?.unit ?? '',
      lessons: planData[sub.id]?.lessons ?? '',
      pages: planData[sub.id]?.pages ?? '',
      homework: planData[sub.id]?.homework ?? '',
      classwork: planData[sub.id]?.classwork ?? '',
    }));

    const payload = {
      gradeId: form.gradeId,
      week: form.week,
      fromDate: form.fromDate,
      toDate: form.toDate,
      items,
    };

    try {
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/api/weekly-plans/${form.id}` : '/api/weekly-plans';
      const body = editing ? JSON.stringify({ id: form.id, ...payload }) : JSON.stringify(payload);

      await toast.promise(
        track(fetchJson(url, { method, headers: { 'Content-Type': 'application/json' }, body })),
        { loading: editing ? 'Updating plan…' : 'Saving plan…', success: editing ? 'Plan updated' : 'Plan saved', error: (e) => `Failed to save plan: ${String((e as any)?.message || e)}` }
      );

      const w = await fetchJson<WeeklyPlan[]>('/api/weekly-plans');
      setWeeklyPlans(w);
      setShowPlan(true);
      setEditing(false);
    } catch {}
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    try {
      await toast.promise(track(fetchJson(`/api/weekly-plans/${planId}`, { method: 'DELETE' })), {
        loading: 'Deleting plan…',
        success: 'Plan deleted',
        error: (e) => `Failed to delete plan: ${String((e as any)?.message || e)}`,
      });
      const w = await fetchJson<WeeklyPlan[]>('/api/weekly-plans');
      setWeeklyPlans(w);
      setShowPlan(false);
    } catch {}
  };

  const effectiveMain = useMemo(
    () => subjects.filter((s) => !isArabicBlock(s.name)).sort((a, b) => a.name.localeCompare(b.name)),
    [subjects]
  );
  const arabicSubs = useMemo(
    () => subjects.filter((s) => isArabicBlock(s.name)),
    [subjects]
  );

  // Toolbar actions using refs for subject fields
  const applyWrapToField = (subId: ID, field: keyof PlanFields, delimiter: string) => {
    const ta = areaRefs.current[refKey(subId, field)];
    if (!ta) return;
    const newVal = wrapSelectionIn(ta, delimiter);
    handlePlanChange(subId, field, { target: { value: newVal } } as any);
    requestAnimationFrame(() => ta.focus());
  };

  const HighlightButton = ({ onClick, title = 'Yellow highlight (==...==)' }: { onClick: () => void; title?: string }) => (
    <button type="button" className="ml-2 rounded-md border px-2 py-1 text-xs" title={title} onClick={onClick}>Highlight</button>
  );
  const BoldButton = ({ onClick }: { onClick: () => void }) => (
    <button type="button" className="ml-2 rounded-md border px-2 py-1 text-xs" title="Bold (**...**)" onClick={onClick}>Bold</button>
  );
  const RedButton = ({ onClick }: { onClick: () => void }) => (
    <button type="button" className="ml-2 rounded-md border px-2 py-1 text-xs" title="Red highlight (~~...~~)" onClick={onClick}>Red</button>
  );

  const Toolbar = ({ subId, field }: { subId: ID; field: keyof PlanFields }) => (
    <div className="flex items-center">
      <BoldButton onClick={() => applyWrapToField(subId, field, '**')} />
      <RedButton onClick={() => applyWrapToField(subId, field, '~~')} />
      <HighlightButton onClick={() => applyWrapToField(subId, field, '==')} />
    </div>
  );

  // Notes toolbar uses its own ref
  const notesWrap = (delimiter: string) => {
    const ta = notesRef.current;
    if (!ta) return;
    const newVal = wrapSelectionIn(ta, delimiter);
    setNotes(newVal);
    requestAnimationFrame(() => ta.focus());
  };

  // Show/hide Existing Weekly Plans
  const [showRecords, setShowRecords] = useState(false);

  // Filters for Existing Weekly Plans
  const [filter, setFilter] = useState<{ gradeId: string; week: string; fromDate: string; toDate: string }>({
    gradeId: '',
    week: '',
    fromDate: '',
    toDate: '',
  });

  const filteredPlans = useMemo(() => {
    return weeklyPlans.filter((p) => {
      if (filter.gradeId && p.gradeId !== filter.gradeId) return false;
      if (filter.week && String(p.week).trim() !== String(filter.week).trim()) return false;

      if (filter.fromDate) {
        const from = new Date(filter.fromDate);
        const planFrom = new Date(p.fromDate);
        if (planFrom < from) return false;
      }
      if (filter.toDate) {
        const to = new Date(filter.toDate);
        const planTo = new Date(p.toDate);
        if (planTo > to) return false;
      }
      return true;
    });
  }, [weeklyPlans, filter]);
const printRef = useRef<HTMLDivElement | null>(null);

const onPrint = () => {
  const gradeName = grades.find((g) => g.id === form.gradeId)?.name ?? 'Grade';
  const from = form.fromDate ? new Date(form.fromDate).toLocaleDateString('en-GB').replaceAll('/', '-') : '';
  const to = form.toDate ? new Date(form.toDate).toLocaleDateString('en-GB').replaceAll('/', '-') : '';
  const week = form.week || '';
  const suggested = `${gradeName}-W${week}-${from}_to_${to}`.replace(/\s+/g, '_');

  const originalTitle = document.title;
  document.title = suggested;
  setTimeout(() => {
    window.print();
    setTimeout(() => { document.title = originalTitle; }, 250);
  }, 100);
};

  const applyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // filtering is computed by useMemo; this triggers render
    setFilter({ ...filter });
  };
  const clearFilters = () => {
    setFilter({ gradeId: '', week: '', fromDate: '', toDate: '' });
  };

  const activityPanelJSX = (
    <div className="text-[14px] leading-6">
      <p>Complete the study guide worksheet and send it to the teacher. Complete the assignment worksheet and submit answers for grading.</p>
      <p>Date: {form.toDate ? new Date(form.toDate).toLocaleDateString('en-GB') : ''}</p>
      <p>
        <span className="font-semibold">English</span>: PZY 8XM 64Z &nbsp;&nbsp;
        <span className="font-semibold">Math</span>: 2YZ NSB 9CW
      </p>
    </div>
  );
<style>{`
  @media print {
    .no-print { display: none !important; }
    .print-area { box-shadow: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`}</style>
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#f1fbf9] to-[#eaf7f5] p-6">
      <div className="mx-auto mb-6 h-1 w-full max-w-7xl rounded-full bg-[#006d77]" />

      <div className="mx-auto max-w-7xl ">
        <div className="mb-8 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#064e4f]">Coordinator Dashboard</h1>
            <p className="text-sm text-gray-600">Create and manage weekly lesson plans for grades.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRecords((s) => !s)}
              className="inline-flex items-center justify-center rounded-lg bg-[#0f766e] px-4 py-2.5 font-medium text-white shadow-sm ring-1 ring-[#0f766e]/30 transition hover:bg-[#115e59] focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:ring-offset-2"
            >
              {showRecords ? 'Hide Records' : 'Show Records'}
            </button>
            <button
              onClick={openAssignModal}
              className="inline-flex items-center justify-center rounded-lg bg-[#064e4f] px-4 py-2.5 font-medium text-white shadow-sm ring-1 ring-[#0ea5e9]/30 transition hover:bg-[#e29578] focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:ring-offset-2"
            >
              Assign Subjects
            </button>
          </div>
        </div>

        {/* Assign Subjects Modal */}
        {assignOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Assign Subjects to Grade</h3>
                <button onClick={() => setAssignOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Grade</label>
                  <select
                    value={assignGradeId}
                    onChange={(e) => setAssignGradeId(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                  >
                    <option value="">Select Grade</option>
                    {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Search subjects</label>
                  <input
                    type="text"
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    placeholder="Type to filter..."
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                  />
                </div>
              </div>

              <div className="mt-4 max-h-[340px] overflow-auto rounded-lg border border-gray-200">
                <table className="w-full table-auto text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Select</th>
                      <th className="px-3 py-2 text-left">Subject</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSubjects
                      .filter((s) => s.name.toLowerCase().includes(subjectFilter.toLowerCase()))
                      .map((s, idx) => {
                        const checked = selectedSubjectIds.has(s.id);
                        return (
                          <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2">
                              <input type="checkbox" className="h-4 w-4" checked={checked} onChange={() => toggleSubject(s.id)} />
                            </td>
                            <td className="px-3 py-2">{s.name}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <button onClick={selectAllFiltered} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm">Select filtered</button>
                  <button onClick={clearSelection} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm">Clear</button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setAssignOpen(false)} className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm">Cancel</button>
                  <button onClick={submitAssignSubjects} className="rounded-lg bg-[#0ea5e9] px-4 py-2.5 text-sm font-medium text-white shadow-sm ring-1 ring-[#0ea5e9]/30 transition hover:bg-[#0284c7]">
                    Save Assignment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Existing Plans (toggleable) */}
        {showRecords && (
          <div className="mx-auto mb-8 max-w-7xl rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
            <h2 className="mb-4 text-xl font-semibold text-[#064e4f]">Existing Weekly Plans</h2>

            {/* Filters */}
            <form onSubmit={applyFilters} className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Grade</label>
                <select
                  value={filter.gradeId}
                  onChange={(e) => setFilter((prev) => ({ ...prev, gradeId: e.target.value }))}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                >
                  <option value="">All</option>
                  {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Week</label>
                <input
                  type="text"
                  value={filter.week}
                  onChange={(e) => setFilter((prev) => ({ ...prev, week: e.target.value }))}
                  placeholder="e.g. 6"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">From Date</label>
                <input
                  type="date"
                  value={filter.fromDate}
                  onChange={(e) => setFilter((prev) => ({ ...prev, fromDate: e.target.value }))}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">To Date</label>
                <input
                  type="date"
                  value={filter.toDate}
                  onChange={(e) => setFilter((prev) => ({ ...prev, toDate: e.target.value }))}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-[#006d77] px-4 py-2.5 text-sm font-medium text-white shadow-sm ring-1 ring-[#0ea5e9]/30 transition hover:bg-[#0284c7]"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm"
                >
                  Clear
                </button>
              </div>
            </form>

            <div className="overflow-scroll rounded-xl ring-1 ring-gray-200 shadow-sm max-h-96 ">
              <table className="w-full table-auto text-sm">
                <thead className="bg-[#006d77] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Grade</th>
                    <th className="px-4 py-3 text-left font-semibold">Week</th>
                    <th className="px-4 py-3 text-left font-semibold">From Date</th>
                    <th className="px-4 py-3 text-left font-semibold">To Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPlans.map((plan, idx) => (
                    <tr key={plan.id} className={idx % 2 === 0 ? 'bg-white hover:bg-[#83c5be]/10 transition-colors' : 'bg-gray-50 hover:bg-[#83c5be]/10 transition-colors'}>
                      <td className="px-4 py-3">{plan.grade?.name}</td>
                      <td className="px-4 py-3">{plan.week}</td>
                      <td className="px-4 py-3">{new Date(plan.fromDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3">{new Date(plan.toDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => loadPlanForEdit(plan.id)} className="mr-2 rounded-md bg-[#006d77] px-3 py-1.5 text-white shadow-sm ring-1 ring-[#006d77]/20 transition hover:bg-[#006d77]/90">Edit</button>
                        <button onClick={() => handleDelete(plan.id)} className="rounded-md bg-[#e29578] px-3 py-1.5 text-white shadow-sm ring-1 ring-[#e29578]/20 transition hover:bg-[#e29578]/90">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {filteredPlans.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500">No records match the current filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create/Edit Weekly Plan */}
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
          <h2 className="mb-4 text-xl font-semibold text-[#064e4f]">{editing ? 'Edit' : 'Create'} Weekly Lesson Plan</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Grade</label>
                <select
                  name="gradeId"
                  value={form.gradeId}
                  onChange={handleGradeChange}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                  required
                >
                  <option value="">Select Grade</option>
                  {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Week</label>
                <input
                  type="text"
                  name="week"
                  value={form.week}
                  onChange={handleFormChange}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                  placeholder="e.g. 6"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">From Date</label>
                <input
                  type="date"
                  name="fromDate"
                  value={form.fromDate}
                  onChange={handleFormChange}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">To Date</label>
                <input
                  type="date"
                  name="toDate"
                  value={form.toDate}
                  onChange={handleFormChange}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                  required
                />
              </div>
            </div>

            {/* Notes with toolbar and same formatting */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <div className="flex items-center">
                  <BoldButton onClick={() => notesWrap('**')} />
                  <RedButton onClick={() => notesWrap('~~')} />
                  <HighlightButton title="Yellow highlight (==...==)" onClick={() => notesWrap('==')} />
                </div>
              </div>
              <textarea
                ref={notesRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                placeholder="Use **bold**, ==yellow==, ~~red~~ or ::Full line highlight"
              />
            </div>

            {assignedSubjects.length > 0 && (
              <div className="space-y-6">
                {assignedSubjects.map((sub) => {
                  const data = planData[sub.id] || { unit: '', lessons: '', pages: '', homework: '', classwork: '' };
                  const dir = isArabicBlock(sub.name) ? 'rtl' : 'ltr';
                  return (
                    <div key={sub.id} className="rounded-lg border border-gray-200 p-4">
                      <h3 className="mb-3 text-lg font-medium text-[#064e4f]" style={{ direction: dir }}>
                        {toDisplayName(sub.name)}
                      </h3>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div data-field-container>
                          <div className="flex items-center justify-between">
                            <label className="mb-1 block text-sm font-medium text-gray-700">Unit</label>
                            <Toolbar subId={sub.id} field="unit" />
                          </div>
                          <textarea
                            ref={(el) => { areaRefs.current[refKey(sub.id, 'unit')] = el; }}
                            value={data.unit}
                            onChange={(e) => handlePlanChange(sub.id, 'unit', e)}
                            rows={4}
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                            style={{ direction: dir }}
                            placeholder="Use **bold**, ==yellow==, ~~red~~ or ::Full line highlight"
                          />
                        </div>

                        <div data-field-container>
                          <div className="flex items-center justify-between">
                            <label className="mb-1 block text-sm font-medium text-gray-700">Lessons</label>
                            <Toolbar subId={sub.id} field="lessons" />
                          </div>
                          <textarea
                            ref={(el) => { areaRefs.current[refKey(sub.id, 'lessons')] = el; }}
                            value={data.lessons}
                            onChange={(e) => handlePlanChange(sub.id, 'lessons', e)}
                            rows={4}
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                            style={{ direction: dir }}
                            placeholder="Use **bold**, ==yellow==, ~~red~~ or ::Full line highlight"
                          />
                        </div>

                        <div data-field-container>
                          <div className="flex items-center justify-between">
                            <label className="mb-1 block text-sm font-medium text-gray-700">Page Number</label>
                            <Toolbar subId={sub.id} field="pages" />
                          </div>
                          <textarea
                            ref={(el) => { areaRefs.current[refKey(sub.id, 'pages')] = el; }}
                            value={data.pages}
                            onChange={(e) => handlePlanChange(sub.id, 'pages', e)}
                            rows={4}
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                            style={{ direction: dir }}
                            placeholder="Use **bold**, ==yellow==, ~~red~~ or ::Full line highlight"
                          />
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div data-field-container>
                          <div className="flex items-center justify-between">
                            <label className="mb-1 block text-sm font-medium text-gray-700">Homework</label>
                            <Toolbar subId={sub.id} field="homework" />
                          </div>
                          <textarea
                            ref={(el) => { areaRefs.current[refKey(sub.id, 'homework')] = el; }}
                            value={data.homework}
                            onChange={(e) => handlePlanChange(sub.id, 'homework', e)}
                            rows={4}
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                            style={{ direction: dir }}
                            placeholder="Use **bold**, ==yellow==, ~~red~~ or ::Full line highlight"
                          />
                        </div>

                        <div data-field-container>
                          <div className="flex items-center justify-between">
                            <label className="mb-1 block text-sm font-medium text-gray-700">Class work</label>
                            <Toolbar subId={sub.id} field="classwork" />
                          </div>
                          <textarea
                            ref={(el) => { areaRefs.current[refKey(sub.id, 'classwork')] = el; }}
                            value={data.classwork}
                            onChange={(e) => handlePlanChange(sub.id, 'classwork', e)}
                            rows={4}
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                            style={{ direction: dir }}
                            placeholder="Use **bold**, ==yellow==, ~~red~~ or ::Full line highlight"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="submit"
              disabled={pendingCount > 0 || assignedSubjects.length === 0}
              className="mt-4 w-full rounded-lg bg-[#006d77] px-4 py-2.5 font-medium text-white shadow-sm ring-1 ring-[#006d77]/20 transition hover:bg-[#006d77]/90 focus:outline-none focus:ring-2 focus:ring-[#006d77] focus:ring-offset-2 disabled:opacity-60"
            >
              {editing ? 'Update Plan in DB' : 'Save Plan to DB'}
            </button>
          </form>
        </div>

        {/* Preview with formatting */}
        <div className='print-section w-full'>
          {showPlan && (
  <div ref={printRef} className="mx-auto mt-8 w-full rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100 px-8 print-area">

            <div className="relative mb-3 rounded-lg border-black p-4 text-center">
              <img src="/cognia.png" alt="Accreditation badge" className="absolute left-[-18px] top-[-18px] h-24 w-24 rounded-full object-contain" />
              <img src="/logo.png" alt="School logo" className="absolute right-[-18px] top-[-18px] h-24 w-24 rounded-full object-contain" />
              <div className="text-2xl font-extrabold">
                AL FORQAN PRIVATE SCHOOL "AMERICAN DIVISION"
                <br />
                AL BATOOL INTERNATIONAL SCHOOL
              </div>

              <div className="text-2xl font-bold text-red-500 border-2 border-black mt-4 py-2 rounded-3xl">
                <div className="mt-1 text-xl font-extrabold text-[#006d77] mb-2">Weekly Planner</div>
                Week: ({form.week}) – 1st Semester &nbsp;&nbsp; From:{' '}
                {form.fromDate && new Date(form.fromDate).toLocaleDateString('en-GB')} &nbsp;&nbsp; to:{' '}
                {form.toDate && new Date(form.toDate).toLocaleDateString('en-GB')} &nbsp;&nbsp; Grade (
                {grades.find((c) => c.id === form.gradeId)?.name || ''})
              </div>
            </div>

            <table className="w-full table-fixed font-bold">
              <thead className="bg-gray-200 text-center">
                <tr className="text-center">
                  <th className="w-[18%] border-2 border-black px-3 py-2 font-bold">Subject</th>
                  <th className="border-2 border-black px-3 py-2 font-bold">Class work</th>
                  <th className="w-[34%] border-2 border-black px-3 py-2 font-bold">Activity – Homework</th>
                </tr>
              </thead>
              <tbody>
                {effectiveMain.map((sub, idx) => {
                  const d = planData[sub.id] || { unit: '', lessons: '', pages: '', homework: '', classwork: '' };
                  const classWorkText = [d.lessons || '', d.unit || ''].filter(Boolean).join('\n');
                  const activityText = [d.homework || '', d.classwork || ''].filter(Boolean).join('\n');
                  return (
                    <tr key={sub.id} className={idx % 2 === 0 ? 'bg-gray-100' : 'bg-white'}>
                      <td className="border-2 border-black px-3 py-2 font-bold text-xl text-center">{toDisplayName(sub.name)}</td>
                      <td className="border-2 border-black px-3 py-2 align-top">
                        <div dangerouslySetInnerHTML={{ __html: renderWithHighlight(classWorkText) }} />
                      </td>
                      <td className="border-2 border-black px-3 py-2 align-top">
                        <div dangerouslySetInnerHTML={{ __html: renderWithHighlight(activityText) }} />
                      </td>
                    </tr>
                  );
                })}

                {/* Worksheet header row */}
                <tr>
                  <td className="border-2 border-black px-3 py-2"></td>
                  <td className="border-2 border-black px-3 py-2"></td>
                  <td className="border-2 border-black px-3 py-2 text-center font-bold">Worksheet</td>
                </tr>

                {/* Arabic rows */}
                {arabicSubs.map((sub, idx) => {
                  const d = planData[sub.id] || { unit: '', lessons: '', pages: '', homework: '', classwork: '' };
                  const rightText = [d.unit, d.lessons, d.homework, d.classwork].filter(Boolean).join(' — ');
                  return (
                    <tr key={sub.id} className={idx % 2 === 0 ? 'bg-gray-100' : 'bg-white'}>
                      <td className="border-2 border-black px-3 py-2 font-bold text-xl text-center" dir="rtl">
                        {toDisplayName(sub.name)}
                      </td>
                      <td className="border-2 border-black px-3 py-2 align-top" dir="rtl">
                        <div className="font-semibold text-xl" dangerouslySetInnerHTML={{ __html: renderWithHighlight(d.pages || '') }} />
                      </td>
                      <td className="border-2 border-black px-3 py-2 align-top" dir="rtl">
                        <div className="font-semibold text-xl" dangerouslySetInnerHTML={{ __html: renderWithHighlight(rightText) }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Notes preview with formatting */}
            {notes.trim().length > 0 && (
              <div className="mt-3 rounded border-2 border-black p-3">
                <div className="mb-1 font-bold">Notes</div>
                <div dangerouslySetInnerHTML={{ __html: renderWithHighlight(notes) }} />
              </div>
            )}
          </div>
        )}
        </div>
        {/* Save / Print button */}
<div className="no-print mt-6 flex justify-end">
  <button
    onClick={onPrint}
    className="inline-flex items-center justify-center rounded-lg bg-[#006d77] px-4 py-2.5 font-medium text-white shadow-sm ring-1 ring-[#006d77]/30 transition hover:bg-[#005c66]"
  >
    Save / Print
  </button>
</div>

      </div>

      {pendingCount > 0 && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/10 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-lg ring-1 ring-gray-200">
            <span className="h-3 w-3 animate-ping rounded-full bg-[#006d77]" />
            <span className="text-sm text-gray-700">Working...</span>
          </div>
        </div>
      )}
    </div>
  );
}
