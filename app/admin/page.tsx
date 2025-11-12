'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import { downloadCsv, toCsv, formatTime } from '@/utils';
import { useAssignedTeachers } from '../hooks/useAssignedTeachers';
import LessonsFilter from '../components/LessonsFilter';
import LessonsTable from '../components/LessonsTable';
import AssignedTeachersTable from '../components/AssignedTeachersTable';
import CreateTeacherForm from '../components/CreateTeacherForm';
import CreateClassForm from '../components/CreateClassForm';
import CreateSubjectForm from '../components/CreateSubjectForm';
import TeacherList from '../components/TeacherList';
import EditTeacherModal from '../components/EditTeacherModal';
import { useAdminData } from '../hooks/useAdminData';
import { useFixedSchedule } from '../hooks/useFixedSchedule';
import EditSchedule from '../components/EditSchedule';
import AllGradesLessonsTable from '../components/AllGradesLessonsTable';   // <-- create this component (see below)



export default function AdminDashboard() {
  const router = useRouter();

  // ——— Admin Data (teachers, classes, subjects) ———
  const {
    teachers,
    classes,
    subjects,
    isLoading: adminLoading,
    error: adminError,
    pending,
    track,
    fetchJson,
    refreshTeachers,
    refreshClasses,
    refreshSubjects,
  } = useAdminData();

  // ——— Fixed Schedule (CSV) ———
  const { map: fixedScheduleMap, loading: scheduleLoading, error: scheduleError } = useFixedSchedule();

  // ——— UI Toggles ———
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [showTeacherDetails, setShowTeacherDetails] = useState(false);
  const [showLessons, setShowLessons] = useState(false);
  const [showAssigned, setShowAssigned] = useState(false);
const [assignedData, setAssignedData] = useState<any[]>([]);
const [allGradesLessons, setAllGradesLessons] = useState<Record<string, any[]>>({});
const [allGradesLoading, setAllGradesLoading] = useState(false);
const [showAllGrades, setShowAllGrades] = useState(false);
  // ——— Filter & Lessons ———
  const [filter, setFilter] = useState({ classId: '', date: '' });
  const [lessons, setLessons] = useState<any[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleInfo, setScheduleInfo] = useState({});
  // ——— Edit Modal ———
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);

 
  const handleFilter = async () => {
  if (!filter.classId || !filter.date) {
    toast.error('Please select both class and date');
    return;
  }
  try {
    setLessonsLoading(true);
    const data = await fetch(`/api/lessons?classId=${filter.classId}&date=${filter.date}`)
      .then(r => r.json())
      .catch(() => []);
    setLessons(data ?? []);
    setShowLessons(true);        // ONLY show lessons
    // DO NOT TOUCH showAssigned!
  } catch (err) {
    toast.error('Failed to load lessons');
    console.error(err);
  } finally {
    setLessonsLoading(false);
  }
};
  
 useEffect(() => {
  if (filter.classId) {
    fetch(`/api/schedule?classId=${filter.classId}`)
      .then(res => res.json())
      .then(data => setScheduleInfo(data.schedule || {}));
  }
}, [filter.classId, filter.date, showScheduleModal]);


const newAssigned = useAssignedTeachers({
  lessons,
  teachers,
  filter,
  scheduleInfo,
  subjects,
});

