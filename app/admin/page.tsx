// app/admin/page.tsx (or wherever AdminDashboard lives)
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [filter, setFilter] = useState({ classId: '', date: '' });

  const [newTeacher, setNewTeacher] = useState({
    username: '',
    name: '',
    password: '',
    classIds: [] as string[],
    subjectIds: [] as string[],
  });
  const [newClass, setNewClass] = useState({ name: '' });
  const [newSubject, setNewSubject] = useState({ name: '' });

  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [showTeacherDetails, setShowTeacherDetails] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);

  // toggles and data for lessons and assigned teachers
  const [showLessons, setShowLessons] = useState(false);
  const [showAssigned, setShowAssigned] = useState(false);
  const [assignedTeachersStatus, setAssignedTeachersStatus] = useState<
    { id: string; username: string; name: string; submitted: boolean }[]
  >([]);

  // GLOBAL LOADING OVERLAY STATE
  const [pendingCount, setPendingCount] = useState(0);

  // track(): increments pending before a promise and always decrements in finally
  const track = <T,>(p: Promise<T>) => {
    setPendingCount((c) => c + 1);
    return p.finally(() => setPendingCount((c) => Math.max(0, c - 1)));
  };

  // fetchJson(): throw error for non-OK responses so toast.promise can show the message
  const fetchJson = async (input: RequestInfo, init?: RequestInit) => {
    const res = await fetch(input, init);
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      // ignore JSON parse failure for no-body responses
    }
    if (!res.ok) {
      const message = data?.error || res.statusText || 'Request failed';
      throw new Error(message);
    }
    return data;
  };

  useEffect(() => {
    if (status === 'loading') return;

    if (!session || !session.user || session.user.role !== 'ADMIN') {
      router.push('/login');
      return;
    }

    const load = async () => {
      await toast.promise(
        track(
          Promise.all([
            fetchJson('/api/admin/teachers'),
            fetchJson('/api/classes'),
            fetchJson('/api/subjects'),
          ]).then(([t, c, s]) => {
            setTeachers(t);
            setClasses(c);
            setSubjects(s);
          })
        ),
        {
          loading: 'Loading admin data…',
          success: 'Admin data loaded',
          error: (e) => `Failed to load: ${String((e as any)?.message || e)}`,
        }
      );
    };

    load();
  }, [session, status, router]);

  const handleFilter = async () => {
    if (!filter.classId || !filter.date) {
      toast.error('Choose class and date first');
      return;
    }
    try {
      const data = await toast.promise(
        track(fetchJson(`/api/lessons?classId=${filter.classId}&date=${filter.date}`)),
        {
          loading: 'Loading lessons…',
          success: 'Lessons loaded',
          error: (e) => `Failed to load lessons: ${String((e as any)?.message || e)}`,
        }
      );
      setLessons(data);
      setShowLessons(true);
      setShowAssigned(false);
    } catch {
      // toast already shown
    }
  };

  // compute assigned teachers and whether they submitted for the selected date
  const handleShowAssignedTeachers = () => {
    if (!filter.classId || !filter.date) {
      toast.error('Choose class and date first');
      return;
    }
    const submitted = new Set((lessons ?? []).map((l: any) => l.teacherId));
    const assigned = teachers.filter((t: any) =>
      (t.classes ?? []).some((c: any) => c.id === filter.classId)
    );
    const rows = assigned.map((t: any) => ({
      id: t.id,
      username: t.username,
      name: t.name,
      submitted: submitted.has(t.id),
    }));
    setAssignedTeachersStatus(rows);
    setShowAssigned(true);
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await toast.promise(
        track(
          (async () => {
            await fetchJson('/api/admin/teachers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...newTeacher, role: 'TEACHER' }),
            });
            const t = await fetchJson('/api/admin/teachers');
            setTeachers(t);
            setNewTeacher({
              username: '',
              name: '',
              password: '',
              classIds: [],
              subjectIds: [],
            });
            setShowTeacherForm(false);
          })()
        ),
        {
          loading: 'Creating teacher…',
          success: 'Teacher created',
          error: (e) => `Failed to create teacher: ${String((e as any)?.message || e)}`,
        }
      );
    } catch {
      // toast already shown
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm('Are you sure you want to delete this teacher?')) return;
    try {
      await toast.promise(
        track(
          (async () => {
            await fetchJson(`/api/admin/teachers/${id}`, { method: 'DELETE' });
            const t = await fetchJson('/api/admin/teachers');
            setTeachers(t);
          })()
        ),
        {
          loading: 'Deleting teacher…',
          success: 'Teacher deleted',
          error: (e) => `Failed to delete teacher: ${String((e as any)?.message || e)}`,
        }
      );
    } catch {
      // toast already shown
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await toast.promise(
        track(
          (async () => {
            await fetchJson('/api/classes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newClass),
            });
            const c = await fetchJson('/api/classes');
            setClasses(c);
            setNewClass({ name: '' });
            setShowClassForm(false);
          })()
        ),
        {
          loading: 'Creating class…',
          success: 'Class created',
          error: (e) => `Failed to create class: ${String((e as any)?.message || e)}`,
        }
      );
    } catch {
      // toast already shown
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await toast.promise(
        track(
          (async () => {
            await fetchJson('/api/subjects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newSubject),
            });
            const s = await fetchJson('/api/subjects');
            setSubjects(s);
            setNewSubject({ name: '' });
            setShowSubjectForm(false);
          })()
        ),
        {
          loading: 'Creating subject…',
          success: 'Subject created',
          error: (e) => `Failed to create subject: ${String((e as any)?.message || e)}`,
        }
      );
    } catch {
      // toast already shown
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const currentDate = new Date();
    const dateStr = currentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const selectedClass = classes.find((cls: any) => cls.id === filter.classId);
    const className = selectedClass ? selectedClass.name : 'All Classes';
    const tableContent = document.getElementById('lessons-table')?.outerHTML;
    printWindow?.document.write(`
      <html>
        <head>
          <title>Lessons Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #006d77; color: white; }
            tr:nth-child(odd) { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Lessons Report for ${className} - ${dateStr}</h1>
          ${tableContent}
        </body>
      </html>
    `);
    printWindow?.document.close();
    printWindow?.focus();
    printWindow?.print();
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-white via-[#f1fbf9] to-[#eaf7f5]">
        <div className="inline-flex items-center gap-3 text-[#006d77]">
          <span className="h-3 w-3 animate-ping rounded-full bg-[#006d77]" />
          <span className="text-lg font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#f1fbf9] to-[#eaf7f5] p-6">
      {/* Top accent bar */}
      <div className="mx-auto mb-6 h-1 w-full max-w-7xl rounded-full bg-[#006d77]" />

      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-[#064e4f]">Admin Dashboard</h1>
          <p className="text-sm text-gray-600">
            Manage teachers, classes, subjects, and view lessons with filters and export-friendly tables.
          </p>
        </div>

        {/* Actions */}
        <div className="mb-8 flex flex-wrap gap-3">
          <button
            onClick={() => setShowTeacherForm(!showTeacherForm)}
            className="inline-flex items-center justify-center rounded-lg bg-[#006d77] px-4 py-2.5 text-white shadow-sm ring-1 ring-[#006d77]/20 transition hover:bg-[#006d77]/90 focus:outline-none focus:ring-2 focus:ring-[#006d77] focus:ring-offset-2"
            disabled={pendingCount > 0}
          >
            {showTeacherForm ? 'Hide Create Teacher' : 'Create Teacher'}
          </button>

          <button
            onClick={() => setShowTeacherDetails(!showTeacherDetails)}
            className="inline-flex items-center justify-center rounded-lg bg-[#83c5be] px-4 py-2.5 text-slate-900 shadow-sm ring-1 ring-[#83c5be]/40 transition hover:bg-[#83c5be]/90 focus:outline-none focus:ring-2 focus:ring-[#83c5be] focus:ring-offset-2"
            disabled={pendingCount > 0}
          >
            {showTeacherDetails ? 'Hide Teacher Details' : 'Show Teacher Details'}
          </button>

          <button
            onClick={() => setShowClassForm(!showClassForm)}
            className="inline-flex items-center justify-center rounded-lg border border-[#006d77]/30 bg-white px-4 py-2.5 text-[#006d77] shadow-sm transition hover:bg-[#006d77]/5 focus:outline-none focus:ring-2 focus:ring-[#006d77] focus:ring-offset-2"
            disabled={pendingCount > 0}
          >
            {showClassForm ? 'Hide Create Class' : 'Create Class'}
          </button>

          <button
            onClick={() => setShowSubjectForm(!showSubjectForm)}
            className="inline-flex items-center justify-center rounded-lg bg-[#e29578] px-4 py-2.5 text-white shadow-sm ring-1 ring-[#e29578]/20 transition hover:bg-[#e29578]/90 focus:outline-none focus:ring-2 focus:ring-[#e29578] focus:ring-offset-2"
            disabled={pendingCount > 0}
          >
            {showSubjectForm ? 'Hide Create Subject' : 'Create Subject'}
          </button>
        </div>

        {/* Create Teacher Form */}
        {showTeacherForm && (
          <div className="mx-auto mb-8 max-w-3xl rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
            <h2 className="mb-4 text-xl font-semibold text-[#064e4f]">Create Teacher</h2>
            <form onSubmit={handleCreateTeacher} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  value={newTeacher.username}
                  onChange={(e) => setNewTeacher({ ...newTeacher, username: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                  required
                />
              </div>
              <div className="sm:col-span-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={newTeacher.name}
                  onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={newTeacher.password}
                  onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                  required
                />
              </div>
              <div className="sm:col-span-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">Assign Classes</label>
                <select
                  multiple
                  value={newTeacher.classIds}
                  onChange={(e) =>
                    setNewTeacher({
                      ...newTeacher,
                      classIds: Array.from(e.target.selectedOptions, (option) => option.value),
                    })
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                >
                  {classes.map((cls: any) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">Assign Subjects</label>
                <select
                  multiple
                  value={newTeacher.subjectIds}
                  onChange={(e) =>
                    setNewTeacher({
                      ...newTeacher,
                      subjectIds: Array.from(e.target.selectedOptions, (option) => option.value),
                    })
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                >
                  {subjects.map((sub: any) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={pendingCount > 0}
                  className="mt-2 w-full rounded-lg bg-[#006d77] px-4 py-2.5 font-medium text-white shadow-sm ring-1 ring-[#006d77]/20 transition hover:bg-[#006d77]/90 focus:outline-none focus:ring-2 focus:ring-[#006d77] focus:ring-offset-2 disabled:opacity-60"
                >
                  {pendingCount > 0 ? 'Working…' : 'Create Teacher'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Create Class Form */}
        {showClassForm && (
          <div className="mx-auto mb-8 max-w-3xl rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
            <h2 className="mb-4 text-xl font-semibold text-[#064e4f]">Create Class</h2>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Class Name</label>
                <input
                  type="text"
                  value={newClass.name}
                  onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={pendingCount > 0}
                className="w-full rounded-lg bg-[#83c5be] px-4 py-2.5 font-medium text-slate-900 shadow-sm ring-1 ring-[#83c5be]/40 transition hover:bg-[#83c5be]/90 focus:outline-none focus:ring-2 focus:ring-[#83c5be] focus:ring-offset-2 disabled:opacity-60"
              >
                {pendingCount > 0 ? 'Working…' : 'Create Class'}
              </button>
            </form>
          </div>
        )}

        {/* Create Subject Form */}
        {showSubjectForm && (
          <div className="mx-auto mb-8 max-w-3xl rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
            <h2 className="mb-4 text-xl font-semibold text-[#064e4f]">Create Subject</h2>
            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Subject Name</label>
                <input
                  type="text"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={pendingCount > 0}
                className="w-full rounded-lg bg-[#e29578] px-4 py-2.5 font-medium text-white shadow-sm ring-1 ring-[#e29578]/20 transition hover:bg-[#e29578]/90 focus:outline-none focus:ring-2 focus:ring-[#e29578] focus:ring-offset-2 disabled:opacity-60"
              >
                {pendingCount > 0 ? 'Working…' : 'Create Subject'}
              </button>
            </form>
          </div>
        )}

        {/* Teacher List */}
        {showTeacherDetails && (
          <div className="mx-auto mb-8 max-w-5xl rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
            <h2 className="mb-4 text-xl font-semibold text-[#064e4f]">Teachers</h2>
            <div className="overflow-scroll rounded-xl ring-1 ring-gray-200 shadow-sm">
              <table className="w-full table-auto text-sm">
                <thead className="bg-[#006d77] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Username</th>
                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Classes</th>
                    <th className="px-4 py-3 text-left font-semibold">Subjects</th>
                    <th className="px-4 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {teachers.map((teacher: any, idx: number) => (
                    <tr
                      key={teacher.id}
                      className={
                        idx % 2 === 0
                          ? 'bg-white hover:bg-[#83c5be]/10 transition-colors'
                          : 'bg-gray-50 hover:bg-[#83c5be]/10 transition-colors'
                      }
                    >
                      <td className="px-4 py-3">{teacher.username}</td>
                      <td className="px-4 py-3">{teacher.name}</td>
                      <td className="px-4 py-3">{teacher.classes.map((c: any) => c.name).join(', ')}</td>
                      <td className="px-4 py-3">{teacher.subjects.map((s: any) => s.name).join(', ')}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteTeacher(teacher.id)}
                          disabled={pendingCount > 0}
                          className="rounded-md bg-[#e29578] px-3 py-1.5 text-white shadow-sm ring-1 ring-[#e29578]/20 transition hover:bg-[#e29578]/90 focus:outline-none focus:ring-2 focus:ring-[#e29578] focus:ring-offset-2 disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
          <h2 className="mb-4 text-xl font-semibold text-[#064e4f]">View Lessons</h2>
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Class</label>
              <select
                value={filter.classId}
                onChange={(e) => setFilter({ ...filter, classId: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
              >
                <option value="">Select Class</option>
                {classes.map((cls: any) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={filter.date}
                onChange={(e) => setFilter({ ...filter, date: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleFilter}
                disabled={pendingCount > 0}
                className="w-full rounded-lg bg-[#006d77] px-4 py-2.5 font-medium text-white shadow-sm ring-1 ring-[#006d77]/20 transition hover:bg-[#006d77]/90 focus:outline-none focus:ring-2 focus:ring-[#006d77] focus:ring-offset-2 disabled:opacity-60"
              >
                {pendingCount > 0 ? 'Loading…' : 'Show'}
              </button>
            </div>
            <div className="flex items-end gap-3">
              {showLessons && lessons.length > 0 && (
                <button
                  onClick={() => setShowLessons(false)}
                  disabled={pendingCount > 0}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-800 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#83c5be] focus:ring-offset-2 disabled:opacity-60"
                >
                  Hide
                </button>
              )}
              <button
                onClick={() => (showAssigned ? setShowAssigned(false) : handleShowAssignedTeachers())}
                className="w-full rounded-lg bg-[#83c5be] px-4 py-2.5 font-medium text-slate-900 shadow-sm ring-1 ring-[#83c5be]/40 transition hover:bg-[#83c5be]/90 focus:outline-none focus:ring-2 focus:ring-[#83c5be] focus:ring-offset-2"
                disabled={!filter.classId || !filter.date || pendingCount > 0}
                title={!filter.classId || !filter.date ? 'Choose class and date first' : 'Show assigned teachers'}
              >
                {showAssigned ? 'Hide' : 'Teachers'}
              </button>
            </div>
          </div>

          {/* Lessons table (toggle) */}
          {showLessons && lessons.length > 0 && (
            <div>
              <div className="overflow-scroll rounded-xl ring-1 ring-gray-200 shadow-sm">
                <table id="lessons-table" className="w-full table-auto text-sm">
                  <thead className="bg-[#006d77] text-white">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Subject</th>
                      <th className="px-4 py-3 text-left font-semibold">Unit</th>
                      <th className="px-4 py-3 text-left font-semibold">Lesson</th>
                      <th className="px-4 py-3 text-left font-semibold">Objective</th>
                      <th className="px-4 py-3 text-left font-semibold">Pages</th>
                      <th className="px-4 py-3 text-left font-semibold">Homework</th>
                      <th className="px-4 py-3 text-left font-semibold">Comments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lessons.map((lesson: any, idx: number) => (
                      <tr
                        key={lesson.id}
                        className={
                          idx % 2 === 0
                            ? 'bg-white hover:bg-[#83c5be]/10 transition-colors'
                            : 'bg-gray-50 hover:bg-[#83c5be]/10 transition-colors'
                        }
                      >
                        <td className="px-4 py-3">{lesson.subject.name}</td>
                        <td className="px-4 py-3">{lesson.unit}</td>
                        <td className="px-4 py-3">{lesson.lesson}</td>
                        <td className="px-4 py-3">{lesson.objective}</td>
                        <td className="px-4 py-3">{lesson.pages}</td>
                        <td className="px-4 py-3">{lesson.homework || '-'}</td>
                        <td className="px-4 py-3">{lesson.comments || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={handlePrint}
                className="mt-4 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-800 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#83c5be] focus:ring-offset-2"
              >
                Print Table
              </button>
            </div>
          )}

          {/* Assigned teachers table (toggle) */}
          {showAssigned && (
            <div className="mt-6">
              <h3 className="mb-3 text-lg font-semibold text-[#064e4f]">Assigned Teachers for Selected Class</h3>
              <div className="overflow-hidden rounded-xl ring-1 ring-gray-200 shadow-sm">
                <table className="w-full table-auto text-sm">
                  <thead className="bg-[#006d77] text-white">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Username</th>
                      <th className="px-4 py-3 text-left font-semibold">Name</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {assignedTeachersStatus.map((t, idx) => (
                      <tr
                        key={t.id}
                        className={
                          idx % 2 === 0
                            ? 'bg-white hover:bg-[#83c5be]/10 transition-colors'
                            : 'bg-gray-50 hover:bg-[#83c5be]/10 transition-colors'
                        }
                      >
                        <td className="px-4 py-3">{t.username}</td>
                        <td className="px-4 py-3">{t.name}</td>
                        <td className="px-4 py-3">
                          {t.submitted ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                              Submitted
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
                              Missing
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
