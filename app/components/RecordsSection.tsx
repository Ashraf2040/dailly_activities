import { Dispatch, SetStateAction, FormEvent } from 'react';
import { Grade, WeeklyPlan } from './types';
import { WeeklyPlanFilters } from './WeeklyPlanFilters';
import { WeeklyPlanTable } from './WeeklyPlanTable';

interface RecordsSectionProps {
  showRecords: boolean;
  grades: Grade[];
  filteredPlans: WeeklyPlan[];
  filter: { gradeId: string; week: string; fromDate: string; toDate: string };
  setFilter: Dispatch<SetStateAction<{ gradeId: string; week: string; fromDate: string; toDate: string }>>;
  onEdit: (planId: string) => void;
  onDelete: (planId: string) => void;
  onDownload: (planId: string) => void;
  onDownloadDocx: (planId: string) => void;
  downloadWeeklyPlanAsDocxRow: (planId: string) => void;
}

export function RecordsSection({
  showRecords,
  grades,
  filteredPlans,
  filter,
  setFilter,
  onEdit,
  onDelete,
  onDownload,
  onDownloadDocx,
  downloadWeeklyPlanAsDocxRow,
}: RecordsSectionProps) {
  const applyFilters = (e?: FormEvent) => {
    if (e) e.preventDefault();
    setFilter({ ...filter });
  };

  const clearFilters = () => setFilter({ gradeId: '', week: '', fromDate: '', toDate: '' });

  if (!showRecords) return null;

  return (
    <section className="mx-auto mb-8 max-w-7xl rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
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
        onEdit={onEdit}
        onDelete={onDelete}
        onDownload={onDownload}
        onDownloadDocx={onDownloadDocx}
        downloadWeeklyPlanAsDocxRow={downloadWeeklyPlanAsDocxRow}
      />
    </section>
  );
}