
'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function TeacherDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
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
        const classesData = await classesRes.json();
        const subjectsData = await subjectsRes.json();
        console.log('Classes fetched:', classesData); // Debug log
        console.log('Subjects fetched:', subjectsData); // Debug log
        console.log('Session user:', session.user); // Debug log
        setClasses(classesData);
        setSubjects(subjectsData);
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
        setFormData({ ...formData, unit: '', lesson: '',pages:'' ,objective: '', homework: '', comments: '' });
      } else {
        const errorData = await res.json();
        alert(`Failed to submit lesson: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Failed to submit lesson: Network error');
    }
  };

  if (status === 'loading') return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Teacher Dashboard</h1>
      {session?.user && (
        <div className="mb-4">
          <p className="text-lg">Welcome, {session.user.name} ({session.user.role})</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Class</label>
          <select
            value={formData.classId}
            onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
            className="mt-1 block w-full p-2 border rounded-md"
            required
          >
            <option value="">Select Class</option>
            {classes.map((cls: any) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Subject</label>
          <select
            value={formData.subjectId}
            onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
            className="mt-1 block w-full p-2 border rounded-md"
            required
          >
            <option value="">Select Subject</option>
            {subjects.map((sub: any) => (
              <option key={sub.id} value={sub.id}>{sub.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="mt-1 block w-full p-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Unit</label>
          <input
            type="text"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            className="mt-1 block w-full p-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Lesson</label>
          <input
            type="text"
            value={formData.lesson}
            onChange={(e) => setFormData({ ...formData, lesson: e.target.value })}
            className="mt-1 block w-full p-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Objective</label>
          <input
            type="text"
            value={formData.objective}
            onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
            className="mt-1 block w-full p-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Pages</label>
          <input
            type="text"
            value={formData.pages}
            onChange={(e) => setFormData({ ...formData, pages: e.target.value })}
            className="mt-1 block w-full p-2 border rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Homework</label>
          <input
            type="text"
            value={formData.homework}
            onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
            className="mt-1 block w-full p-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Comments</label>
          <textarea
            value={formData.comments}
            onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
            className="mt-1 block w-full p-2 border rounded-md"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700"
        >
          Submit Lesson
        </button>
      </form>
    </div>
  );
}
