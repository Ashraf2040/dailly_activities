'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────────
type TeacherClass = { id: string; name: string };
type TeacherSubject = { id: string; name: string };

type Lesson = {
  id: string;
  teacherId?: string;
  classId: string;
  subjectId: string;
  date: string;
  unit: string;
  lesson: string;
  objective: string;
  homework?: string | null;
  pages: string;
  comments?: string | null;
  class?: TeacherClass;
  subject?: TeacherSubject;
};

// ─── Module-level cache ─────────────────────────────────────────
// Survives component unmount/remount when navigating between tabs.
// This is what prevents the loading spinner from showing again.
type DashboardCache = {
  classes: TeacherClass[];
  subjects: TeacherSubject[];
  lessons: Lesson[];
  date: string;
};

let _cache: DashboardCache | null = null;
let _isLoading = false; // guards against React strict-mode double-fire

const getTodayStr = () => new Date().toISOString().slice(0, 10);

// ─── Icons (inline SVG, no extra deps) ──────────────────────────
const Icon = {
  Book: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  Refresh: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
      <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
    </svg>
  ),
  Edit: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Trash: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Save: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  Close: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Plus: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Rotate: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  ),
  Classes: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v2M2 10l8-4 8 4-8 4-8-4z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  ),
  Clipboard: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  ),
  Calendar: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
};

