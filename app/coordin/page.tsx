'use client';

import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, HeadingLevel, TextDirection
} from 'docx';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';

import { ID, Grade, Subject, WeeklyPlan, PlanFields } from '../components/types';
import { usePending, fetchJson } from '../components/hooks';
import { AssignSubjectsModal } from '../components/AssignSubjectsModal';
import { RemoveSubjectsModal } from '../components/RemoveSubjectsModal';
import { WeeklyPlanPreview } from '../components/WeeklyPlanPreview';
import { buildSuggestedFileName } from '../components/print';
import { isArabicBlock } from '../libs/subjects';
import { getPrefillFor } from '../libs/prefill';
import { buildTemplateData } from '../libs/template';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Header } from '../components/Header';
import { PlanForm } from '../components/PlanForm';
import { RecordsSection } from '../components/RecordsSection';
import { useAuthCheck } from '../hooks/useAuthCheck';
import { useSubjectManagement } from '../hooks/useSubjectManagement';
import { printStylesheet } from '../components/styles';
import { stripMd } from '../libs/text';

// Types
interface FormState {
  id: ID;
  gradeId: ID;
  week: string;
  fromDate: string;
  toDate: string;
}

interface FilterState {
  gradeId: string;
  week: string;
  fromDate: string;
  toDate: string;
}

// Utility Functions
const createInitialFormState = (): FormState => ({
  id: '',
  gradeId: '',
  week: '',
  fromDate: '',
  toDate: '',
});

const createInitialFilterState = (): FilterState => ({
  gradeId: '',
  week: '',
  fromDate: '',
  toDate: '',
});

