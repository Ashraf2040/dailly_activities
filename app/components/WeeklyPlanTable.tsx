'use client';

import { WeeklyPlan } from './types';

export function WeeklyPlanTable({
  plans, onEdit, onDelete, onDownload,handlePrintWeeklyPlan
}: {
  plans: WeeklyPlan[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
}) {
  return (
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
          {plans.map((plan, idx) => (
            <tr key={plan.id} className={idx % 2 === 0 ? 'bg-white hover:bg-[#83c5be]/10 transition-colors' : 'bg-gray-50 hover:bg-[#83c5be]/10 transition-colors'}>
              <td className="px-4 py-3">{plan.grade?.name}</td>
              <td className="px-4 py-3">{plan.week}</td>
              <td className="px-4 py-3">{new Date(plan.fromDate).toLocaleDateString()}</td>
              <td className="px-4 py-3">{new Date(plan.toDate).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                <button onClick={() => onEdit(plan.id)} className="mr-2 rounded-md bg-[#006d77] px-3 py-1.5 text-white shadow-sm ring-1 ring-[#006d77]/20 transition hover:bg-[#006d77]/90">Edit</button>
                <button onClick={() => onDelete(plan.id)} className="rounded-md bg-[#e29578] px-3 py-1.5 text-white shadow-sm ring-1 ring-[#e29578]/20 transition hover:bg-[#e29578]/90">Delete</button>
                <button onClick={() => onDownload(plan.id)} className="ml-2 rounded-md bg-[#0f766e] px-3 py-1.5 text-white shadow-sm ring-1 ring-[#0f766e]/20 transition hover:bg-[#0f766e]/90">Download</button>
              </td>
            </tr>
          ))}
          {plans.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No records match the current filters.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
