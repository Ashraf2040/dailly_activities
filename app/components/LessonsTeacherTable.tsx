export default function LessonsTable({
  lessons,
  editingId,
  editData,
  startEdit,
  cancelEdit,
  saveEdit,
  deleteLesson,
  pendingCount,
  refreshTodayLessons
}) {
  return (
    <div className="mt-8 rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#064e4f]">Today’s Lessons</h2>
        <button
          onClick={refreshTodayLessons}
          disabled={pendingCount > 0}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#83c5be] focus:ring-offset-2 disabled:opacity-60"
        >
          {pendingCount > 0 ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      {lessons.length === 0 ? (
        <p className="text-sm text-gray-600">No lessons submitted for today yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl ring-1 ring-gray-200 shadow-sm">
          <table className="w-full table-auto text-sm">
            <thead className="bg-[#006d77] text-white">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Class</th>
                <th className="px-4 py-3 text-left font-semibold">Subject</th>
                <th className="px-4 py-3 text-left font-semibold">Unit</th>
                <th className="px-4 py-3 text-left font-semibold">Lesson</th>
                <th className="px-4 py-3 text-left font-semibold">Objective</th>
                <th className="px-4 py-3 text-left font-semibold">Pages</th>
                <th className="px-4 py-3 text-left font-semibold">Homework</th>
                <th className="px-4 py-3 text-left font-semibold">Comments</th>
                <th className="px-4 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lessons.map((row, idx) => {
                const isEditing = editingId === row.id;
                return (
                  <tr
                    key={row.id}
                    className={
                      idx % 2 === 0
                        ? 'bg-white hover:bg-[#83c5be]/10 transition-colors'
                        : 'bg-gray-50 hover:bg-[#83c5be]/10 transition-colors'
                    }
                  >
                    <td className="px-4 py-3">{row.class?.name || ''}</td>
                    <td className="px-4 py-3">{row.subject?.name || ''}</td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={String(editData.unit ?? '')}
                          onChange={(e) => setEditData((d) => ({ ...d, unit: e.target.value }))}
                          className="w-full rounded border border-gray-300 px-2 py-1"
                          disabled={pendingCount > 0}
                        />
                      ) : (
                        row.unit
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={String(editData.lesson ?? '')}
                          onChange={(e) => setEditData((d) => ({ ...d, lesson: e.target.value }))}
                          className="w-full rounded border border-gray-300 px-2 py-1"
                          disabled={pendingCount > 0}
                        />
                      ) : (
                        row.lesson
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={String(editData.objective ?? '')}
                          onChange={(e) => setEditData((d) => ({ ...d, objective: e.target.value }))}
                          className="w-full rounded border border-gray-300 px-2 py-1"
                          disabled={pendingCount > 0}
                        />
                      ) : (
                        row.objective
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={String(editData.pages ?? '')}
                          onChange={(e) => setEditData((d) => ({ ...d, pages: e.target.value }))}
                          className="w-full rounded border border-gray-300 px-2 py-1"
                          disabled={pendingCount > 0}
                        />
                      ) : (
                        row.pages
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={String(editData.homework ?? '')}
                          onChange={(e) => setEditData((d) => ({ ...d, homework: e.target.value }))}
                          className="w-full rounded border border-gray-300 px-2 py-1"
                          disabled={pendingCount > 0}
                        />
                      ) : (
                        row.homework || '-'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={String(editData.comments ?? '')}
                          onChange={(e) => setEditData((d) => ({ ...d, comments: e.target.value }))}
                          className="w-full rounded border border-gray-300 px-2 py-1"
                          disabled={pendingCount > 0}
                        />
                      ) : (
                        row.comments || '-'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            onClick={saveEdit}
                            disabled={pendingCount > 0}
                            className="rounded-md bg-[#006d77] px-3 py-1.5 text-white shadow-sm ring-1 ring-[#006d77]/20 transition hover:bg-[#006d77]/90 disabled:opacity-60"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={pendingCount > 0}
                            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(row)}
                            disabled={pendingCount > 0}
                            className="rounded-md bg-[#83c5be] px-3 py-1.5 text-slate-900 shadow-sm ring-1 ring-[#83c5be]/40 transition hover:bg-[#83c5be]/90 disabled:opacity-60"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteLesson(row.id)}
                            disabled={pendingCount > 0}
                            className="rounded-md border border-red-800 bg-red-100 px-3 py-1.5 text-red-800 font-medium shadow-sm transition hover:bg-red-200 disabled:opacity-60"
                          >
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
    </div>
  );
}
