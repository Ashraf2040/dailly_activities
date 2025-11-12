// app/admin/components/CreateSubjectForm.tsx
import { useState } from 'react';
import toast from 'react-hot-toast';

interface Props {
  show: boolean;
  track: <T>(p: Promise<T>) => Promise<T>;
  fetchJson: (input: RequestInfo, init?: RequestInit) => Promise<any>;
  toast: typeof toast;
  onSuccess: () => void;
  pending: number;
}

export default function CreateSubjectForm({
  show,
  track,
  fetchJson,
  toast,
  onSuccess,
  pending,
}: Props) {
  const [name, setName] = useState('');

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await toast.promise(
      track(
        (async () => {
          await fetchJson('/api/subjects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
          });
          setName('');
          onSuccess();
        })()
      ),
      {
        loading: 'Creating subject…',
        success: 'Subject created',
        error: (e) => `Failed: ${e.message}`,
      }
    );
  };

  return (
    <div className="mx-auto mb-8 max-w-3xl rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
      <h2 className="mb-4 text-xl font-semibold text-[#064e4f]">Create Subject</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          placeholder="Subject name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
        <button type="submit" disabled={pending > 0} className="w-full btn-warning">
          {pending > 0 ? 'Working…' : 'Create Subject'}
        </button>
      </form>
    </div>
  );
}