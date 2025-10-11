'use client';

import { Grade } from './types';

export function WeeklyPlanFilters({
  grades, filter, setFilter, onApply, onClear,
}: {
  grades: Grade[];
  filter: { gradeId: string; week: string; fromDate: string; toDate: string };
  setFilter: (f: typeof filter) => void;
  onApply: (e?: React.FormEvent) => void;
  onClear: () => void;
}) {
  return (
    <form onSubmit={onApply} className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Grade</label>
        <select value={filter.gradeId} onChange={(e) => setFilter({ ...filter, gradeId: e.target.value })} className="block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]">
          <option value="">All</option>
          {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Week</label>
        <input type="text" value={filter.week} onChange={(e) => setFilter({ ...filter, week: e.target.value })} placeholder="e.g. 6" className="block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">From Date</label>
        <input type="date" value={filter.fromDate} onChange={(e) => setFilter({ ...filter, fromDate: e.target.value })} className="block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">To Date</label>
        <input type="date" value={filter.toDate} onChange={(e) => setFilter({ ...filter, toDate: e.target.value })} className="block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]" />
      </div>
      <div className="flex items-end gap-2">
        <button type="submit" className="inline-flex w-full items-center justify-center rounded-lg bg-[#006d77] px-4 py-2.5 text-sm font-medium text-white shadow-sm ring-1 ring-[#0ea5e9]/30 transition hover:bg-[#0284c7]">Apply</button>
        <button type="button" onClick={onClear} className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm">Clear</button>
      </div>
    </form>
  );
}
