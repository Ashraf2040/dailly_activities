import type { ID, Subject, WeeklyPlan, PlanFields } from '../components/types';
import { isArabicBlock } from './subjects';
import { stripMd } from './text';

export function buildTemplateData(
  plan: WeeklyPlan,
  ordered: Subject[],
  store: Record<ID, PlanFields>,
  gradeName: string,
  notesText: string
) {
  const main = ordered
    .filter(s => !isArabicBlock(s.name))
    .map(s => {
      const d = store[s.id] ?? { unit: '', lessons: '', pages: '', homework: '', classwork: '' };
      const classwork = stripMd([d.lessons, d.unit].filter(Boolean).join('\n'));
      const activity = stripMd([d.homework, d.classwork].filter(Boolean).join('\n'));
      return { subject: s.name, classwork, activity };
    });

  const arabic = ordered
    .filter(s => isArabicBlock(s.name))
    .map(s => {
      const d = store[s.id] ?? { unit: '', lessons: '', pages: '', homework: '', classwork: '' };
      const rtlCombined = stripMd(
        [d.pages, [d.unit, d.lessons, d.homework, d.classwork].filter(Boolean).join(' — ')].filter(Boolean).join('\n')
      );
      return { subject: s.name, rtlCombined };
    });

  const from = new Date(plan.fromDate).toLocaleDateString('en-GB');
  const to = new Date(plan.toDate).toLocaleDateString('en-GB');

  return {
    week: String(plan.week),
    from,
    to,
    grade: gradeName,
    main,
    arabic,
    notes: stripMd(notesText || ''),
  };
}
