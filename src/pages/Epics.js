import React, { useState } from 'react';
import * as Sentry from '@sentry/react';

// ═══════════════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════════════
const EPIC_STATUSES = ['Planning', 'In Progress', 'Done', 'Blocked', 'On Hold'];
const PRIORITIES    = ['Low', 'Medium', 'High', 'Critical'];

const EPIC_STATUS_COLORS = {
  Planning:      'bg-slate-100  text-slate-700',
  'In Progress': 'bg-blue-100   text-blue-700',
  Done:          'bg-green-100  text-green-700',
  Blocked:       'bg-red-100    text-red-700',
  'On Hold':     'bg-yellow-100 text-yellow-700',
};

const PRIORITY_COLORS = {
  Low:      'bg-gray-200   text-gray-700',
  Medium:   'bg-orange-200 text-orange-800',
  High:     'bg-red-200    text-red-700',
  Critical: 'bg-red-600    text-white',
};

const INITIAL_EPICS = [
  {
    id: 'e1',
    name: 'Q1 Platform Redesign',
    description: 'Overhaul the dashboard, navigation, and core board views',
    status: 'In Progress',
    priority: 'High',
    owner: 'AK',
    dueDate: '2024-03-31',
    progress: 45,
    linkedItems: 12,
  },
  {
    id: 'e2',
    name: 'Mobile App Launch',
    description: 'Native iOS and Android apps with full feature parity to web',
    status: 'Planning',
    priority: 'Critical',
    owner: 'DN',
    dueDate: '2024-06-30',
    progress: 10,
    linkedItems: 8,
  },
  {
    id: 'e3',
    name: 'API v3 Migration',
    description: 'Migrate all internal and external clients to the new REST API',
    status: 'In Progress',
    priority: 'High',
    owner: 'EO',
    dueDate: '2024-04-15',
    progress: 70,
    linkedItems: 24,
  },
  {
    id: 'e4',
    name: 'SOC 2 Compliance',
    description: 'Complete SOC 2 Type II certification for enterprise customers',
    status: 'Done',
    priority: 'Critical',
    owner: 'HR',
    dueDate: '2024-01-31',
    progress: 100,
    linkedItems: 6,
  },
  {
    id: 'e5',
    name: 'Automation Engine v2',
    description: 'Rebuild the workflow automation engine with new triggers and improved throughput',
    status: 'Blocked',
    priority: 'Medium',
    owner: 'CM',
    dueDate: '2024-05-15',
    progress: 30,
    linkedItems: 15,
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

function ProgressBar({ value }) {
  const color =
    value === 100 ? 'bg-green-500' :
    value >= 70   ? 'bg-blue-500'  :
    value >= 30   ? 'bg-amber-400' : 'bg-gray-300';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right flex-shrink-0">{value}%</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CREATE EPIC MODAL
// ═══════════════════════════════════════════════════════════════════════════
const EMPTY_FORM = {
  name: '', description: '', status: 'Planning',
  priority: 'Medium', owner: '', dueDate: '', progress: 0,
};

function CreateEpicModal({ onClose, onCreate }) {
  const [form, setForm]     = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name    = 'Required';
    if (!form.owner.trim()) e.owner   = 'Required';
    if (!form.dueDate)      e.dueDate = 'Required';
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Create Epic</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Epic Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Search & Discovery v2"
              className={field}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What does this epic deliver?"
              rows={2}
              className={`${field} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={field}>
                {EPIC_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={field}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Owner</label>
              <input
                type="text"
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                placeholder="e.g. AK"
                className={field}
              />
              {errors.owner && <p className="text-red-500 text-xs mt-1">{errors.owner}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className={field}
              />
              {errors.dueDate && <p className="text-red-500 text-xs mt-1">{errors.dueDate}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Initial Progress — {form.progress}%
            </label>
            <input
              type="range"
              min="0" max="100" step="5"
              value={form.progress}
              onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
              className="w-full accent-indigo-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition">
              Cancel
            </button>
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
              Create Epic
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EPICS PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function Epics() {
  const [epics, setEpics]       = useState(INITIAL_EPICS);
  const [showModal, setShowModal] = useState(false);

  const handleCreate = (form) => {
    const newEpic = {
      id:          `e${Date.now()}`,
      name:        form.name.trim(),
      description: form.description.trim(),
      status:      form.status,
      priority:    form.priority,
      owner:       form.owner.trim(),
      dueDate:     form.dueDate,
      progress:    form.progress,
      linkedItems: 0,
    };

    // Breadcrumb — visible in the trail of any subsequent error this session
    Sentry.addBreadcrumb({
      category: 'epic.create',
      message:  `Created epic: "${newEpic.name}"`,
      level:    'info',
      data:     { epicId: newEpic.id, status: newEpic.status, priority: newEpic.priority },
    });

    setEpics((prev) => [...prev, newEpic]);
  };

  const doneCount   = epics.filter((e) => e.status === 'Done').length;
  const avgProgress = Math.round(epics.reduce((s, e) => s + e.progress, 0) / epics.length);

  return (
    <div className="p-6 space-y-6">

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Epics</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {epics.length} epics · {doneCount} done · avg {avgProgress}% complete
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition flex items-center gap-1.5"
        >
          + Create Epic
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Epic Name', 'Description', 'Status', 'Priority', 'Owner', 'Due Date', 'Progress', 'Items'].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {epics.map((epic, i) => (
              <tr
                key={epic.id}
                className={`hover:bg-gray-50 transition ${i < epics.length - 1 ? 'border-b border-gray-50' : ''}`}
              >
                <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{epic.name}</td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px]">{epic.description}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${EPIC_STATUS_COLORS[epic.status]}`}>
                    {epic.status}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`text-xs font-semibold rounded px-1.5 py-0.5 ${PRIORITY_COLORS[epic.priority]}`}>
                    {epic.priority}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-indigo-100 text-indigo-800 font-bold text-xs rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                      {epic.owner.slice(0, 1)}
                    </span>
                    <span className="text-gray-600 text-xs">{epic.owner}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(epic.dueDate)}</td>
                <td className="px-4 py-3 w-36">
                  <ProgressBar value={epic.progress} />
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="bg-gray-100 text-gray-600 text-xs font-semibold rounded-full px-2 py-0.5">
                    {epic.linkedItems}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <CreateEpicModal onClose={() => setShowModal(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