const generateDocx = async (
  plan: WeeklyPlan,
  grades: Grade[],
  subjects: Subject[],
  notes: string
): Promise<Blob> => {
  const ordered = [...subjects].sort((a, b) => a.name.localeCompare(b.name));
  const gradeName = grades.find(g => g.id === plan.gradeId)?.name ?? 'Grade';
  const colPerc = [18, 48, 34];

  const allBorders = (size = 16) => ({
    top: { style: BorderStyle.SINGLE, size, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size, color: '000000' },
    left: { style: BorderStyle.SINGLE, size, color: '000000' },
    right: { style: BorderStyle.SINGLE, size, color: '000000' },
  });

  const para = (text: string, opts?: { bold?: boolean; align?: AlignmentType; rtl?: boolean }) =>
    new Paragraph({
      text: text || '',
      alignment: opts?.align ?? AlignmentType.LEFT,
      bidirectional: !!opts?.rtl,
      textDirection: opts?.rtl ? TextDirection.RIGHT_TO_LEFT : undefined,
    });

  const splitLines = (text: string, rtl = false, align: AlignmentType = AlignmentType.LEFT) =>
    (text || '').split(/\r?\n/).map(line => para(line, { rtl, align }));

  const headerTitle = new Paragraph({
    text: 'AL FORQAN PRIVATE SCHOOL (AMERICAN DIVISION)\nAL BATOOL INTERNATIONAL SCHOOL',
    heading: HeadingLevel.HEADING2,
    alignment: AlignmentType.CENTER,
  });

  const from = new Date(plan.fromDate).toLocaleDateString('en-GB');
  const to = new Date(plan.toDate).toLocaleDateString('en-GB');
  const weekLine = new Paragraph({
    text: `Weekly Planner — Week: (${plan.week}) – 1st Semester   From ${from}   to ${to}   Grade (${gradeName})`,
    alignment: AlignmentType.CENTER,
  });

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: colPerc[0], type: WidthType.PERCENTAGE },
        borders: allBorders(),
        shading: { fill: 'E5E7EB' },
        children: [para('Subject', { bold: true, align: AlignmentType.CENTER })],
      }),
      new TableCell({
        width: { size: colPerc[1], type: WidthType.PERCENTAGE },
        borders: allBorders(),
        shading: { fill: 'E5E7EB' },
        children: [para('Class work', { bold: true, align: AlignmentType.CENTER })],
      }),
      new TableCell({
        width: { size: colPerc[2], type: WidthType.PERCENTAGE },
        borders: allBorders(),
        shading: { fill: 'E5E7EB' },
        children: [para('Activity – Homework', { bold: true, align: AlignmentType.CENTER })],
      }),
    ],
  });

  const mainSubjects = ordered.filter(s => !isArabicBlock(s.name));
  const arabicSubjects = ordered.filter(s => isArabicBlock(s.name));

  const mainRows = mainSubjects.map((s, idx) => {
    const d = plan.items.find(i => i.subjectId === s.id) ?? { unit: '', lessons: '', pages: '', homework: '', classwork: '' };
    const classWorkText = [d.lessons || '', d.unit || ''].filter(Boolean).join('\n');
    const activityText = [d.homework || '', d.classwork || ''].filter(Boolean).join('\n');
    const fill = idx % 2 === 0 ? 'F8FAFC' : 'FFFFFF';
    return new TableRow({
      children: [
        new TableCell({
          width: { size: colPerc[0], type: WidthType.PERCENTAGE },
          borders: allBorders(),
          shading: { fill },
          children: [para(s.name, { bold: true, align: AlignmentType.CENTER })],
        }),
        new TableCell({
          width: { size: colPerc[1], type: WidthType.PERCENTAGE },
          borders: allBorders(),
          shading: { fill },
          children: splitLines(classWorkText),
        }),
        new TableCell({
          width: { size: colPerc[2], type: WidthType.PERCENTAGE },
          borders: allBorders(),
          shading: { fill },
          children: splitLines(activityText, false, AlignmentType.CENTER),
        }),
      ],
    });
  });

  const arabicRows = arabicSubjects.map((s, idx) => {
    const d = plan.items.find(i => i.subjectId === s.id) ?? { unit: '', lessons: '', pages: '', homework: '', classwork: '' };
    const rightParts = [
      (d.pages || '').trim(),
      [d.unit || '', d.lessons || '', d.homework || '', d.classwork || ''].filter(Boolean).join(' — '),
    ].filter(Boolean);
    const fill = idx % 2 === 0 ? 'F8FAFC' : 'FFFFFF';
    return new TableRow({
      children: [
        new TableCell({
          width: { size: colPerc[0], type: WidthType.PERCENTAGE },
          borders: allBorders(),
          shading: { fill },
          textDirection: TextDirection.RIGHT_TO_LEFT,
          children: [para(s.name, { bold: true, align: AlignmentType.CENTER, rtl: true })],
        }),
        new TableCell({
          columnSpan: 2,
          width: { size: colPerc[1] + colPerc[2], type: WidthType.PERCENTAGE },
          borders: allBorders(),
          shading: { fill },
          textDirection: TextDirection.RIGHT_TO_LEFT,
          children: rightParts.flatMap(t => splitLines(t, true)),
        }),
      ],
    });
  });

  const notesTitle = new Paragraph({ text: 'Notes', heading: HeadingLevel.HEADING3 });
  const notesBody = new Paragraph({ text: notes.trim().length ? stripMd(notes) : 'No notes provided' });

  const doc = new Document({
    sections: [{
      children: [
        headerTitle,
        weekLine,
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...mainRows, ...arabicRows],
        }),
        notesTitle,
        notesBody,
      ],
    }],
  });

  return Packer.toBlob(doc);
};

