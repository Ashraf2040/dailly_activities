import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const getTodayStr = () => new Date().toISOString().slice(0, 10);

export function useTeacherDashboardData(session, status, router) {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [todayLessons, setTodayLessons] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);

  const [formData, setFormData] = useState({
    classId: '',
    subjectId: '',
    date: getTodayStr(),
    unit: '',
    lesson: '',
    objective: '',
    homework: '',
    pages: '',
    comments: '',
  });

  const teacherId = session?.user?.id;
  const today = useMemo(getTodayStr, []);

  const track = (p) => {
    setPendingCount((c) => c + 1);
    return p.finally(() => setPendingCount((c) => Math.max(0, c - 1)));
  };

  const fetchJson = async (input, init) => {
    const res = await fetch(input, init);
    let data = null;
    try {
      data = await res.json();
    } catch {}
    if (!res.ok) {
      const message = data?.error || res.statusText || 'Request failed';
      throw new Error(message);
    }
    return data;
  };

  // Initial load
  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !session.user) {
      router.push('/login');
      return;
    }
    const load = async () => {
      await toast.promise(
        track(
          Promise.all([
            fetchJson(`/api/users/${session.user.id}/classes`),
            fetchJson(`/api/users/${session.user.id}/subjects`),
            fetchJson(`/api/lessons?teacherId=${session.user.id}&date=${today}`),
          ]).then(([c, s, l]) => {
            setClasses(c);
            setSubjects(s);
            setTodayLessons(l);
          })
        ),
        {
          loading: 'Loading dashboard…',
          success: 'Dashboard ready',
          error: (e) => `Failed to load: ${String(e?.message || e)}`,
        }
      );
    };
    load();
  }, [session, status, router, today]);

  const refreshTodayLessons = async () => {
    if (!teacherId) return;
    await toast.promise(
      track(fetchJson(`/api/lessons?teacherId=${teacherId}&date=${today}`)),
      {
        loading: 'Refreshing lessons…',
        success: 'Lessons updated',
        error: (e) => `Failed to refresh: ${String(e?.message || e)}`,
      }
    ).then((data) => setTodayLessons(data));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!teacherId) {
      toast.error('Not authenticated');
      return;
    }
    const payload = { ...formData, teacherId };
    try {
      await toast.promise(
        track(
          (async () => {
            await fetchJson('/api/lessons', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            await refreshTodayLessons();
          })()
        ),
        {
          loading: 'Submitting lesson…',
          success: 'Lesson submitted',
          error: (e) => `Failed to submit: ${String(e?.message || e)}`,
        }
      );
    } catch {}
  };

  // Inline editing state
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditData({
      unit: row.unit,
      lesson: row.lesson,
      objective: row.objective,
      homework: row.homework ?? '',
      pages: row.pages,
      comments: row.comments ?? '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await toast.promise(
        track(
          (async () => {
            await fetchJson(`/api/lessons/${editingId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(editData),
            });
            await refreshTodayLessons();
            cancelEdit();
          })()
        ),
        {
          loading: 'Saving changes…',
          success: 'Lesson updated',
          error: (e) => `Failed to update: ${String(e?.message || e)}`,
        }
      );
    } catch {}
  };

  // Delete lesson feature
  const deleteLesson = async (id) => {
    if (!id) return;
    try {
      await toast.promise(
        track(
          fetchJson(`/api/lessons/${id}`, { method: 'DELETE' })
            .then(() => refreshTodayLessons())
        ),
        {
          loading: 'Deleting lesson…',
          success: 'Lesson deleted',
          error: (e) => `Failed to delete: ${String(e?.message || e)}`,
        }
      );
    } catch {}
  };

  return {
    classes, subjects, todayLessons, pendingCount,
    formData, setFormData, handleSubmit,
    editingId, editData, startEdit, cancelEdit, saveEdit, deleteLesson,
    refreshTodayLessons, teacherId
  };
}
