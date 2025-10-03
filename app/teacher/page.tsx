'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function TeacherDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    classId: '',
    subjectId: '',
    date: '',
    unit: '',
    lesson: '',
    objective: '',
    homework: '',
    pages: '',
    comments: '',
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !session.user) {
      router.push('/login');
      return;
    }
    const fetchData = async () => {
      try {
        const [classesRes, subjectsRes] = await Promise.all([
          fetch('/api/classes'),
          fetch(`/api/users/${session.user.id}/subjects`),
        ]);
        setClasses(await classesRes.json());
        setSubjects(await subjectsRes.json());
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, [session, status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, teacherId: session?.user?.id }),
      });
      if (res.ok) {
        alert('Lesson submitted successfully');
        setFormData({ ...formData, unit: '', lesson: '', pages: '', objective: '', homework: '', comments: '' });
      } else {
        const errorData = await res.json();
        alert(`Failed to submit lesson: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Failed to submit lesson: Network error');
    }
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
      {/* Top accent */}
      <div className="mx-auto mb-6 h-1 w-full max-w-5xl rounded-full bg-[#006d77]" />
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-[#064e4f]">Teacher Dashboard</h1>
          {session?.user && (
            <p className="mt-1 text-sm text-gray-600">
              Welcome, {session.user.name} ({session.user.role})
            </p>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Class</label>
              <select
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                required
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
              <label className="mb-1 block text-sm font-medium text-gray-700">Subject</label>
              <select
                value={formData.subjectId}
                onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                required
              >
                <option value="">Select Subject</option>
                {subjects.map((sub: any) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Unit</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Lesson</label>
              <input
                type="text"
                value={formData.lesson}
                onChange={(e) => setFormData({ ...formData, lesson: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Objective</label>
              <input
                type="text"
                value={formData.objective}
                onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Pages</label>
              <input
                type="text"
                value={formData.pages}
                onChange={(e) => setFormData({ ...formData, pages: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Homework</label>
              <input
                type="text"
                value={formData.homework}
                onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Comments</label>
              <textarea
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                className="mt-1 block min-h-[100px] w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#83c5be] focus:ring-2 focus:ring-[#83c5be]"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  unit: '',
                  lesson: '',
                  objective: '',
                  homework: '',
                  pages: '',
                  comments: '',
                })
              }
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-800 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#83c5be] focus:ring-offset-2"
            >
              Reset
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-[#006d77] px-5 py-2.5 font-medium text-white shadow-sm ring-1 ring-[#006d77]/20 transition hover:bg-[#006d77]/90 focus:outline-none focus:ring-2 focus:ring-[#006d77] focus:ring-offset-2"
            >
              Submit Lesson
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
