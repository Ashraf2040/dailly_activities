
'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [filter, setFilter] = useState({ classId: '', date: '' });
  const [newTeacher, setNewTeacher] = useState({ username: '', name: '', password: '', classIds: [], subjectIds: [] });
  const [newClass, setNewClass] = useState({ name: '' });
  const [newSubject, setNewSubject] = useState({ name: '' });
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [showTeacherDetails, setShowTeacherDetails] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [showSubjectForm, setShowSubjectForm] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !session.user || session.user.role !== 'ADMIN') {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [teachersRes, classesRes, subjectsRes] = await Promise.all([
          fetch('/api/admin/teachers'),
          fetch('/api/classes'),
          fetch('/api/subjects'),
        ]);
        const teachersData = await teachersRes.json();
        const classesData = await classesRes.json();
        const subjectsData = await subjectsRes.json();
        console.log('Teachers fetched:', teachersData); // Debug log
        console.log('Classes fetched:', classesData); // Debug log
        console.log('Subjects fetched:', subjectsData); // Debug log
        setTeachers(teachersData);
        setClasses(classesData);
        setSubjects(subjectsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, [session, status, router]);

  const handleFilter = async () => {
    try {
      const res = await fetch(`/api/lessons?classId=${filter.classId}&date=${filter.date}`);
      const data = await res.json();
      setLessons(data);
    } catch (error) {
      console.error('Error filtering lessons:', error);
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTeacher, role: 'TEACHER' }),
      });
      if (res.ok) {
        alert('Teacher created successfully');
        setNewTeacher({ username: '', name: '', password: '', classIds: [], subjectIds: [] });
        setShowTeacherForm(false);
        const teachersRes = await fetch('/api/admin/teachers');
        setTeachers(await teachersRes.json());
      } else {
        const errorData = await res.json();
        alert(`Failed to create teacher: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Failed to create teacher: Network error');
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm('Are you sure you want to delete this teacher?')) return;
    try {
      const res = await fetch(`/api/admin/teachers/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        alert('Teacher deleted successfully');
        const teachersRes = await fetch('/api/admin/teachers');
        setTeachers(await teachersRes.json());
      } else {
        const errorData = await res.json();
        alert(`Failed to delete teacher: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Failed to delete teacher: Network error');
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClass),
      });
      if (res.ok) {
        alert('Class created successfully');
        setNewClass({ name: '' });
        setShowClassForm(false);
        const classesRes = await fetch('/api/classes');
        setClasses(await classesRes.json());
      } else {
        const errorData = await res.json();
        alert(`Failed to create class: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Failed to create class: Network error');
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSubject),
      });
      if (res.ok) {
        alert('Subject created successfully');
        setNewSubject({ name: '' });
        setShowSubjectForm(false);
        const subjectsRes = await fetch('/api/subjects');
        setSubjects(await subjectsRes.json());
      } else {
        const errorData = await res.json();
        alert(`Failed to create subject: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Failed to create subject: Network error');
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
            th { background-color: #f2f2f2; }
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

  if (status === 'loading') return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Action Buttons */}
      <div className="flex space-x-4 mb-8">
        <button
          onClick={() => setShowTeacherForm(!showTeacherForm)}
          className="bg-green-600 text-white p-2 rounded-md hover:bg-green-700"
        >
          {showTeacherForm ? 'Hide Create Teacher' : 'Create Teacher'}
        </button>
        <button
          onClick={() => setShowTeacherDetails(!showTeacherDetails)}
          className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700"
        >
          {showTeacherDetails ? 'Hide Teacher Details' : 'Show Teacher Details'}
        </button>
        <button
          onClick={() => setShowClassForm(!showClassForm)}
          className="bg-purple-600 text-white p-2 rounded-md hover:bg-purple-700"
        >
          {showClassForm ? 'Hide Create Class' : 'Create Class'}
        </button>
        <button
          onClick={() => setShowSubjectForm(!showSubjectForm)}
          className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700"
        >
          {showSubjectForm ? 'Hide Create Subject' : 'Create Subject'}
        </button>
      </div>

      {/* Create Teacher Form */}
      {showTeacherForm && (
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto mb-8">
          <h2 className="text-xl font-semibold mb-4">Create Teacher</h2>
          <form onSubmit={handleCreateTeacher} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                value={newTeacher.username}
                onChange={(e) => setNewTeacher({ ...newTeacher, username: e.target.value })}
                className="mt-1 block w-full p-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={newTeacher.name}
                onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                className="mt-1 block w-full p-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={newTeacher.password}
                onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
                className="mt-1 block w-full p-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Assign Classes</label>
              <select
                multiple
                value={newTeacher.classIds}
                onChange={(e) =>
                  setNewTeacher({
                    ...newTeacher,
                    classIds: Array.from(e.target.selectedOptions, (option) => option.value),
                  })
                }
                className="mt-1 block w-full p-2 border rounded-md"
              >
                {classes.map((cls: any) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Assign Subjects</label>
              <select
                multiple
                value={newTeacher.subjectIds}
                onChange={(e) =>
                  setNewTeacher({
                    ...newTeacher,
                    subjectIds: Array.from(e.target.selectedOptions, (option) => option.value),
                  })
                }
                className="mt-1 block w-full p-2 border rounded-md"
              >
                {subjects.map((sub: any) => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-green-600 text-white p-2 rounded-md hover:bg-green-700"
            >
              Create Teacher
            </button>
          </form>
        </div>
      )}

      {/* Create Class Form */}
      {showClassForm && (
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto mb-8">
          <h2 className="text-xl font-semibold mb-4">Create Class</h2>
          <form onSubmit={handleCreateClass} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Class Name</label>
              <input
                type="text"
                value={newClass.name}
                onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                className="mt-1 block w-full p-2 border rounded-md"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-purple-600 text-white p-2 rounded-md hover:bg-purple-700"
            >
              Create Class
            </button>
          </form>
        </div>
      )}

      {/* Create Subject Form */}
      {showSubjectForm && (
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto mb-8">
          <h2 className="text-xl font-semibold mb-4">Create Subject</h2>
          <form onSubmit={handleCreateSubject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Subject Name</label>
              <input
                type="text"
                value={newSubject.name}
                onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                className="mt-1 block w-full p-2 border rounded-md"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700"
            >
              Create Subject
            </button>
          </form>
        </div>
      )}

      {/* Teacher List */}
      {showTeacherDetails && (
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto mb-8">
          <h2 className="text-xl font-semibold mb-4">Teachers</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2">Username</th>
                <th className="border p-2">Name</th>
                {/* <th className="border p-2">Password</th> */}
                <th className="border p-2">Classes</th>
                <th className="border p-2">Subjects</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher: any) => (
                <tr key={teacher.id}>
                  <td className="border p-2">{teacher.username}</td>
                  <td className="border p-2">{teacher.name}</td>
                  {/* <td className="border p-2">{teacher.password}</td> Show hashed password */}
                  <td className="border p-2">{teacher.classes.map((c: any) => c.name).join(', ')}</td>
                  <td className="border p-2">{teacher.subjects.map((s: any) => s.name).join(', ')}</td>
                  <td className="border p-2">
                    <button
                      onClick={() => handleDeleteTeacher(teacher.id)}
                      className="bg-red-600 text-white p-1 rounded-md hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Lesson Filter and Table */}
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold mb-4">View Lessons</h2>
        <div className="flex space-x-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Class</label>
            <select
              value={filter.classId}
              onChange={(e) => setFilter({ ...filter, classId: e.target.value })}
              className="mt-1 block w-full p-2 border rounded-md"
            >
              <option value="">Select Class</option>
              {classes.map((cls: any) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              value={filter.date}
              onChange={(e) => setFilter({ ...filter, date: e.target.value })}
              className="mt-1 block w-full p-2 border rounded-md"
            />
          </div>
          <button
            onClick={handleFilter}
            className="mt-6 bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700"
          >
            Show
          </button>
        </div>
        {lessons.length > 0 && (
          <div>
            <table id="lessons-table" className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2">Subject</th>
                  <th className="border p-2">Unit</th>
                  <th className="border p-2">Lesson</th>
                  <th className="border p-2">Objective</th>
                  <th className="border p-2">Pages</th>
                  <th className="border p-2">Homework</th>
                  <th className="border p-2">Comments</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((lesson: any) => (
                  <tr key={lesson.id}>
                    <td className="border p-2">{lesson.subject.name}</td>
                    <td className="border p-2">{lesson.unit}</td>
                    <td className="border p-2">{lesson.lesson}</td>
                    <td className="border p-2">{lesson.objective}</td>
                    <td className="border p-2">{lesson.objective}</td> {/* Assuming duplication is intended; update if needed */}
                    <td className="border p-2">{lesson.homework || '-'}</td>
                    <td className="border p-2">{lesson.comments || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={handlePrint}
              className="mt-4 bg-gray-600 text-white p-2 rounded-md hover:bg-gray-700"
            >
              Print Table
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
