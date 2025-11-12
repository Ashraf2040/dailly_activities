'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const weekdays: string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

interface Class {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface User {
  id: string;
}

interface ScheduleItem {
  dayIndex: number;
  subjectId: string;
}

interface StoredSchedule {
  id: string;
  classId: string;
  className: string;
  items: ScheduleItem[];
  createdAt: string;
}

interface Props {
  show: boolean;
  onClose: () => void;
  classes: Class[];
  subjects: Subject[];
  user: User;
}

type Schedule = { [dayIndex: number]: string[] };

export default function EditSchedule({
  show,
  onClose,
  classes,
  subjects,
  user,
}: Props) {
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<Schedule>({});
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'edit' | 'history'>('edit');
  const [storedSchedules, setStoredSchedules] = useState<StoredSchedule[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // === Load stored schedules ===
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/schedules');
      const data = await res.json();
      if (data.schedules) {
        setStoredSchedules(data.schedules);
      }
    } catch (err) {
      toast.error('Failed to load schedule history');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  // === Fetch schedule for editing ===
  useEffect(() => {
    if (selectedClassIds.length > 0 && editMode && activeTab === 'edit') {
      setLoading(true);
      const primaryClassId = selectedClassIds[0];
      fetch(`/api/schedule?classId=${primaryClassId}`)
        .then(res => res.json())
        .then(({ schedule }: { schedule?: Schedule }) => {
          setSchedule(schedule || {});
        })
        .finally(() => setLoading(false));
    } else if (editMode && activeTab === 'edit') {
      setSchedule({});
    }
  }, [selectedClassIds, editMode, activeTab]);

  const toggleClassSelection = (classId: string) => {
    setSelectedClassIds(prev =>
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };

  const toggleSubjectForDay = (dayIndex: number, subjectId: string) => {
    setSchedule(prev => {
      const daySubjects = prev[dayIndex] || [];
      const newSubjects = daySubjects.includes(subjectId)
        ? daySubjects.filter(s => s !== subjectId)
        : [...daySubjects, subjectId];
      return { ...prev, [dayIndex]: newSubjects };
    });
  };

  const handleSave = async () => {
    if (selectedClassIds.length === 0) {
      toast.error('Please select at least one class.');
      return;
    }

    setLoading(true);
    try {
      await Promise.all(
        selectedClassIds.map(classId =>
          fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ classId, schedule, createdBy: user.id }),
          }).then(res => res.json())
        )
      );
      toast.success('Schedule saved!');
      setEditMode(false);
      if (activeTab === 'history') loadHistory();
    } catch {
      toast.error('Failed to save schedule');
    } finally {
      setLoading(false);
    }
  };

  // === Load schedule into editor (from history) ===
  const loadScheduleForEdit = (stored: StoredSchedule) => {
    const newSchedule: Schedule = {};
    stored.items.forEach(item => {
      if (!newSchedule[item.dayIndex]) newSchedule[item.dayIndex] = [];
      if (!newSchedule[item.dayIndex].includes(item.subjectId)) {
        newSchedule[item.dayIndex].push(item.subjectId);
      }
    });
    setSchedule(newSchedule);
    setSelectedClassIds([stored.classId]);
    setEditMode(true);
    setActiveTab('edit');
    toast.success(`Editing schedule for ${stored.className}`);
  };

  // === Delete schedule ===
  const deleteSchedule = async (id: string) => {
    if (!confirm('Delete this schedule permanently?')) return;

    try {
      const res = await fetch(`/api/schedule?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Schedule deleted');
        setStoredSchedules(prev => prev.filter(s => s.id !== id));
      } else {
        toast.error('Failed to delete');
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  // === Render Schedule Summary (in History) ===
  const renderStoredSchedule = (stored: StoredSchedule) => {
    const subjectMap = new Map(subjects.map(s => [s.id, s.name]));
    const scheduleMap: Schedule = {};

    stored.items.forEach(item => {
      if (!scheduleMap[item.dayIndex]) scheduleMap[item.dayIndex] = [];
      scheduleMap[item.dayIndex].push(item.subjectId);
    });

    return (
      <div className="space-y-2 text-sm">
        {weekdays.map((day, idx) => {
          const subs = (scheduleMap[idx] || [])
            .map(id => subjectMap.get(id))
            .filter(Boolean);
          if (subs.length === 0) return null;
          return (
            <div key={idx} className="flex gap-2 text-gray-700">
              <span className="font-medium text-[#006d77] w-24">{day}:</span>
              <span>{subs.join(', ')}</span>
            </div>
          );
        })}
        {Object.keys(scheduleMap).length === 0 && (
          <span className="text-gray-500 italic">No subjects</span>
        )}
      </div>
    );
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-7xl mx-4 bg-white rounded-2xl shadow-2xl p-8 overflow-y-auto max-h-[95vh] border border-[#d0f0eb]">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-6 text-3xl text-gray-400 hover:text-red-500 transition"
          type="button"
        >
          ×
        </button>

        {/* Title */}
        <h2 className="mb-6 text-3xl font-bold text-center text-[#064e4f] tracking-tight">
          Schedule Manager
        </h2>

        {/* Tabs */}
        <div className="flex justify-center gap-4 mb-8 border-b border-[#d0f0eb]">
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-6 py-2 font-semibold transition ${
              activeTab === 'edit'
                ? 'text-[#006d77] border-b-2 border-[#006d77]'
                : 'text-gray-600 hover:text-[#006d77]'
            }`}
          >
            Edit Schedule
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2 font-semibold transition ${
              activeTab === 'history'
                ? 'text-[#006d77] border-b-2 border-[#006d77]'
                : 'text-gray-600 hover:text-[#006d77]'
            }`}
          >
            Schedule History
          </button>
        </div>

        {/* === EDIT TAB === */}
        {activeTab === 'edit' && (
          <div className="space-y-8">
            {/* Class Selection */}
            <div className="bg-gradient-to-br from-[#f8fdfc] to-[#eef9f7] rounded-xl p-6 shadow-md border border-[#d0f0eb]">
              <label className="block text-lg font-bold text-[#006d77] mb-4">
                Select Classes
              </label>
              <div className="flex flex-wrap gap-3">
                {classes.map(c => (
                  <label key={c.id} className="group flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedClassIds.includes(c.id)}
                      onChange={() => toggleClassSelection(c.id)}
                      className="hidden"
                    />
                    <div
                      className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all ${
                        selectedClassIds.includes(c.id)
                          ? 'bg-[#006d77] border-[#006d77] text-white shadow-md'
                          : 'bg-white border-[#006d77] text-[#006d77] group-hover:bg-[#006d77] group-hover:text-white'
                      }`}
                    >
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          selectedClassIds.includes(c.id) ? 'bg-white' : 'bg-[#006d77]'
                        }`}
                      />
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Editor Table */}
            {selectedClassIds.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg border border-[#e0f5f2] overflow-hidden">
                <div className="bg-gradient-to-r from-[#006d77] to-[#005f65] text-white p-4">
                  <h3 className="text-lg font-bold">Assign Subjects by Day</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-[#f8fdfc] border-b border-[#d0f0eb]">
                        <th className="p-4 font-bold text-[#006d77] sticky left-0 bg-[#f8fdfc]">Day</th>
                        {subjects.map(s => (
                          <th key={s.id} className="p-4 font-semibold text-gray-700 text-center">
                            {s.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {weekdays.map((day, dayIndex) => (
                        <tr
                          key={dayIndex}
                          className="border-b border-[#e0f5f2] hover:bg-[#f8fdfc] transition"
                        >
                          <td className="p-4 font-bold text-[#006d77] sticky left-0 bg-white border-r border-[#d0f0eb]">
                            {day}
                          </td>
                          {subjects.map(subject => (
                            <td key={subject.id} className="p-4 text-center">
                              <input
                                type="checkbox"
                                checked={schedule[dayIndex]?.includes(subject.id) || false}
                                onChange={() => toggleSubjectForDay(dayIndex, subject.id)}
                                className="w-5 h-5 text-[#006d77] rounded focus:ring-[#006d77] focus:ring-2"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Save */}
            <div className="flex justify-center">
              <button
                onClick={handleSave}
                disabled={loading}
                className="group inline-flex items-center gap-3 bg-gradient-to-r from-[#006d77] to-[#005f65] text-white font-bold px-10 py-4 rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span className="h-5 w-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-6 h-6 group-hover:scale-110 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {loading ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </div>
        )}

        {/* === HISTORY TAB === */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {loadingHistory ? (
              <p className="text-center text-gray-600">Loading schedules...</p>
            ) : storedSchedules.length === 0 ? (
              <p className="text-center text-gray-500 italic">No saved schedules yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl shadow-lg border border-[#e0f5f2]">
                <table className="min-w-full text-sm bg-white">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#006d77] to-[#005f65] text-white">
                      <th className="p-4 text-left font-bold">Class</th>
                      <th className="p-4 text-left font-bold">Schedule</th>
                      <th className="p-4 text-left font-bold">Created</th>
                      <th className="p-4 text-center font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storedSchedules.map((s, i) => (
                      <tr
                        key={s.id}
                        className={`border-b border-[#e0f5f2] ${i % 2 === 0 ? 'bg-[#f8fdfc]' : 'bg-white'} hover:bg-[#eef9f7] transition`}
                      >
                        <td className="p-4 font-semibold text-[#006d77]">{s.className}</td>
                        <td className="p-4 max-w-md">{renderStoredSchedule(s)}</td>
                        <td className="p-4 text-gray-600">
                          {new Date(s.createdAt).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => loadScheduleForEdit(s)}
                              className="px-3 py-1 bg-[#006d77] text-white rounded-full text-xs font-medium hover:bg-[#005f65] transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteSchedule(s.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded-full text-xs font-medium hover:bg-red-600 transition"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}