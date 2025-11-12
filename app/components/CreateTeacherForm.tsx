// app/admin/components/CreateTeacherForm.tsx
import { useState } from 'react';
import toast from 'react-hot-toast';

interface Teacher {
  username: string;
  name: string;
  password: string;
  classIds: string[];
  subjectIds: string[];
}

interface Props {
  show: boolean;
  classes: any[];
  subjects: any[];
  track: <T>(p: Promise<T>) => Promise<T>;
  fetchJson: (input: RequestInfo, init?: RequestInit) => Promise<any>;
  toast: typeof toast;
  onSuccess: () => void;
  pending: number;
}

export default function CreateTeacherForm({
  show,
  classes,
  subjects,
  track,
  fetchJson,
  toast,
  onSuccess,
  pending,
}: Props) {
  const [newTeacher, setNewTeacher] = useState<Teacher>({
    username: '',
    name: '',
    password: '',
    classIds: [],
    subjectIds: [],
  });

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await toast.promise(
      track(
        (async () => {
          await fetchJson('/api/admin/teachers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...newTeacher, role: 'TEACHER' }),
          });
          onSuccess();
          setNewTeacher({
            username: '',
            name: '',
            password: '',
            classIds: [],
            subjectIds: [],
          });
        })()
      ),
      {
        loading: 'Creating teacher…',
        success: 'Teacher created',
        error: (e) => `Failed: ${e.message}`,
      }
    );
  };

  return (
    <div className="mx-auto mb-8 max-w-3xl rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
      <h2 className="mb-4 text-xl font-semibold text-[#064e4f]">Create Teacher</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <input
          placeholder="Username"
          value={newTeacher.username}
          onChange={(e) => setNewTeacher({ ...newTeacher, username: e.target.value })}
          required
          className="rounded-lg border border-gray-300 px-3 py-2"
        />
        <input
          placeholder="Name"
          value={newTeacher.name}
          onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
          required
          className="rounded-lg border border-gray-300 px-3 py-2"
        />
        <input
          type="password"
          placeholder="Password"
          value={newTeacher.password}
          onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
          required
          className="sm:col-span-2 rounded-lg border border-gray-300 px-3 py-2"
        />
        <select
          multiple
          value={newTeacher.classIds}
          onChange={(e) =>
            setNewTeacher({
              ...newTeacher,
              classIds: Array.from(e.target.selectedOptions, (o) => o.value),
            })
          }
          className="rounded-lg border border-gray-300 px-3 py-2"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          multiple
          value={newTeacher.subjectIds}
          onChange={(e) =>
            setNewTeacher({
              ...newTeacher,
              subjectIds: Array.from(e.target.selectedOptions, (o) => o.value),
            })
          }
          className="rounded-lg border border-gray-300 px-3 py-2"
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending > 0}
          className="sm:col-span-2 btn-primary"
        >
          {pending > 0 ? 'Working…' : 'Create Teacher'}
        </button>
      </form>
    </div>
  );
}