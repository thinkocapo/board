import React, { useState } from 'react';
import * as Sentry from '@sentry/react';

// ═══════════════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════════════
const INITIAL_SPRINTS = [
  {
    id: 's1',
    name: 'Sprint 1 — Foundation',
    goals: 'Set up CI/CD pipeline and base architecture',
    start: '2024-01-08',
    end: '2024-01-19',
    completed: true,
  },
  {
    id: 's2',
    name: 'Sprint 2 — Auth & Onboarding',
    goals: 'Implement OAuth 2.0 and user onboarding flow',
    start: '2024-01-22',
    end: '2024-02-02',
    completed: true,
  },
  {
    id: 's3',
    name: 'Sprint 3 — Dashboard v1',
    goals: 'Ship the new board view to 10% of users',
    start: '2024-02-05',
    end: '2024-02-16',
    completed: false,
  },
  {
    id: 's4',
    name: 'Sprint 4 — Mobile',
    goals: 'Mobile responsive views and PWA support',
    start: '2024-02-19',
    end: '2024-03-01',
    completed: false,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function fmtDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function sprintTimeline(start, end) {
  const days  = Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const rem   = days % 7;
  return weeks > 0 ? `${weeks}w${rem > 0 ? ` ${rem}d` : ''}` : `${days}d`;
}

// ═══════════════════════════════════════════════════════════════════════════
// CREATE SPRINT MODAL
// ═══════════════════════════════════════════════════════════════════════════
const EMPTY_FORM = { name: '', goals: '', start: '', end: '' };

function CreateSprintModal({ onClose, onCreate }) {
  const [form, setForm]     = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = 'Required';
    if (!form.goals.trim()) e.goals = 'Required';
    if (!form.start)        e.start = 'Required';
    if (!form.end)          e.end   = 'Required';
    if (form.start && form.end && form.end <= form.start)
      e.end = 'Must be after start date';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onCreate(form);
    onClose();
  };

  const field = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Create Sprint</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Sprint Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Sprint 5 — Analytics"
              className={field}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Sprint Goals</label>
            <textarea
              value={form.goals}
              onChange={(e) => setForm({ ...form, goals: e.target.value })}
              placeholder="What does this sprint aim to deliver?"
              rows={2}
              className={`${field} resize-none`}
            />
            {errors.goals && <p className="text-red-500 text-xs mt-1">{errors.goals}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Sprint Start</label>
              <input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className={field} />
              {errors.start && <p className="text-red-500 text-xs mt-1">{errors.start}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Sprint End</label>
              <input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className={field} />
              {errors.end && <p className="text-red-500 text-xs mt-1">{errors.end}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition">
              Cancel
            </button>
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
              Create Sprint
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SPRINTS PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function Sprints() {
  const [sprints, setSprints]   = useState(INITIAL_SPRINTS);
  const [showModal, setShowModal] = useState(false);

  const handleCreate = (form) => {
    const newSprint = {
      id: `s${Date.now()}`,
      name:      form.name.trim(),
      goals:     form.goals.trim(),
      start:     form.start,
      end:       form.end,
      completed: false,
    };

    // Breadcrumb so sprint creation appears in the trail of any subsequent error
    Sentry.addBreadcrumb({
      category: 'sprint.create',
      message:  `Created sprint: "${newSprint.name}"`,
      level:    'info',
      data:     { sprintId: newSprint.id, start: newSprint.start, end: newSprint.end },
    });

    setSprints((prev) => [...prev, newSprint]);
  };

  const toggleCompleted = (id) =>
    setSprints((prev) => prev.map((s) => s.id === id ? { ...s, completed: !s.completed } : s));

  const completedCount = sprints.filter((s) => s.completed).length;

  return (
    <div className="p-6 space-y-6">

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Sprints</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {sprints.length} sprints · {completedCount} completed
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-1.5"
        >
          + Create Sprint
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Sprint Name', 'Sprint Goals', 'Timeline', 'Completed?', 'Sprint Start', 'Sprint End'].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sprints.map((sprint, i) => (
              <tr
                key={sprint.id}
                className={`hover:bg-gray-50 transition ${i < sprints.length - 1 ? 'border-b border-gray-50' : ''}`}
              >
                <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
                  {sprint.name}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs max-w-xs">
                  {sprint.goals}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full px-2.5 py-1">
                    {sprintTimeline(sprint.start, sprint.end)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleCompleted(sprint.id)}
                    className={`text-xs font-semibold rounded-full px-2.5 py-1 transition
                      ${sprint.completed
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {sprint.completed ? '✓ Yes' : 'No'}
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(sprint.start)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(sprint.end)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <CreateSprintModal onClose={() => setShowModal(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