// ─── Component ──────────────────────────────────────────────────
export default function TeacherDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // ── State: initialised from cache so remount = instant render ──
  const [classes, setClasses] = useState<TeacherClass[]>(
    () => _cache?.classes ?? []
  );
  const [subjects, setSubjects] = useState<TeacherSubject[]>(
    () => _cache?.subjects ?? []
  );
  const [todayLessons, setTodayLessons] = useState<Lesson[]>(
    () => _cache?.lessons ?? []
  );

  // Only show the full-screen spinner on the very first load (no cache)
  const [isInitialLoad, setIsInitialLoad] = useState(() => _cache === null);

  const [formData, setFormData] = useState({
    classIds: [] as string[],
    subjectId: '',
    date: getTodayStr(),
    unit: '',
    lesson: '',
    objective: '',
    homework: '',
    pages: '',
    comments: '',
  });

  // Global pending counter for all mutations
  const [pendingCount, setPendingCount] = useState(0);
  const track = <T,>(p: Promise<T>) => {
    setPendingCount((c) => c + 1);
    return p.finally(() => setPendingCount((c) => Math.max(0, c - 1)));
  };

  // Inline-editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Lesson>>({});

  // JSON fetch helper
  const fetchJson = async (input: RequestInfo, init?: RequestInit) => {
    const res = await fetch(input, init);
    let data: any = null;
    try {
      data = await res.json();
    } catch {}
    if (!res.ok) {
      const message = data?.error || res.statusText || 'Request failed';
      throw new Error(message);
    }
    return data;
  };

  const teacherId = session?.user?.id as string | undefined;
  const today = useMemo(getTodayStr, []);

  // ── Initial load — runs ONCE per browser session ──────────────
  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !session.user) {
      router.push('/login');
      return;
    }

    // Cache exists → data already available, skip entirely
    if (_cache) return;
    // Guard against React strict-mode double-fire
    if (_isLoading) return;
    _isLoading = true;

    const load = async () => {
      try {
        const [c, s, l] = await Promise.all([
          fetchJson(`/api/users/${session.user.id}/classes`),
          fetchJson(`/api/users/${session.user.id}/subjects`),
          fetchJson(
            `/api/lessons?teacherId=${session.user.id}&date=${today}`
          ),
        ]);
        setClasses(c);
        setSubjects(s);
        setTodayLessons(l);
        _cache = { classes: c, subjects: s, lessons: l, date: today };
        setIsInitialLoad(false);
      } catch (e) {
        toast.error(
          `Failed to load dashboard: ${String((e as any)?.message || e)}`
        );
        setIsInitialLoad(false);
      } finally {
        _isLoading = false;
      }
    };
    load();
  }, [session, status, router, today]);

  // ── Refresh (manual button) ────────────────────────────────────
  const refreshTodayLessons = async () => {
    if (!teacherId) return;
    await toast.promise(
      track(
        fetchJson(`/api/lessons?teacherId=${teacherId}&date=${today}`)
      ),
      {
        loading: 'Refreshing lessons...',
        success: 'Lessons updated',
        error: (e) =>
          `Failed to refresh lessons: ${String((e as any)?.message || e)}`,
      }
    ).then((data) => {
      setTodayLessons(data as Lesson[]);
      if (_cache)
        _cache = { ..._cache, lessons: data as Lesson[] };
    });
  };

  // ── Submit new lesson ─────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherId) {
      toast.error('You are not authenticated');
      return;
    }
    if (formData.classIds.length === 0) {
      toast.error('Select at least one class');
      return;
    }

    try {
      await toast.promise(
        track(
          (async () => {
            await Promise.all(
              formData.classIds.map((classId) =>
                fetchJson('/api/lessons', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...formData, classId, teacherId }),
                })
              )
            );
            await refreshTodayLessons();
          })()
        ),
        {
          loading: `Submitting lesson to ${formData.classIds.length} class(es)...`,
          success: 'Lesson submitted successfully',
          error: (e) =>
            `Failed to submit lesson: ${String((e as any)?.message || e)}`,
        }
      );
      // Keep the submitted values so another day's lesson can be added quickly.
      // The Reset button remains available when a blank form is needed.
    } catch {}
  };

  // ── Inline editing ────────────────────────────────────────────
  const startEdit = (row: Lesson) => {
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
          loading: 'Saving changes...',
          success: 'Lesson updated successfully',
          error: (e) =>
            `Failed to update lesson: ${String((e as any)?.message || e)}`,
        }
      );
    } catch {}
  };

  // ── Delete ────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this lesson?'))
      return;

    try {
      await toast.promise(
        track(fetchJson(`/api/lessons/${id}`, { method: 'DELETE' })),
        {
          loading: 'Deleting...',
          success: 'Lesson deleted successfully',
          error: (e) =>
            `Failed to delete lesson: ${String((e as any)?.message || e)}`,
        }
      ).then(() => refreshTodayLessons());
    } catch (err) {
      console.error(err);
    }
  };

  const todaysTeacherLessons = todayLessons.filter(
    (lesson) => lesson.teacherId === teacherId
  );

  // ── Loading screen (only on first ever load) ──────────────────
  if (status === 'loading' || isInitialLoad) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-4 border-teal-100" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#006d77]" />
          </div>
          <p className="text-sm font-medium text-slate-500">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  // ── Shared class strings ──────────────────────────────────────
  const inputCls =
    'block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#006d77] focus:ring-2 focus:ring-[#006d77]/20 disabled:cursor-not-allowed disabled:opacity-60';
  const labelCls = 'mb-1.5 block text-sm font-medium text-slate-700';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ─── Header ─────────────────────────────────────────── */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#006d77] text-white shadow-sm">
                <Icon.Book className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Teacher Dashboard
                </h1>
                {session?.user && (
                  <p className="text-sm text-slate-500">
                    {`Welcome, ${session.user.name} (${session.user.role})`}
                  </p>
                )}
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-lg bg-slate-100 px-3.5 py-2 text-sm font-medium text-slate-600 sm:flex">
              <Icon.Calendar className="h-4 w-4 text-slate-400" />
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {/* ─── Stats ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-[#006d77]">
              <Icon.Classes className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {classes.length}
              </p>
              <p className="text-sm text-slate-500">Classes</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-[#006d77]">
              <Icon.Book className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {subjects.length}
              </p>
              <p className="text-sm text-slate-500">Subjects</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-[#006d77]">
              <Icon.Clipboard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {todaysTeacherLessons.length}
              </p>
              <p className="text-sm text-slate-500">Today&apos;s Lessons</p>
            </div>
          </div>
        </div>

        {/* ─── Lesson Form ────────────────────────────────────── */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              Record New Lesson
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Fill in the details below to log a lesson.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Class — multi-select */}
              <div className="sm:col-span-2">
                <label className={labelCls}>
                  Classes <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {classes.map((cls) => (
                    <label key={cls.id} className="cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.classIds.includes(cls.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, classIds: [...formData.classIds, cls.id] });
                          } else {
                            setFormData({ ...formData, classIds: formData.classIds.filter((id) => id !== cls.id) });
                          }
                        }}
                        className="hidden peer"
                        disabled={pendingCount > 0}
                      />
                      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#006d77] px-4 py-2 text-sm font-medium transition-all peer-checked:bg-[#006d77] peer-checked:text-white peer-checked:border-[#006d77] text-[#006d77] hover:bg-[#006d77]/10">
                        {cls.name}
                      </span>
                    </label>
                  ))}
                </div>
                {formData.classIds.length > 0 && (
                  <p className="mt-1.5 text-xs text-[#006d77] font-medium">{formData.classIds.length} class(es) selected</p>
                )}
              </div>

              {/* Subject */}
              <div>
                <label className={labelCls}>
                  Subject <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.subjectId}
                  onChange={(e) =>
                    setFormData({ ...formData, subjectId: e.target.value })
                  }
                  className={inputCls}
                  required
                  disabled={pendingCount > 0}
                >
                  <option value="">Select subject</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className={labelCls}>
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className={inputCls}
                  required
                  disabled={pendingCount > 0}
                />
              </div>

              {/* Unit */}
              <div>
                <label className={labelCls}>
                  Unit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) =>
                    setFormData({ ...formData, unit: e.target.value })
                  }
                  className={inputCls}
                  placeholder="e.g. Unit 3"
                  required
                  disabled={pendingCount > 0}
                />
              </div>

              {/* Lesson */}
              <div className="sm:col-span-2">
                <label className={labelCls}>
                  Lesson <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lesson}
                  onChange={(e) =>
                    setFormData({ ...formData, lesson: e.target.value })
                  }
                  className={inputCls}
                  placeholder="e.g. Lesson 5 — Introduction to Fractions"
                  required
                  disabled={pendingCount > 0}
                />
              </div>

              {/* Objective */}
              <div className="sm:col-span-2">
                <label className={labelCls}>
                  Objective <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.objective}
                  onChange={(e) =>
                    setFormData({ ...formData, objective: e.target.value })
                  }
                  className={inputCls}
                  placeholder="e.g. Students will learn to identify fractions"
                  required
                  disabled={pendingCount > 0}
                />
              </div>

              {/* Pages */}
              <div>
                <label className={labelCls}>
                  Pages <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.pages}
                  onChange={(e) =>
                    setFormData({ ...formData, pages: e.target.value })
                  }
                  className={inputCls}
                  placeholder="e.g. 24–28"
                  required
                  disabled={pendingCount > 0}
                />
              </div>

              {/* Homework */}
              <div>
                <label className={labelCls}>Homework</label>
                <input
                  type="text"
                  value={formData.homework}
                  onChange={(e) =>
                    setFormData({ ...formData, homework: e.target.value })
                  }
                  className={inputCls}
                  placeholder="e.g. Exercise 3A, questions 1–10"
                  disabled={pendingCount > 0}
                />
              </div>

              {/* Comments */}
              <div className="sm:col-span-2">
                <label className={labelCls}>Comments</label>
                <textarea
                  value={formData.comments}
                  onChange={(e) =>
                    setFormData({ ...formData, comments: e.target.value })
                  }
                  className={`${inputCls} min-h-[100px] resize-y`}
                  placeholder="Any additional notes or observations…"
                  disabled={pendingCount > 0}
                />
              </div>
            </div>

            {/* Form actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    classIds: [],
                    subjectId: '',
                    unit: '',
                    lesson: '',
                    objective: '',
                    homework: '',
                    pages: '',
                    comments: '',
                  }))
                }
                disabled={pendingCount > 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#83c5be] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon.Rotate className="h-4 w-4" />
                Reset
              </button>
              <button
                type="submit"
                disabled={pendingCount > 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#006d77] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#005a63] focus:outline-none focus:ring-2 focus:ring-[#006d77] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingCount > 0 ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Working...
                  </>
                ) : (
                  <>
                    <Icon.Plus className="h-4 w-4" />
                    Submit Lesson
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* ─── Today's Lessons Table ─────────────────────────── */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Today&apos;s Lessons
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {todaysTeacherLessons.length} lesson(s) recorded
              </p>
            </div>
            <button
              onClick={refreshTodayLessons}
              disabled={pendingCount > 0}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#83c5be] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon.Refresh
                className={`h-4 w-4 ${pendingCount > 0 ? 'animate-spin' : ''}`}
              />
              {pendingCount > 0 ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {todaysTeacherLessons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Icon.Clipboard className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600">
                No lessons recorded for today.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Use the form above to add your first lesson.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    {[
                      'Class',
                      'Subject',
                      'Unit',
                      'Lesson',
                      'Objective',
                      'Pages',
                      'Homework',
                      'Comments',
                      'Actions',
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todaysTeacherLessons.map((row, idx) => {
                    const isEditing = editingId === row.id;
                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                        } hover:bg-teal-50/40`}
                      >
                        {/* Class */}
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                          {row.class?.name || '—'}
                        </td>
                        {/* Subject */}
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {row.subject?.name || '—'}
                        </td>
                        {/* Unit */}
                        <td className="px-4 py-3 text-slate-600">
                          {isEditing ? (
                            <input
                              type="text"
                              value={String(editData.unit ?? '')}
                              onChange={(e) =>
                                setEditData((d) => ({
                                  ...d,
                                  unit: e.target.value,
                                }))
                              }
                              className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-[#006d77] focus:ring-1 focus:ring-[#006d77]/20"
                              disabled={pendingCount > 0}
                            />
                          ) : (
                            row.unit
                          )}
                        </td>
                        {/* Lesson */}
                        <td
                          className="max-w-[200px] truncate px-4 py-3 text-slate-600"
                          title={row.lesson}
                        >
                          {isEditing ? (
                            <input
                              type="text"
                              value={String(editData.lesson ?? '')}
                              onChange={(e) =>
                                setEditData((d) => ({
                                  ...d,
                                  lesson: e.target.value,
                                }))
                              }
                              className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-[#006d77] focus:ring-1 focus:ring-[#006d77]/20"
                              disabled={pendingCount > 0}
                            />
                          ) : (
                            row.lesson
                          )}
                        </td>
                        {/* Objective */}
                        <td
                          className="max-w-[200px] truncate px-4 py-3 text-slate-600"
                          title={row.objective}
                        >
                          {isEditing ? (
                            <input
                              type="text"
                              value={String(editData.objective ?? '')}
                              onChange={(e) =>
                                setEditData((d) => ({
                                  ...d,
                                  objective: e.target.value,
                                }))
                              }
                              className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-[#006d77] focus:ring-1 focus:ring-[#006d77]/20"
                              disabled={pendingCount > 0}
                            />
                          ) : (
                            row.objective
                          )}
                        </td>
                        {/* Pages */}
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {isEditing ? (
                            <input
                              type="text"
                              value={String(editData.pages ?? '')}
                              onChange={(e) =>
                                setEditData((d) => ({
                                  ...d,
                                  pages: e.target.value,
                                }))
                              }
                              className="w-20 rounded border border-slate-300 px-2 py-1 text-xs focus:border-[#006d77] focus:ring-1 focus:ring-[#006d77]/20"
                              disabled={pendingCount > 0}
                            />
                          ) : (
                            row.pages
                          )}
                        </td>
                        {/* Homework */}
                        <td
                          className="max-w-[150px] truncate px-4 py-3 text-slate-600"
                          title={row.homework ?? ''}
                        >
                          {isEditing ? (
                            <input
                              type="text"
                              value={String(editData.homework ?? '')}
                              onChange={(e) =>
                                setEditData((d) => ({
                                  ...d,
                                  homework: e.target.value,
                                }))
                              }
                              className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-[#006d77] focus:ring-1 focus:ring-[#006d77]/20"
                              disabled={pendingCount > 0}
                            />
                          ) : (
                            row.homework || (
                              <span className="text-slate-300">—</span>
                            )
                          )}
                        </td>
                        {/* Comments */}
                        <td
                          className="max-w-[150px] truncate px-4 py-3 text-slate-600"
                          title={row.comments ?? ''}
                        >
                          {isEditing ? (
                            <input
                              type="text"
                              value={String(editData.comments ?? '')}
                              onChange={(e) =>
                                setEditData((d) => ({
                                  ...d,
                                  comments: e.target.value,
                                }))
                              }
                              className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-[#006d77] focus:ring-1 focus:ring-[#006d77]/20"
                              disabled={pendingCount > 0}
                            />
                          ) : (
                            row.comments || (
                              <span className="text-slate-300">—</span>
                            )
                          )}
                        </td>
                        {/* Actions */}
                        <td className="whitespace-nowrap px-4 py-3">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={saveEdit}
                                disabled={pendingCount > 0}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#006d77] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-[#005a63] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Icon.Save className="h-3.5 w-3.5" />
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={pendingCount > 0}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Icon.Close className="h-3.5 w-3.5" />
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEdit(row)}
                                disabled={pendingCount > 0}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Icon.Edit className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(row.id)}
                                disabled={pendingCount > 0}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Icon.Trash className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* ─── Global loading overlay ────────────────────────── */}
      {pendingCount > 0 && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/20 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-3 shadow-xl ring-1 ring-slate-200">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-[#006d77]" />
            <span className="text-sm font-medium text-slate-700">
              Processing…
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
