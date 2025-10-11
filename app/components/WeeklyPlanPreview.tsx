'use client';

import { Grade, Subject, PlanFields, ID } from './types';
import { renderWithHighlight } from './print';


export function WeeklyPlanPreview({
  show, grades, form, effectiveMain, arabicSubs, planData, notes,
}: {
  show: boolean;
  grades: Grade[];
  form: { id: ID; gradeId: ID; week: string; fromDate: string; toDate: string };
  effectiveMain: Subject[];
  arabicSubs: Subject[];
  planData: Record<ID, PlanFields>;
  notes: string;
}) {
  if (!show) return null;

  const gradeName = grades.find(c => c.id === form.gradeId)?.name || '';
  const from = form.fromDate ? new Date(form.fromDate).toLocaleDateString('en-GB') : '';
  const to = form.toDate ? new Date(form.toDate).toLocaleDateString('en-GB') : '';

  return (
    <div className="mx-auto mt-8 w-full rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100 px-8 print-area">
      <div id="weekly-plan-page">
        {/* Header */}
        <div className="relative mb-3 rounded-lg border-black p-4 text-center print-header">
          <img
            src={typeof window !== 'undefined' ? `${location.origin}/cognia.png` : '/cognia.png'}
            alt="Accreditation badge"
            width={96}
            height={96}
            style={{ position: 'absolute', left: -18, top: -18, borderRadius: '9999px', objectFit: 'contain' }}
          />
          <img
            src={typeof window !== 'undefined' ? `${location.origin}/logo.png` : '/logo.png'}
            alt="School logo"
            width={96}
            height={96}
            style={{ position: 'absolute', right: -18, top: -18, borderRadius: '9999px', objectFit: 'contain' }}
          />

          <div className="text-2xl font-extrabold">
            AL FORQAN PRIVATE SCHOOL (AMERICAN DIVISION)
            <br />
            AL BATOOL INTERNATIONAL SCHOOL
          </div>

          <div className="text-2xl font-bold text-red-500 border-2 border-black mt-4 py-2 rounded-3xl">
            <div className="mt-1 text-xl font-extrabold text-[#006d77] mb-2">Weekly Planner</div>
            Week: ({form.week}) – 1st Semester &nbsp;&nbsp; From {from} &nbsp;&nbsp; to {to} &nbsp;&nbsp; Grade ({gradeName})
          </div>
        </div>

        {/* Table */}
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
              const classWorkText = [d.lessons, d.unit].filter(Boolean).join('\n');
              const activityText = [d.homework, d.classwork].filter(Boolean).join('\n');

              return (
                <tr key={sub.id} className={idx % 2 === 0 ? 'bg-gray-100' : 'bg-white'}>
                  <td className="border-2 border-black px-3 py-2 font-bold text-xl text-center">{sub.name}</td>
                  <td className="border-2 border-black px-3 py-2 align-top">
                    <div dangerouslySetInnerHTML={{ __html: renderWithHighlight(classWorkText) }} />
                  </td>
                  <td className="border-2 border-black px-3 py-2 align-top text-center">
                    <div dangerouslySetInnerHTML={{ __html: renderWithHighlight(activityText) }} />
                  </td>
                </tr>
              );
            })}

            {arabicSubs.map((sub, idx) => {
              const d = planData[sub.id] || { unit: '', lessons: '', pages: '', homework: '', classwork: '' };
              const rightHtml = [
                d.pages && renderWithHighlight(d.pages),
                renderWithHighlight([d.unit, d.lessons, d.homework, d.classwork].filter(Boolean).join(' — '))
              ].filter(Boolean).join('<br/>');

              return (
                <tr key={sub.id} className={idx % 2 === 0 ? 'bg-gray-100' : 'bg-white'}>
                  <td className="border-2 border-black px-3 py-2 font-bold text-xl text-center" dir="rtl">
                    {sub.name}
                  </td>
                  <td className="border-2 border-black px-3 py-2 align-top" dir="rtl" colSpan={2}>
                    <div className="font-semibold text-xl" dangerouslySetInnerHTML={{ __html: rightHtml }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Notes */}
        {notes.trim().length > 0 && (
          <div className="mt-3 rounded border-2 border-black p-3">
            <div className="mb-1 font-bold">Notes</div>
            <div dangerouslySetInnerHTML={{ __html: renderWithHighlight(notes) }} />
          </div>
        )}
      </div>
    </div>
  );
}