export default function CoordinatorPage() {
  const { pendingCount, track } = usePending();

  // State
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [form, setForm] = useState<FormState>(createInitialFormState());
  const [planData, setPlanData] = useState<Record<ID, PlanFields>>({});
  const [assignedSubjects, setAssignedSubjects] = useState<Subject[]>([]);
  const [showPlan, setShowPlan] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState('');
  const [dictation, setDictation] = useState(''); // if plan-level
  const [filter, setFilter] = useState<FilterState>(createInitialFilterState());
  const [showRecords, setShowRecords] = useState(false);

  // Custom Hooks
  const {
    assignOpen,
    allSubjects,
    assignGradeId,
    selectedSubjectIds,
    subjectFilter,
    removeOpen,
    removeGradeId,
    removeSubjectFilter,
    removeCandidates,
    removeSelected,
    setAssignOpen,
    setAssignGradeId,
    setSelectedSubjectIds,
    setSubjectFilter,
    setRemoveOpen,
    setRemoveGradeId,
    setRemoveSubjectFilter,
    setRemoveCandidates,
    setRemoveSelected,
    openAssignModal,
    openRemoveModal,
    submitAssignSubjects,
    loadRemoveCandidates,
    submitRemoveSubjects,
  } = useSubjectManagement();

  useAuthCheck(setGrades, setWeeklyPlans);

  // Memoized derived lists
  const effectiveMain = useMemo(
    () => subjects.filter(s => !isArabicBlock(s.name)).sort((a, b) => a.name.localeCompare(b.name)),
    [subjects]
  );
  const arabicSubs = useMemo(
    () => subjects.filter(s => isArabicBlock(s.name)),
    [subjects]
  );

  // Handlers
  const handleGradeChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const gradeId = e.target.value;
    setForm(prev => ({ ...prev, gradeId }));
    if (!gradeId) {
      setAssignedSubjects([]);
      setPlanData({});
      return;
    }
    try {
      const subs = await track(fetchJson<Subject[]>(`/api/grades/${gradeId}/subjects`));
      const ordered = [...subs].sort((a, b) => a.name.localeCompare(b.name));
      setAssignedSubjects(ordered);
      setSubjects(ordered);
      setPlanData(
        ordered.reduce((acc, sub) => ({ ...acc, [sub.id]: getPrefillFor(sub.name) }), {})
      );
    } catch (e) {
      toast.error(String((e as any)?.message || e));
    }
  }, [track]);

  const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const handlePlanChange = useCallback((subjectId: ID, field: keyof PlanFields, value: string) => {
    setPlanData(prev => ({
      ...prev,
      [subjectId]: { ...prev[subjectId], [field]: value },
    }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.gradeId || !form.week || !form.fromDate || !form.toDate) {
      toast.error('Please select grade, week, and both dates');
      return;
    }
    const items = assignedSubjects.map(sub => ({
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
      note: notes,             // include if API supports plan-level notes
      dictation,               // include if API supports plan-level dictation
      items
    };
    try {
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/api/weekly-plans/${form.id}` : '/api/weekly-plans';
      await toast.promise(
        track(fetchJson(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editing ? { id: form.id, ...payload } : payload),
        })),
        {
          loading: editing ? 'Updating plan…' : 'Saving plan…',
          success: editing ? 'Plan updated' : 'Plan saved',
          error: (e) => `Failed to save plan: ${String((e as any)?.message || e)}`,
        }
      );
      const plans = await fetchJson<WeeklyPlan[]>('/api/weekly-plans');
      setWeeklyPlans(plans);
      setShowPlan(true);
      setEditing(false);
    } catch {}
  }, [form, assignedSubjects, planData, editing, notes, dictation, track]);

  const handleDelete = useCallback(async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    try {
      await toast.promise(
        track(fetchJson(`/api/weekly-plans/${planId}`, { method: 'DELETE' })),
        {
          loading: 'Deleting plan…',
          success: 'Plan deleted',
          error: (e) => `Failed to delete plan: ${String((e as any)?.message || e)}`,
        }
      );
      const plans = await fetchJson<WeeklyPlan[]>('/api/weekly-plans');
      setWeeklyPlans(plans);
      setShowPlan(false);
    } catch {}
  }, [track]);

  const loadPlanForEdit = useCallback(async (planId: string) => {
    try {
      const plan = await toast.promise(
        track(fetchJson<WeeklyPlan>(`/api/weekly-plans/${planId}`)),
        {
          loading: 'Loading plan…',
          success: 'Plan loaded',
          error: (e) => `Failed to load plan: ${String((e as any)?.message || e)}`,
        }
      );
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
      setPlanData(
        ordered.reduce((acc, sub) => {
          const item = plan.items.find(x => x.subjectId === sub.id);
          return {
            ...acc,
            [sub.id]: item
              ? {
                  unit: item.unit ?? '',
                  lessons: item.lessons ?? '',
                  pages: item.pages ?? '',
                  homework: item.homework ?? '',
                  classwork: item.classwork ?? '',
                }
              : getPrefillFor(sub.name),
          };
        }, {} as Record<ID, PlanFields>)
      );
      setNotes(plan.note ?? '');       // if plan-level supported
      setDictation(plan.dictation ?? ''); // if plan-level supported
      setEditing(true);
      setShowPlan(true);
    } catch {}
  }, [track]);

  const handlePrintWeeklyPlan = useCallback(() => {
    const section = document.getElementById('weekly-plan-page');
    if (!section) return;

    const gradeName = grades.find(g => g.id === form.gradeId)?.name ?? 'Grade';
    const title = buildSuggestedFileName(gradeName, form.week, form.fromDate);
    const content = section.outerHTML;

    const printWindow = window.open('', '_blank');
    printWindow?.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>${printStylesheet}</style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    printWindow?.document.close();
    printWindow?.focus();
    printWindow?.print();
  }, [form, grades]);

  const handleDownloadDocx = useCallback(async (planId: string) => {
    try {
      const plan = await toast.promise(
        track(fetchJson<WeeklyPlan>(`/api/weekly-plans/${planId}`)),
        {
          loading: 'Preparing DOCX…',
          success: 'DOCX ready',
          error: (e) => `Failed to prepare: ${String((e as any)?.message || e)}`,
        }
      );
      const subs = await fetchJson<Subject[]>(`/api/grades/${plan.gradeId}/subjects`);
      const blob = await generateDocx(plan, grades, subs, notes);
      const gradeName = grades.find(g => g.id === plan.gradeId)?.name ?? 'Grade';
      const title = buildSuggestedFileName(gradeName, String(plan.week), plan.fromDate);

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${title}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    } catch (e) {
      toast.error(`Failed to generate DOCX: ${String((e as any)?.message || e)}`);
    }
  }, [track, grades, notes]);

  const downloadFromTemplate = useCallback(async (planId: string) => {
    try {
      const plan = await toast.promise(
        track(fetchJson<WeeklyPlan>(`/api/weekly-plans/${planId}`)),
        {
          loading: 'Preparing DOCX…',
          success: 'DOCX ready',
          error: (e) => `Failed: ${String((e as any)?.message || e)}`,
        }
      );
      await loadPlanIntoPreview(plan);
      const subs = await fetchJson<Subject[]>(`/api/grades/${plan.gradeId}/subjects`);
      const ordered = [...subs].sort((a, b) => a.name.localeCompare(b.name));
      const gradeName = grades.find(g => g.id === plan.gradeId)?.name ?? 'Grade';
      const data = buildTemplateData(plan, ordered, planData, gradeName, notes /* add dictation if template supports */);

      const arrayBuffer = await fetch('/templates/WeeklyPlannerTemplate.docx').then(r => r.arrayBuffer());
      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

      doc.setData(data);
      doc.render();

      const out = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const filename = buildSuggestedFileName(gradeName, plan.week, plan.fromDate) + '.docx';
      saveAs(out, filename);
    } catch (e) {
      toast.error(`DOCX export failed: ${String((e as any)?.message || e)}`);
    }
  }, [track, grades, planData, notes]);

  const loadPlanIntoPreview = useCallback(async (plan: WeeklyPlan) => {
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
    setPlanData(
      ordered.reduce((acc, sub) => {
        const item = plan.items.find(x => x.subjectId === sub.id);
        return {
          ...acc,
          [sub.id]: item
            ? {
                unit: item.unit ?? '',
                lessons: item.lessons ?? '',
                pages: item.pages ?? '',
                homework: item.homework ?? '',
                classwork: item.classwork ?? '',
              }
            : getPrefillFor(sub.name),
        };
      }, {} as Record<ID, PlanFields>)
    );
    setNotes(plan.note ?? '');
    setDictation(plan.dictation ?? '');
    setShowPlan(true);
  }, []);

  const downloadPlanAsPdf = useCallback(async (planId: string) => {
    try {
      const plan = await toast.promise(
        track(fetchJson<WeeklyPlan>(`/api/weekly-plans/${planId}`)),
        {
          loading: 'Preparing PDF…',
          success: 'Ready',
          error: (e) => `Failed: ${String((e as any)?.message || e)}`,
        }
      );
      await loadPlanIntoPreview(plan);
      const gradeName = grades.find(g => g.id === plan.gradeId)?.name ?? 'Grade';
      const suggested = buildSuggestedFileName(gradeName, plan.week, plan.fromDate);

      const originalTitle = document.title;
      document.title = suggested;
      setTimeout(() => {
        window.print();
        setTimeout(() => {
          document.title = originalTitle;
        }, 250);
      }, 150);
    } catch {}
  }, [track, grades, loadPlanIntoPreview]);

  const onDownloadOnlySection = useCallback(async (planId: string) => {
    try {
      const plan = await toast.promise(
        fetchJson<WeeklyPlan>(`/api/weekly-plans/${planId}`),
        {
          loading: 'Preparing…',
          success: 'Ready',
          error: (e) => `Failed: ${String((e as any)?.message || e)}`,
        }
      );
      await loadPlanIntoPreview(plan);
      setTimeout(() => {
        const section = document.getElementById('weekly-plan-page');
        if (!section) return;

        const gradeName = grades.find(g => g.id === plan.gradeId)?.name ?? 'Grade';
        const title = buildSuggestedFileName(gradeName, plan.week, plan.fromDate);
        const content = section.outerHTML;

        const printWindow = window.open('', '_blank');
        printWindow?.document.write(`
          <html>
            <head>
              <title>${title}</title>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <style>${printStylesheet}</style>
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
  }, [grades, loadPlanIntoPreview]);

  // Filters
  const filteredPlans = useMemo(() => {
    return weeklyPlans.filter(p => {
      if (filter.gradeId && p.gradeId !== filter.gradeId) return false;
      if (filter.week && String(p.week).trim() !== String(filter.week).trim()) return false;
      if (filter.fromDate && new Date(p.fromDate) < new Date(filter.fromDate)) return false;
      if (filter.toDate && new Date(p.toDate) > new Date(filter.toDate)) return false;
      return true;
    });
  }, [weeklyPlans, filter]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-white via-[#f1fbf9] to-[#eaf7f5] p-6">
        <div className="mx-auto mb-6 h-1 w-full max-w-7xl rounded-full bg-[#006d77]" />
        <div className="mx-auto max-w-7xl">
          <Header
            showRecords={showRecords}
            setShowRecords={setShowRecords}
            openAssignModal={openAssignModal}
            openRemoveModal={openRemoveModal}
          />

          <AssignSubjectsModal
            open={assignOpen}
            grades={grades}
            allSubjects={allSubjects}
            assignGradeId={assignGradeId}
            subjectFilter={subjectFilter}
            selectedSubjectIds={selectedSubjectIds}
            setAssignGradeId={setAssignGradeId}
            setSubjectFilter={setSubjectFilter}
            toggleSubject={id => setSelectedSubjectIds(prev => {
              const next = new Set(prev);
              next.has(id) ? next.delete(id) : next.add(id);
              return next;
            })}
            selectAllFiltered={() => setSelectedSubjectIds(new Set(
              allSubjects.filter(s => s.name.toLowerCase().includes(subjectFilter.toLowerCase())).map(s => s.id)
            ))}
            clearSelection={() => setSelectedSubjectIds(new Set())}
            onClose={() => setAssignOpen(false)}
            onSave={() => submitAssignSubjects(form.gradeId, setAssignedSubjects, setSubjects, setPlanData)}
          />

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
            toggle={id => setRemoveSelected(prev => {
              const next = new Set(prev);
              next.has(id) ? next.delete(id) : next.add(id);
              return next;
            })}
            selectFiltered={() => setRemoveSelected(new Set(
              removeCandidates.filter(s => s.name.toLowerCase().includes(removeSubjectFilter.toLowerCase())).map(s => s.id)
            ))}
            clear={() => setRemoveSelected(new Set())}
            onSubmit={() => submitRemoveSubjects(form.gradeId, setAssignedSubjects, setSubjects, setPlanData)}
            onLoadCandidates={loadRemoveCandidates}
          />

          <RecordsSection
            showRecords={showRecords}
            grades={grades}
            filteredPlans={filteredPlans}
            filter={filter}
            setFilter={setFilter}
            onEdit={loadPlanForEdit}
            onDelete={handleDelete}
            onDownload={onDownloadOnlySection}
            onDownloadDocx={handleDownloadDocx}
            downloadWeeklyPlanAsDocxRow={downloadFromTemplate}
          />

          <PlanForm
            form={form}
            grades={grades}
            assignedSubjects={assignedSubjects}
            planData={planData}
            notes={notes}
            dictation={dictation}
            editing={editing}
            pendingCount={pendingCount}
            handleSubmit={handleSubmit}
            handleGradeChange={handleGradeChange}
            handleFormChange={handleFormChange}
            handlePlanChange={handlePlanChange}
            setNotes={setNotes}
            setDictation={setDictation}
          />

          <WeeklyPlanPreview
            show={showPlan}
            grades={grades}
            form={form}
            effectiveMain={effectiveMain}
            arabicSubs={arabicSubs}
            planData={planData}
            notes={notes}
          />

          <div className="no-print mt-6 flex justify-end gap-2">
            <button
              onClick={handlePrintWeeklyPlan}
              className="inline-flex items-center justify-center rounded-lg bg-[#0f766e] px-4 py-2.5 font-medium text-white shadow-sm ring-1 ring-[#0f766e]/30 transition hover:bg-[#115e59]"
            >
              Print Weekly
            </button>
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
      </div>
    </ErrorBoundary>
  );
}
