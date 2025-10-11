'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import { ID, Grade, Subject, WeeklyPlan, PlanFields } from '../components/types';
import { usePending, fetchJson } from '../components/hooks';
import { WeeklyPlanFilters } from '../components/WeeklyPlanFilters';
import { WeeklyPlanTable } from '../components/WeeklyPlanTable';
import { AssignSubjectsModal } from '../components/AssignSubjectsModal';
import { RemoveSubjectsModal } from '../components/RemoveSubjectsModal';
import { SubjectEditors } from '../components/SubjectEditors';
import { WeeklyPlanPreview } from '../components/WeeklyPlanPreview';
import { buildSuggestedFileName } from '../components/print';

/* Prefill and alias map copied from the original */
const prefillExample: Record<string, PlanFields> = {
  English: { unit: 'Unit 1: Elements of Literature\nUnit 2: Analyzing Literature', lessons: 'Unit 1: Lesson 5: Wrap-Up: Elements of Literature\nUnit 2: Lesson 1: Poetry', pages: 'Unit 1: Lesson 5: P. 24 – 26', homework: 'Complete the study guide worksheet and send it to the teacher.\nIXL Codes: PZY 8XM 64Z', classwork: 'Complete the assignment worksheet and submit answers for grading.' },
  Math: { unit: 'Unit 2: Signed Numbers', lessons: 'Unit 2: Lesson 3: Absolute Value\nUnit 2: Lesson 4: Wrap-Up: Signed Numbers', pages: '', homework: 'IXL Codes: 2YZ NSB 9CW', classwork: '' },
  Science: { unit: '', lessons: 'Unit 2: Lesson 2: Tools and Measurement', pages: 'P.27', homework: '', classwork: '' },
  'Social Studies': { unit: '', lessons: '', pages: 'Complete your work in p. 23', homework: '', classwork: '' },
  'Life Skills': { unit: 'Unit (1): My Success Skills', lessons: '', pages: 'P.26 - 29', homework: 'Complete your study guide worksheet', classwork: 'Checkup and review: Complete the exercises to review what was learned and watch the review video\nPractice: Complete the assignment worksheet and submit answers for grading. Take the quiz online.' },
  Computer: { unit: '6 - 12', lessons: 'Microsoft Excel: Revision', pages: 'Worksheet', homework: '', classwork: 'Formatting Cells using Microsoft Excel - Charts' },
  'اللغة العربية': { unit: 'الوحدة الأولى - قدوات ومثل عليا', lessons: 'اتبع مهارات القطع والوصل والهمزة المتوسطة', pages: '٣٧-٤٧-٥٧-٦٧-٧٧', homework: 'الواجب صفحة ٧٧', classwork: '' },
  'الدراسات الإسلامية': { unit: '1 - 2', lessons: 'التوحيد: مظاهر الشرك\nالحديث: محبته صلى الله عليه وسلم لذوي رحمه\nالفقه: صلاة العيدين\nالقرآن: حفظ سورة القلم 1-34', pages: 'التوحيد: 34\nالحديث: 57\nالفقه: 110', homework: 'التوحيد: 36\nالحديث: 60\nالفقه: 113', classwork: '' },
  'الدراسات الاجتماعية باللغة العربية': { unit: 'الوحدة الأولى والوحدة الثانية', lessons: 'أئمة الدولة السعودية الأولى', pages: '', homework: 'نشاط 2', classwork: 'معرفة مراحل تأسيس الدولة السعودية الأولى' },
};

const aliasToExampleKey: Record<string, string> = {
  Arabic: 'اللغة العربية',
  Islamic: 'الدراسات الإسلامية',
  'Social Arabic': 'الدراسات الاجتماعية باللغة العربية',
  ICT: 'Computer',
  LifeSkills: 'Life Skills',
  'Life Skills': 'Life Skills',
};

const canonicalKey = (dbName: string) => aliasToExampleKey[dbName] || dbName;
const getPrefillFor = (dbName: string): PlanFields => {
  const key = canonicalKey(dbName);
  return prefillExample[key] || { unit: '', lessons: '', pages: '', homework: '', classwork: '' };
};