// if the new data is not empty, update the cache
useEffect(() => {
  if (Array.isArray(newAssigned) && newAssigned.length > 0) {
    setAssignedData(newAssigned);
  }
}, [newAssigned]);
const handleShowAssigned = async () => {
  if (!filter.classId || !filter.date) {
    toast.error('Please select both class and date');
    return;
  }

  // Ensure schedule info is up to date
  const res = await fetch(`/api/schedule?classId=${filter.classId}`);
  const data = await res.json();
  setScheduleInfo(data.schedule || {});

  setShowAssigned(true);
};
const handleSaveAllGrades = async () => {
  if (!filter.date) {
    toast.error('Please select a date first');
    return;
  }

  setAllGradesLoading(true);
  setShowAllGrades(true);               // show the table while loading
  setShowLessons(false);                // hide single-class view
  setShowAssigned(false);

  try {
    // Build an array of promises – one per class
    const promises = classes.map(cls =>
      fetch(`/api/lessons?classId=${cls.id}&date=${filter.date}`)
        .then(r => r.json())
        .then(data => ({ classId: cls.id, className: cls.name, lessons: data ?? [] }))
        .catch(() => ({ classId: cls.id, className: cls.name, lessons: [] }))
    );

    const results = await Promise.all(promises);

    // Group by classId for easy rendering
    const grouped: Record<string, any[]> = {};
    results.forEach(r => {
      grouped[r.classId] = r.lessons.map((l: any) => ({
        ...l,
        __className: r.className,   // inject class name for the table header
      }));
    });

    setAllGradesLessons(grouped);
  } catch (err) {
    toast.error('Failed to load lessons for all grades');
    console.error(err);
  } finally {
    setAllGradesLoading(false);
  }
};

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;

    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const cls = classes.find(c => c.id === filter.classId);
    const html = document.getElementById('lessons-table')?.outerHTML ?? '';

    w.document.write(`
      <html>
        <head>
          <title>${cls?.name ?? ''} - ${date}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; color: #064e4f; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #006d77; color: white; }
            tr:nth-child(odd) { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Daily Academic Plan – ${cls?.name ?? ''} – ${date}</h1>
          ${html}
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  // ——— Loading / Error States ———
  if (adminLoading || scheduleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-[#f1fbf9] to-[#eaf7f5]">
        <div className="flex items-center gap-3 rounded-lg bg-white px-6 py-4 shadow-lg">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#006d77] border-t-transparent" />
          <span className="text-sm font-medium text-gray-700">
            {scheduleLoading ? 'Loading schedule...' : 'Loading admin data...'}
          </span>
        </div>
      </div>
    );
  }

  if (adminError || scheduleError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-[#f1fbf9] to-[#eaf7f5]">
        <div className="max-w-md rounded-lg bg-red-50 p-6 text-red-700 shadow-md">
          <strong>Error:</strong> {adminError || scheduleError}
        </div>
      </div>
    );
  }
console.log('UI State → showLessons:', showLessons, 'showAssigned:', showAssigned);
  // ——— Main Dashboard UI ———
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#f1fbf9] to-[#eaf7f5] p-6">
      <div className="mx-auto mb-6 h-1 w-full max-w-7xl rounded-full bg-[#006d77]" />
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-[#064e4f]">Admin Dashboard</h1>
          <p className="text-sm text-gray-600">Manage teachers, classes, subjects and view lessons.</p>
        </div>

        {/* Action Bar */}
        <div className="mb-8 flex flex-wrap gap-3">
          <button onClick={() => setShowTeacherForm(v => !v)} className="btn-primary">
            {showTeacherForm ? 'Hide Create Teacher' : 'Create Teacher'}
          </button>

          <button
            onClick={() => {
              const header = ['Username', 'Name', 'Classes', 'Subjects'];
              const rows = teachers.map(t => [
                t.username ?? '',
                t.name ?? '',
                (t.classes ?? []).map((c: any) => c.name ?? '').join(' | '),
                (t.subjects ?? []).map((s: any) => s.name ?? '').join(' | '),
              ]);
              downloadCsv(`teachers_${new Date().toISOString().slice(0, 10)}.csv`, toCsv([header, ...rows]));
            }}
            className="btn-warning"
          >
            Export Teachers CSV
          </button>

          <button onClick={() => setShowTeacherDetails(v => !v)} className="btn-secondary">
            {showTeacherDetails ? 'Hide Teacher Details' : 'Show Teacher Details'}
          </button>

          <button onClick={() => router.push('/teacherData')} className="btn-warning">
            Teachers Cards
          </button>

          <button onClick={() => setShowClassForm(v => !v)} className="btn-tertiary">
            {showClassForm ? 'Hide Create Class' : 'Create Class'}
          </button>

          <button onClick={() => setShowSubjectForm(v => !v)} className="btn-primary">
            {showSubjectForm ? 'Hide Create Subject' : 'Create Subject'}
          </button>

          {/* <button onClick={() => router.push('/schedule')} className="btn-primary">
            Generate Schedule
          </button> */}
            <button
        onClick={() => setShowScheduleModal(true)}
        className="btn-primary"
      >
        Manage Schedules
      </button>
        </div>

        {/* Forms */}
        <CreateTeacherForm
          show={showTeacherForm}
          classes={classes}
          subjects={subjects}
          track={track}
          fetchJson={fetchJson}
          toast={toast}
          onSuccess={() => { setShowTeacherForm(false); refreshTeachers(); }}
          pending={pending}
        />

        <CreateClassForm
          show={showClassForm}
          track={track}
          fetchJson={fetchJson}
          toast={toast}
          onSuccess={() => { setShowClassForm(false); refreshClasses(); }}
          pending={pending}
        />

        <CreateSubjectForm
          show={showSubjectForm}
          track={track}
          fetchJson={fetchJson}
          toast={toast}
          onSuccess={() => { setShowSubjectForm(false); refreshSubjects(); }}
          pending={pending}
        />

        {/* Teacher List */}
        <TeacherList
          show={showTeacherDetails}
          teachers={teachers}
          onEdit={teacher => {
            setEditingTeacher({
              id: teacher.id,
              username: teacher.username,
              name: teacher.name,
              password: '',
              classIds: teacher.classes.map((c: any) => c.id),
              subjectIds: teacher.subjects.map((s: any) => s.id),
            });
            setShowEditModal(true);
          }}
          onDelete={async id => {
            if (!confirm('Delete this teacher?')) return;
            await toast.promise(
              track(fetchJson(`/api/admin/teachers/${id}`, { method: 'DELETE' })),
              { loading: 'Deleting…', success: 'Deleted', error: 'Failed' }
            );
            refreshTeachers();
          }}
          pending={pending}
        />

        {/* Edit Modal */}
        {showEditModal && editingTeacher && (
          <EditTeacherModal
            teacher={editingTeacher}
            setTeacher={setEditingTeacher}
            classes={classes}
            subjects={subjects}
            onClose={() => { setShowEditModal(false); setEditingTeacher(null); }}
            onSave={async () => {
              const body: any = {
                username: editingTeacher.username,
                name: editingTeacher.name,
                classIds: editingTeacher.classIds,
                subjectIds: editingTeacher.subjectIds,
              };
              if (editingTeacher.password) body.password = editingTeacher.password;

              await toast.promise(
                track(fetchJson(`/api/admin/teachers/${editingTeacher.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(body),
                })),
                { loading: 'Saving…', success: 'Updated', error: 'Failed' }
              );
              refreshTeachers();
              setShowEditModal(false);
              setEditingTeacher(null);
            }}
            pending={pending}
          />
        )}

        {/* Filter & Tables */}
    <LessonsFilter
  filter={filter}
  setFilter={setFilter}
  classes={classes}
  onFilter={handleFilter}
  showLessons={showLessons}
  setShowLessons={setShowLessons}
  showAssigned={showAssigned}
  setShowAssigned={setShowAssigned}
  pending={lessonsLoading}
