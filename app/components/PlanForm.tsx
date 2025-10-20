
"use client";

import { Dispatch, SetStateAction, FormEvent, ChangeEvent } from 'react';
import { Subject, Grade, PlanFields, ID } from './types';
import { SubjectEditors } from './SubjectEditors';
import { isArabicBlock, toDisplayName } from '../libs/subjects';

interface PlanFormProps {
  form: { id: ID; gradeId: ID; week: string; fromDate: string; toDate: string };
  grades: Grade[];
  assignedSubjects: Subject[];
  planData: Record<ID, PlanFields>;
  notes: string;
  dictation: string; // NEW
  editing: boolean;
  pendingCount: number;
  handleSubmit: (e: FormEvent) => void;
  handleGradeChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  handleFormChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handlePlanChange: (subjectId: ID, field: keyof PlanFields, value: string) => void;
  setNotes: Dispatch<SetStateAction<string>>;
  setDictation: Dispatch<SetStateAction<string>>; // NEW
}

export function PlanForm({
  form,
  grades,
  assignedSubjects,
  planData,
  notes,
  dictation, // NEW
  editing,
  pendingCount,
  handleSubmit,
  handleGradeChange,
  handleFormChange,
  handlePlanChange,
  setNotes,
  setDictation, // NEW
}: PlanFormProps) {
  return (
    <section className="mx-auto max-w-7xl rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
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
              {grades.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <div className="flex items-center gap-2">
                <button type="button" className="ml-2 rounded-md border px-2 py-1 text-xs" onClick={() => setNotes(v => `**${v}**`)}>
                  Bold
                </button>
                <button type="button" className="ml-2 rounded-md border px-2 py-1 text-xs" onClick={() => setNotes(v => `~~${v}~~`)}>
                  Red
                </button>
                <button type="button" className="ml-2 rounded-md border px-2 py-1 text-xs" onClick={() => setNotes(v => `==${v}==`)}>
                  Highlight
                </button>
              </div>
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Dictation</label>
              <div className="flex items-center gap-2">
                <button type="button" className="ml-2 rounded-md border px-2 py-1 text-xs" onClick={() => setDictation(v => `**${v}**`)}>
                  Bold
                </button>
                <button type="button" className="ml-2 rounded-md border px-2 py-1 text-xs" onClick={() => setDictation(v => `~~${v}~~`)}>
                  Red
                </button>
                <button type="button" className="ml-2 rounded-md border px-2 py-1 text-xs" onClick={() => setDictation(v => `==${v}==`)}>
                  Highlight
                </button>
              </div>
            </div>
            <textarea
              value={dictation}
              onChange={e => setDictation(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
            />
          </div>
        </div>

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
    </section>
  );
}