export default function CoordinatorPage() {
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

  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeGradeId, setRemoveGradeId] = useState<ID>('');
  const [removeSubjectFilter, setRemoveSubjectFilter] = useState('');
  const [removeCandidates, setRemoveCandidates] = useState<Subject[]>([]);
  const [removeSelected, setRemoveSelected] = useState<Set<ID>>(new Set());

  const [form, setForm] = useState<{ id: ID; gradeId: ID; week: string; fromDate: string; toDate: string }>({
    id: '', gradeId: '', week: '', fromDate: '', toDate: '',
  });

  const [planData, setPlanData] = useState<Record<ID, PlanFields>>({});
  const [assignedSubjects, setAssignedSubjects] = useState<Subject[]>([]);
  const [showPlan, setShowPlan] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState('');

  const { pendingCount, track } = usePending();
  const loadedOnce = useRef(false);

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

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !session.user || (session.user as any).role !== 'COORDINATOR') { router.push('/login'); return; }
    if (loadedOnce.current) return;
    loadedOnce.current = true;

    const load = async () => {
      await toast.promise(
        track(Promise.all([fetchJson<Grade[]>('/api/grades'), fetchJson<WeeklyPlan[]>('/api/weekly-plans')]).then(([g, plans]) => {
          setGrades(g);
          setWeeklyPlans(plans);
        })),
        { loading: 'Loading data…', success: 'Data loaded', error: (e) => `Failed to load: ${String((e as any)?.message || e)}` }
      );
    };

    load().catch(() => undefined);
  }, [session, status, router, track]);

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
    } catch (e) { toast.error(String((e as any)?.message || e)); }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlanChange = (subjectId: ID, field: keyof PlanFields, v: string) => {
    setPlanData((prev) => ({ ...prev, [subjectId]: { ...prev[subjectId], [field]: v } }));
  };

  const loadPlanForEdit = async (planId: string) => {
    try {
      const plan = await toast.promise(track(fetchJson<WeeklyPlan>(`/api/weekly-plans/${planId}`)), {
        loading: 'Loading plan…', success: 'Plan loaded', error: (e) => `Failed to load plan: ${String((e as any)?.message || e)}`,
      });

      setForm({ id: plan.id, gradeId: plan.gradeId, week: plan.week, fromDate: plan.fromDate.split('T')[0], toDate: plan.toDate.split('T')[0] });

      const subs = await fetchJson<Subject[]>(`/api/grades/${plan.gradeId}/subjects`);
      const ordered = [...subs].sort((a, b) => a.name.localeCompare(b.name));
      setAssignedSubjects(ordered);
      setSubjects(ordered);

      const loaded: Record<ID, PlanFields> = {};
      for (const sub of ordered) {
        const itm = plan.items.find((x: any) => x.subjectId === sub.id);
        loaded[sub.id] = itm ? { unit: itm.unit ?? '', lessons: itm.lessons ?? '', pages: itm.pages ?? '', homework: '', classwork: '' } : getPrefillFor(sub.name);
      }
      setPlanData(loaded);
      setEditing(true);
      setShowPlan(true);
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.gradeId || !form.week || !form.fromDate || !form.toDate) { toast.error('Please select grade, week, and both dates'); return; }
    const items = assignedSubjects.map((sub) => ({
      subjectId: sub.id,
      unit: planData[sub.id]?.unit ?? '',
      lessons: planData[sub.id]?.lessons ?? '',
      pages: planData[sub.id]?.pages ?? '',
      homework: planData[sub.id]?.homework ?? '',
      classwork: planData[sub.id]?.classwork ?? '',
    }));
    const payload = { gradeId: form.gradeId, week: form.week, fromDate: form.fromDate, toDate: form.toDate, items };
    try {
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/api/weekly-plans/${form.id}` : '/api/weekly-plans';
      const body = editing ? JSON.stringify({ id: form.id, ...payload }) : JSON.stringify(payload);
      await toast.promise(track(fetchJson(url, { method, headers: { 'Content-Type': 'application/json' }, body })), {
        loading: editing ? 'Updating plan…' : 'Saving plan…', success: editing ? 'Plan updated' : 'Plan saved', error: (e) => `Failed to save plan: ${String((e as any)?.message || e)}`,
      });
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
        loading: 'Deleting plan…', success: 'Plan deleted', error: (e) => `Failed to delete plan: ${String((e as any)?.message || e)}`,
      });
      const w = await fetchJson<WeeklyPlan[]>('/api/weekly-plans');
      setWeeklyPlans(w);
      setShowPlan(false);
    } catch {}
  };

  // Assign modal logic
  const openAssignModal = async () => {
    try {
      if (grades.length === 0) setGrades(await fetchJson<Grade[]>('/api/grades'));
      const subs = await fetchJson<Subject[]>('/api/subjects');
      setAllSubjects([...subs].sort((a, b) => a.name.localeCompare(b.name)));
      setAssignGradeId(''); setSelectedSubjectIds(new Set()); setSubjectFilter(''); setAssignOpen(true);
    } catch (e) { toast.error(String((e as any)?.message || e)); }
  };
  const toggleSubject = (id: ID) => setSelectedSubjectIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const selectAllFiltered = () => setSelectedSubjectIds(new Set(allSubjects.filter(s => s.name.toLowerCase().includes(subjectFilter.toLowerCase())).map(s => s.id)));
  const clearSelection = () => setSelectedSubjectIds(new Set());
  const submitAssignSubjects = async () => {
    if (!assignGradeId) { toast.error('Please select a grade'); return; }
    if (selectedSubjectIds.size === 0) { toast.error('Please select at least one subject'); return; }
    try {
      const payload = { gradeId: assignGradeId, subjectIds: Array.from(selectedSubjectIds) };
      await toast.promise(track(fetchJson('/api/grades/assign-subjects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })), {
        loading: 'Assigning subjects…', success: 'Subjects assigned', error: (e) => `Failed to assign: ${String((e as any)?.message || e)}`,
      });
      if (form.gradeId && form.gradeId === assignGradeId) {
        const subs = await fetchJson<Subject[]>(`/api/grades/${assignGradeId}/subjects`);
        const ordered = [...subs].sort((a, b) => a.name.localeCompare(b.name));
        setAssignedSubjects(ordered);
        setSubjects(ordered);
        setPlanData(prev => { const next = { ...prev }; for (const sub of ordered) if (!next[sub.id]) next[sub.id] = getPrefillFor(sub.name); return next; });
      }
      setAssignOpen(false);
    } catch {}
  };

  // Remove modal logic
  const openRemoveModal = async () => {
    try {
      if (grades.length === 0) setGrades(await fetchJson<Grade[]>('/api/grades'));
      setRemoveGradeId(''); setRemoveSubjectFilter(''); setRemoveCandidates([]); setRemoveSelected(new Set()); setRemoveOpen(true);
    } catch (e) { toast.error(String((e as any)?.message || e)); }
  };
  const loadRemoveCandidates = async (gradeId: ID) => {
    if (!gradeId) { setRemoveCandidates([]); return; }
    try {
      const subs = await fetchJson<Subject[]>(`/api/grades/${gradeId}/subjects`);
      setRemoveCandidates([...subs].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) { toast.error(String((e as any)?.message || e)); }
  };
  const removeToggle = (id: ID) => setRemoveSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const removeSelectFiltered = () => setRemoveSelected(new Set(removeCandidates.filter(s => s.name.toLowerCase().includes(removeSubjectFilter.toLowerCase())).map(s => s.id)));
  const removeClear = () => setRemoveSelected(new Set());
  const submitRemoveSubjects = async () => {
    if (!removeGradeId) { toast.error('Please select a grade'); return; }
    if (removeSelected.size === 0) { toast.error('Please select at least one subject'); return; }
    try {
      const payload = { gradeId: removeGradeId, subjectIds: Array.from(removeSelected) };
      await toast.promise(track(fetchJson('/api/grades/remove-subjects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })), {
        loading: 'Removing subjects…', success: 'Subjects removed', error: (e) => `Failed to remove: ${String((e as any)?.message || e)}`,
      });
      if (form.gradeId && form.gradeId === removeGradeId) {
        const subs = await fetchJson<Subject[]>(`/api/grades/${removeGradeId}/subjects`);
        const ordered = [...subs].sort((a, b) => a.name.localeCompare(b.name));
        setAssignedSubjects(ordered);
        setSubjects(ordered);
        setPlanData(prev => { const next: Record<ID, PlanFields> = {}; for (const s of ordered) next[s.id] = prev[s.id] ?? getPrefillFor(s.name); return next; });
      }
      setRemoveOpen(false);
    } catch {}
  };

  // Records filter
  const [showRecords, setShowRecords] = useState(false);
  const [filter, setFilter] = useState<{ gradeId: string; week: string; fromDate: string; toDate: string }>({ gradeId: '', week: '', fromDate: '', toDate: '' });
  const filteredPlans = useMemo(() => {
    return weeklyPlans.filter((p) => {
      if (filter.gradeId && p.gradeId !== filter.gradeId) return false;
      if (filter.week && String(p.week).trim() !== String(filter.week).trim()) return false;
      if (filter.fromDate && new Date(p.fromDate) < new Date(filter.fromDate)) return false;
      if (filter.toDate && new Date(p.toDate) > new Date(filter.toDate)) return false;
      return true;
    });
  }, [weeklyPlans, filter]);
  const applyFilters = (e?: React.FormEvent) => { if (e) e.preventDefault(); setFilter({ ...filter }); };
  const clearFilters = () => setFilter({ gradeId: '', week: '', fromDate: '', toDate: '' });

  // Old full-page print button behavior (kept)
  

  // New: print only the weekly plan section (admin pattern)
  const handlePrintWeeklyPlan = () => {
    const section = document.getElementById('weekly-plan-page');
    if (!section) return;

    // Suggested title from existing logic
    const gradeName = grades.find((g) => g.id === form.gradeId)?.name ?? 'Grade';
    const title = buildSuggestedFileName(gradeName, form.week, form.fromDate);

    // Clone the section’s HTML
    const content = section.outerHTML;

    const printWindow = window.open('', '_blank');
    const stylesheet = `
      body { font-family: Arial, sans-serif; margin: 20px; }
      .print-header { text-align: center; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 2px solid #000; padding: 8px; vertical-align: top; }
      thead th { background-color: #e5e7eb; color: #000; }
      tr:nth-child(odd) { background: #f8fafc; }
      .text-center { text-align: center; }
      .font-bold { font-weight: 700; }
      .font-extrabold { font-weight: 800; }
      .text-xl { font-size: 1.25rem; }
      .text-2xl { font-size: 1.5rem; }
      .bg-gray-100 { background-color: #f5f5f5; }
      .bg-white { background: #ffffff; }
      .text-red-500 { color: #ef4444; }
      .border-2 { border-width: 2px; }
      .border-black { border-color: #000; }
      .rounded-3xl { border-radius: 1.5rem; }
      .rounded { border-radius: 0.25rem; }
      .rounded-lg { border-radius: 0.5rem; }
      .p-3 { padding: 0.75rem; }
      .p-4 { padding: 1rem; }
      .p-6 { padding: 1.5rem; }
      .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
      .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
      .mb-1 { margin-bottom: 0.25rem; }
      .mb-2 { margin-bottom: 0.5rem; }
      .mb-3 { margin-bottom: 0.75rem; }
      .mt-1 { margin-top: 0.25rem; }
      .mt-3 { margin-top: 0.75rem; }
      .mt-4 { margin-top: 1rem; }
      .w-full { width: 100%; }
      .table-fixed { table-layout: fixed; }
      .align-top { vertical-align: top; }
      .print-area { box-shadow: none !important; }
      @page { margin: 16mm; }
      @media print {
        body { margin: 0; }
      }
      /* Ensure images inside header stay positioned */
      .print-header img { object-fit: contain; border-radius: 9999px; }
    `;

    printWindow?.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>${stylesheet}</style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    printWindow?.document.close();
    printWindow?.focus();
    printWindow?.print();
  };

  const loadPlanIntoPreview = async (plan: WeeklyPlan) => {
    setForm({ id: plan.id, gradeId: plan.gradeId, week: plan.week, fromDate: plan.fromDate.split('T')[0], toDate: plan.toDate.split('T')[0] });
    const subs = await fetchJson<Subject[]>(`/api/grades/${plan.gradeId}/subjects`);
    const ordered = [...subs].sort((a, b) => a.name.localeCompare(b.name));
    setAssignedSubjects(ordered);
    setSubjects(ordered);
    const loaded: Record<ID, PlanFields> = {};
    for (const sub of ordered) {
      const itm = plan.items.find((x: any) => x.subjectId === sub.id);
      loaded[sub.id] = itm ? { unit: itm.unit ?? '', lessons: itm.lessons ?? '', pages: itm.pages ?? '', homework: itm.homework ?? '', classwork: itm.classwork ?? '' } : getPrefillFor(sub.name);
    }
    setPlanData(loaded);
    setNotes('');
    setShowPlan(true);
  };

  const downloadPlanAsPdf = async (planId: string) => {
    try {
      const plan = await toast.promise(track(fetchJson<WeeklyPlan>(`/api/weekly-plans/${planId}`)), {
        loading: 'Preparing PDF…', success: 'Ready', error: (e) => `Failed: ${String((e as any)?.message || e)}`,
      });
      await loadPlanIntoPreview(plan);

      const gradeName = grades.find((g) => g.id === plan.gradeId)?.name ?? 'Grade';
      const suggested = buildSuggestedFileName(gradeName, plan.week, plan.fromDate);

      const originalTitle = document.title;
      document.title = suggested;
      setTimeout(() => {
        window.print();
        setTimeout(() => { document.title = originalTitle; }, 250);
      }, 150);
    } catch {}
  };
 const onDownloadOnlySection = async (planId: string) => {
    try {
      const plan = await toast.promise(fetchJson<WeeklyPlan>(`/api/weekly-plans/${planId}`), {
        loading: 'Preparing…',
        success: 'Ready',
        error: (e) => `Failed: ${String((e as any)?.message || e)}`,
      });

      // Ensure preview state is populated for the target plan
      await loadPlanIntoPreview(plan);

      // Slight delay to let React mount the preview DOM
      setTimeout(() => {
        const section = document.getElementById('weekly-plan-page');
        if (!section) return;

        const gradeName = grades.find((g) => g.id === plan.gradeId)?.name ?? 'Grade';
        const title = buildSuggestedFileName(gradeName, plan.week, plan.fromDate);
        const content = section.outerHTML;

        const printWindow = window.open('', '_blank');
        const stylesheet = `
          body { font-family: Arial, sans-serif; margin: 20px; }
          .print-header { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 2px solid #000; padding: 8px; vertical-align: top; }
          thead th { background-color: #e5e7eb; color: #000; }
          tr:nth-child(odd) { background: #f8fafc; }
          .text-center { text-align: center; }
          .font-bold { font-weight: 700; }
          .font-extrabold { font-weight: 800; }
          .text-xl { font-size: 1.25rem; }
          .text-2xl { font-size: 1.5rem; }
          .bg-gray-100 { background-color: #f5f5f5; }
          .bg-white { background: #ffffff; }
          .text-red-500 { color: #ef4444; }
          .border-2 { border-width: 2px; }
          .border-black { border-color: #000; }
          .rounded-3xl { border-radius: 1.5rem; }
          .rounded, .rounded-lg { border-radius: 0.5rem; }
          .p-3 { padding: 0.75rem; }
          .p-4 { padding: 1rem; }
          .p-6 { padding: 1.5rem; }
          .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
          .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
          .mb-1 { margin-bottom: 0.25rem; }
          .mb-2 { margin-bottom: 0.5rem; }
          .mb-3 { margin-bottom: 0.75rem; }
          .mt-1 { margin-top: 0.25rem; }
          .mt-3 { margin-top: 0.75rem; }
          .mt-4 { margin-top: 1rem; }
          .w-full { width: 100%; }
          .table-fixed { table-layout: fixed; }
          .align-top { vertical-align: top; }
          .print-area { box-shadow: none !important; }
          @page { margin: 16mm; }
          @media print { body { margin: 0; } }
          .print-header img { object-fit: contain; border-radius: 9999px; }
        `;

        printWindow?.document.write(`
          <html>
            <head>
              <title>${title}</title>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <style>${stylesheet}</style>
            </head>
            <body>
              ${content}
            </body>
          </html>
        `);
        printWindow?.document.close();
        printWindow?.focus();
        printWindow?.print();
      }, 150);
    } catch {}
  };
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
              className="inline-flex items-center justify-center rounded-lg bg-[#0f766e] px-4 py-2.5 font-medium text-white shadow-sm ring-1 ring-[#0f766e]/30 transition hover:bg-[#115e59]"
            >
              {showRecords ? 'Hide Records' : 'Show Records'}
            </button>
            <button
              onClick={openAssignModal}
              className="inline-flex items-center justify-center rounded-lg bg-[#064e4f] px-4 py-2.5 font-medium text-white shadow-sm ring-1 ring-[#0ea5e9]/30 transition hover:bg-[#e29578]"
            >
              Assign Subjects
            </button>
            <button
              onClick={openRemoveModal}
              className="inline-flex items-center justify-center rounded-lg bg-[#f95959] px-4 py-2.5 font-medium text-white shadow-sm ring-1 ring-[#b91c1c]/30 transition hover:bg-[#991b1b]"
            >
              Remove Subjects
            </button>
          </div>
        </div>

        {/* Assign Subjects Modal */}
        <AssignSubjectsModal
          open={assignOpen}
          grades={grades}
          allSubjects={allSubjects}
          assignGradeId={assignGradeId}
          subjectFilter={subjectFilter}
          selectedSubjectIds={selectedSubjectIds}
          setAssignGradeId={setAssignGradeId}
          setSubjectFilter={setSubjectFilter}
          toggleSubject={toggleSubject}
          selectAllFiltered={selectAllFiltered}
          clearSelection={clearSelection}
          onClose={() => setAssignOpen(false)}
          onSave={submitAssignSubjects}
        />

        {/* Remove Subjects Modal */}
        <RemoveSubjectsModal
          open={removeOpen}
          grades={grades}
          removeGradeId={removeGradeId}
          removeSubjectFilter={removeSubjectFilter}
          removeCandidates={removeCandidates}
          removeSelected={removeSelected}
          setRemoveOpen={setRemoveOpen}
          setRemoveGradeId={setRemoveGradeId}
          setRemoveSubjectFilter={setRemoveSubjectFilter}
          toggle={removeToggle}
          selectFiltered={removeSelectFiltered}
          clear={removeClear}
          onSubmit={submitRemoveSubjects}
          onLoadCandidates={loadRemoveCandidates}
        />

        {/* Existing Plans */}
        {showRecords && (
          <div className="mx-auto mb-8 max-w-7xl rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
            <h2 className="mb-4 text-xl font-semibold text-[#064e4f]">Existing Weekly Plans</h2>

            <WeeklyPlanFilters
              grades={grades}
              filter={filter}
              setFilter={setFilter}
              onApply={applyFilters}
              onClear={clearFilters}
            />

            <WeeklyPlanTable
              plans={filteredPlans}
              onEdit={loadPlanForEdit}
              onDelete={handleDelete}
              onDownload={onDownloadOnlySection}
              
            />
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

            {/* Notes */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <div className="flex items-center gap-2">
                  <button type="button" className="ml-2 rounded-md border px-2 py-1 text-xs" onClick={() => setNotes((v) => `**${v}**`)}>Bold</button>
                  <button type="button" className="ml-2 rounded-md border px-2 py-1 text-xs" onClick={() => setNotes((v) => `~~${v}~~`)}>Red</button>
                  <button type="button" className="ml-2 rounded-md border px-2 py-1 text-xs" onClick={() => setNotes((v) => `==${v}==`)}>Highlight</button>
                </div>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
              />
            </div>

            {/* Subject editors */}
            {assignedSubjects.length > 0 && (
              <SubjectEditors
                subjects={assignedSubjects}
                isArabic={isArabicBlock}
                planData={planData}
                onChange={handlePlanChange}
                toDisplay={toDisplayName}
              />
            )}

            <button
              type="submit"
              disabled={pendingCount > 0 || assignedSubjects.length === 0}
              className="mt-4 w-full rounded-lg bg-[#006d77] px-4 py-2.5 font-medium text-white shadow-sm ring-1 ring-[#006d77]/20 transition hover:bg-[#006d77]/90 disabled:opacity-60"
            >
              {editing ? 'Update Plan in DB' : 'Save Plan to DB'}
            </button>
          </form>
        </div>

        {/* Preview */}
        <WeeklyPlanPreview
          show={showPlan}
          grades={grades}
          form={form}
          effectiveMain={useMemo(() => subjects.filter((s) => !isArabicBlock(s.name)).sort((a, b) => a.name.localeCompare(b.name)), [subjects])}
          arabicSubs={useMemo(() => subjects.filter((s) => isArabicBlock(s.name)), [subjects])}
          planData={planData}
          notes={notes}
        />

        {/* Save / Print buttons */}
        <div className="no-print mt-6 flex justify-end gap-2">
          <button
            onClick={handlePrintWeeklyPlan}
            className="inline-flex items-center justify-center rounded-lg bg-[#0f766e] px-4 py-2.5 font-medium text-white shadow-sm ring-1 ring-[#0f766e]/30 transition hover:bg-[#115e59]"
          >
            Print Weekly 
          </button>
          
        </div>
      </div>

      {/* Global loading overlay */}
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