/>

{/* Lessons Table */}
{showLessons && (
  <LessonsTable
    show={showLessons}
    loading={lessonsLoading}
    lessons={lessons}
    onPrint={handlePrint}
  />
)}
{/* All-Grades Table */}
{showAllGrades && (
  <AllGradesLessonsTable
    loading={allGradesLoading}
    dataByClass={allGradesLessons}
    date={filter.date}
    // onPrint={() => {
    //   // Re-use the same print logic but target a different element id
    //   const w = window.open('', '_blank');
    //   if (!w) return;

    //   const dateStr = new Date(filter.date).toLocaleDateString('en-US', {
    //     weekday: 'long',
    //     year: 'numeric',
    //     month: 'long',
    //     day: 'numeric',
    //   });

    //   const html = document.getElementById('all-grades-table')?.outerHTML ?? '';

    //   w.document.write(`
    //     <html>
    //       <head>
    //         <title>All Grades – ${dateStr}</title>
    //         <style>
    //           body { font-family: Arial, sans-serif; margin: 20px; }
    //           h1 { text-align: center; color: #064e4f; }
    //           .grade-section { page-break-after: always; margin-bottom: 40px; }
    //           .grade-header { background:#006d77; color:white; padding:8px; font-weight:bold; }
    //           table { width:100%; border-collapse:collapse; margin-top:12px; }
    //           th, td { border:1px solid #ddd; padding:8px; text-align:left; }
    //           th { background:#006d77; color:white; }
    //           tr:nth-child(odd) { background:#f8fafc; }
    //         </style>
    //       </head>
    //       <body>
    //         <h1>All Grades Academic Plan – ${dateStr}</h1>
    //         ${html}
    //       </body>
    //     </html>
    //   `);
    //   w.document.close();
    //   w.focus();
    //   setTimeout(() => w.print(), 500);
    // }}
  />
)}
{/* Teachers Table */}
{showAssigned && (
  <AssignedTeachersTable
  show={showAssigned}
  data={assignedData}   // ← use cached version
  loading={lessonsLoading}
  scheduleInfo={scheduleInfo}
  filter={filter}
/>

)}
<EditSchedule
        show={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        classes={classes}
        subjects={subjects}
        user={{ id: "123" }}
      />
 <button
  onClick={handleSaveAllGrades}
  disabled={allGradesLoading}
  className="btn-success"   // you probably have a green style, otherwise use btn-primary
>
  {allGradesLoading ? 'Saving All Grades…' : 'Save All Grades for Date'}
</button>

      </div>

      {/* Global Loader */}
      {pending > 0 && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/10 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-lg ring-1 ring-gray-200">
            <span className="h-3 w-3 animate-ping rounded-full bg-[#006d77]" />
            <span className="text-sm text-gray-700">Working…</span>
          </div>
        </div>
      )}
    </div>
  );
}