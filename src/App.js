import React, { useState, useCallback } from 'react';
import * as Sentry from '@sentry/react';

// ═══════════════════════════════════════════════════════════════════════════
// 1. SENTRY INITIALIZATION
//    Demo talking point: Show this block first. Explain that three lines of
//    config unlock errors, performance traces, AND session replay.
// ═══════════════════════════════════════════════════════════════════════════
Sentry.init({
  dsn: 'https://7db0eda1ad18469f80353b3b26c436b6@o262702.ingest.us.sentry.io/1776195',
  integrations: [
    Sentry.browserTracingIntegration(),   // automatic page-load & route spans
    Sentry.replayIntegration({
      maskAllText: false,    // leave unmasked so replay is readable in the demo
      blockAllMedia: false,
    }),
  ],
  tracesSampleRate: 1.0,          // capture 100 % of transactions (demo only)
  replaysSessionSampleRate: 0.1,  // record 10 % of normal sessions
  replaysOnErrorSampleRate: 1.0,  // always record when an error occurs
});

// ── Workspace-level context — attached to EVERY event Sentry receives ──────
// Demo: open any issue → "Tags" sidebar → workspace_type: enterprise
//        open any issue → "Contexts" sidebar → sprint_data object
Sentry.setTag('workspace_type', 'enterprise');
Sentry.setContext('sprint_data', {
  id: 'sprint-2024',
  goal: 'Q1 Demo',
  team: 'Platform Engineering',
  velocity: 42,
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. STATIC DATA
// ═══════════════════════════════════════════════════════════════════════════
const COLUMN_ORDER = ['backlog', 'in_progress', 'review', 'done'];

const INITIAL_BOARD = {
  backlog: {
    id: 'backlog',
    title: 'Backlog',
    color: 'bg-slate-500',
    items: [
      { id: 't1', name: 'Design new dashboard UI',   assignee: 'AK', priority: 'High',     status: 'Not started' },
      { id: 't2', name: 'Error Task',                assignee: 'BL', priority: 'Critical', status: 'Not started' },
      { id: 't3', name: 'Write integration tests',   assignee: 'CM', priority: 'Medium',   status: 'Not started' },
    ],
  },
  in_progress: {
    id: 'in_progress',
    title: 'In Progress',
    color: 'bg-blue-500',
    items: [
      { id: 't4', name: 'Implement OAuth 2.0 flow',  assignee: 'DN', priority: 'High',   status: 'Working on it' },
      { id: 't5', name: 'Refactor API gateway',      assignee: 'EO', priority: 'Medium', status: 'Working on it' },
    ],
  },
  review: {
    id: 'review',
    title: 'In Review',
    color: 'bg-yellow-500',
    items: [
      { id: 't6', name: 'Mobile responsiveness fixes', assignee: 'FP', priority: 'High', status: 'In review' },
    ],
  },
  done: {
    id: 'done',
    title: 'Done',
    color: 'bg-green-500',
    items: [
      { id: 't7', name: 'Setup CI/CD pipeline', assignee: 'GQ', priority: 'Low',      status: 'Done' },
      { id: 't8', name: 'Security audit Q4',    assignee: 'HR', priority: 'Critical', status: 'Done' },
    ],
  },
};

const STATUSES = ['Not started', 'Working on it', 'Stuck', 'In review', 'Done', 'Waiting for review'];

const STATUS_COLORS = {
  'Not started':        'bg-slate-400 text-white',
  'Working on it':      'bg-blue-500  text-white',
  'Stuck':              'bg-red-500   text-white',
  'In review':          'bg-yellow-400 text-gray-900',
  'Done':               'bg-green-500 text-white',
  'Waiting for review': 'bg-purple-500 text-white',
};

const PRIORITY_COLORS = {
  Low:      'bg-gray-200   text-gray-700',
  Medium:   'bg-orange-200 text-orange-800',
  High:     'bg-red-200    text-red-700',
  Critical: 'bg-red-600    text-white',
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. HELPERS
// ═══════════════════════════════════════════════════════════════════════════
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Intentionally slow computation — O(n) with a large n — so that wrapping it
 * in a custom span produces a clearly visible long-duration entry in the
 * Sentry Performance → Interactions tab.
 */
function computeBoardMetrics(board) {
  let acc = 0;
  for (let i = 1; i < 6_000_000; i++) {
    acc += Math.sqrt(i) * Math.log(i);
  }

  const counts = Object.values(board).reduce(
    (map, col) => ({ ...map, [col.title]: col.items.length }),
    {}
  );
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  return { ...counts, 'Total Items': total, 'Perf Score': Math.round(acc % 100) };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. ITEM MODAL
//    Opening this fires a Sentry.addBreadcrumb — visible in the breadcrumb
//    trail of any subsequent error captured in the same session.
// ═══════════════════════════════════════════════════════════════════════════
function ItemModal({ item, columnId, onClose, onStatusChange }) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Modal header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{item.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">ID: {item.id} · Column: {columnId.replace('_', ' ')}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-gray-600 text-2xl leading-none ml-4"
          >
            &times;
          </button>
        </div>

        {/* Modal body */}
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 w-20">Assignee</span>
            <span className="bg-indigo-100 text-indigo-800 font-bold text-sm rounded-full w-8 h-8 flex items-center justify-center">
              {item.assignee.slice(0, 1)}
            </span>
            <span className="text-sm text-gray-700">{item.assignee}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 w-20">Priority</span>
            <span className={`text-xs rounded px-2 py-0.5 font-semibold ${PRIORITY_COLORS[item.priority]}`}>
              {item.priority}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 w-20">Status</span>
            {/* Status change in modal also fires a breadcrumb */}
            <select
              value={item.status}
              onChange={(e) => onStatusChange(item.id, columnId, e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-sm flex-1"
            >
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Demo hint */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 leading-relaxed">
            <strong>Sentry breadcrumb fired</strong> when this modal opened.<br />
            Trigger an error now to see it in the breadcrumb trail under <em>Issues → Event detail</em>.
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. TASK CARD
// ═══════════════════════════════════════════════════════════════════════════
function TaskCard({ item, columnId, columnOrder, onMove, onDelete, onOpenModal, onStatusChange, isMoving }) {
  const colIndex = columnOrder.indexOf(columnId);
  const isErrorTask = item.name === 'Error Task';

  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 shadow-sm p-3 space-y-2.5 transition-all duration-200
        ${isMoving ? 'opacity-40 scale-95' : 'hover:shadow-md'}
        ${isErrorTask ? 'border-red-300 ring-1 ring-red-200' : ''}`}
    >
      {/* Title — click opens modal + fires breadcrumb */}
      <button
        onClick={() => onOpenModal(item, columnId)}
        className="text-left text-sm font-semibold text-gray-800 hover:text-indigo-600 w-full leading-snug"
      >
        {isErrorTask && <span className="mr-1">⚠️</span>}
        {item.name}
      </button>

      {/* Assignee + Priority */}
      <div className="flex items-center gap-2">
        <span className="bg-indigo-100 text-indigo-800 font-bold text-xs rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
          {item.assignee.slice(0, 1)}
        </span>
        <span className={`text-xs rounded px-1.5 py-0.5 font-semibold ${PRIORITY_COLORS[item.priority]}`}>
          {item.priority}
        </span>
      </div>

      {/* Status dropdown — fires breadcrumb on change */}
      <select
        value={item.status}
        onChange={(e) => onStatusChange(item.id, columnId, e.target.value)}
        className={`w-full text-xs rounded-lg px-2 py-1 font-semibold cursor-pointer border-0 outline-none
          ${STATUS_COLORS[item.status] ?? 'bg-gray-200'}`}
      >
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      {/* Move + Delete actions */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex gap-1">
          <button
            disabled={colIndex === 0 || isMoving}
            onClick={() => onMove(item.id, columnId, columnOrder[colIndex - 1])}
            className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Move to previous column"
          >
            ← Move
          </button>
          <button
            disabled={colIndex === columnOrder.length - 1 || isMoving}
            onClick={() => onMove(item.id, columnId, columnOrder[colIndex + 1])}
            className="text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Move to next column"
          >
            Move →
          </button>
        </div>

        {/* Delete — triggers captureException for "Error Task" */}
        <button
          onClick={() => onDelete(item.id, columnId, item.name)}
          className={`text-xs px-2 py-1 rounded-md transition font-medium
            ${isErrorTask
              ? 'bg-red-100 text-red-700 hover:bg-red-200 animate-pulse'
              : 'bg-red-50 text-red-500 hover:bg-red-100'}`}
        >
          {isErrorTask ? '🔥 Delete' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. COLUMN
// ═══════════════════════════════════════════════════════════════════════════
function Column({ column, columnOrder, onMove, onDelete, onOpenModal, onStatusChange, movingTaskId }) {
  return (
    <div className="flex-1 min-w-[220px] max-w-[270px] flex flex-col">
      <div className={`${column.color} rounded-t-xl px-3 py-2.5`}>
        <h3 className="text-white font-bold text-sm tracking-wide">
          {column.title}{' '}
          <span className="opacity-70 font-normal text-xs">({column.items.length})</span>
        </h3>
      </div>
      <div className="bg-gray-50 rounded-b-xl p-2 space-y-2 flex-1 min-h-[180px]">
        {column.items.map((item) => (
          <TaskCard
            key={item.id}
            item={item}
            columnId={column.id}
            columnOrder={columnOrder}
            onMove={onMove}
            onDelete={onDelete}
            onOpenModal={onOpenModal}
            onStatusChange={onStatusChange}
            isMoving={movingTaskId === item.id}
          />
        ))}
        {column.items.length === 0 && (
          <div className="flex items-center justify-center h-20 text-gray-400 text-xs italic">
            No items
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. METRICS PANEL
// ═══════════════════════════════════════════════════════════════════════════
function MetricsPanel({ metrics, loading }) {
  if (!metrics && !loading) return null;

  return (
    <div className="mt-5 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
      <h4 className="text-sm font-bold text-indigo-800 mb-3">Board Metrics</h4>
      {loading ? (
        <p className="text-indigo-500 text-sm animate-pulse">Running heavy computation… (check Sentry Performance)</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {Object.entries(metrics).map(([k, v]) => (
            <div key={k} className="bg-white rounded-lg p-2.5 text-center shadow-sm border border-indigo-100">
              <p className="text-xs text-gray-500 mb-1">{k}</p>
              <p className="text-lg font-bold text-indigo-700">{v}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. MAIN BOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
function MondayLite() {
  const [board, setBoard]               = useState(INITIAL_BOARD);
  const [movingTaskId, setMovingTaskId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);   // { item, columnId }
  const [metrics, setMetrics]           = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [log, setLog]                   = useState([]);

  const pushLog = (msg) =>
    setLog((prev) => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev].slice(0, 10));

  // ─────────────────────────────────────────────────────────────────────────
  // 8a. MOVE TASK — manual instrumentation with nested child spans
  //
  //   Demo: Performance → Trace Explorer → click the "Move task" transaction
  //   You will see a waterfall with three spans:
  //     [task.move]  Move task t1: backlog → in_progress     ~480 ms
  //       [validate]   Validate Task Move                    ~120 ms
  //       [db.update]  Database Update (Monday Backend)      ~340 ms
  // ─────────────────────────────────────────────────────────────────────────
  const handleMoveTask = useCallback(async (taskId, fromColId, toColId) => {
    setMovingTaskId(taskId);

    await Sentry.startSpan(
      {
        op: 'task.move',
        name: `Move task ${taskId}: ${fromColId} → ${toColId}`,
        attributes: {
          'task.id':    taskId,
          from_column:  fromColId,
          to_column:    toColId,
        },
      },
      async () => {
        // ── Child span 1: Validation ─────────────────────────────────────
        await Sentry.startSpan(
          { op: 'validate', name: 'Validate Task Move' },
          async () => {
            await sleep(120);
            if (!INITIAL_BOARD[toColId]) {
              throw new Error(`[Monday Lite] Invalid target column: "${toColId}"`);
            }
          }
        );

        // ── Child span 2: DB / Network round-trip ────────────────────────
        await Sentry.startSpan(
          { op: 'db.update', name: 'Database Update (Monday Backend)' },
          async () => {
            await sleep(340); // simulates a POST to a real backend
          }
        );

        // Commit to local state only after the "write" succeeds
        setBoard((prev) => {
          const srcItems = prev[fromColId].items;
          const task     = srcItems.find((i) => i.id === taskId);
          if (!task) return prev;
          return {
            ...prev,
            [fromColId]: { ...prev[fromColId], items: srcItems.filter((i) => i.id !== taskId) },
            [toColId]:   { ...prev[toColId],   items: [...prev[toColId].items, { ...task }] },
          };
        });

        pushLog(`Moved task "${taskId}" → ${toColId}`);
      }
    );

    setMovingTaskId(null);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // 8b. DELETE TASK — Sentry.captureException for the "Error Task" demo
  //
  //   Demo: click the pulsing "🔥 Delete" button on "Error Task"
  //         → Issues tab → new ProtectedTaskDeleteError
  //         → Contexts sidebar shows task_info + sprint_data
  //         → Breadcrumb trail shows any prior modal opens / status changes
  // ─────────────────────────────────────────────────────────────────────────
  const handleDeleteTask = useCallback((taskId, columnId, taskName) => {
    if (taskName === 'Error Task') {
      const err  = new Error(`[Monday Lite] Attempted to delete a protected task: "${taskName}"`);
      err.name   = 'ProtectedTaskDeleteError';

      Sentry.withScope((scope) => {
        scope.setTag('action',      'delete_task');
        scope.setTag('task.name',   taskName);
        scope.setContext('task_info', { id: taskId, name: taskName, column: columnId });
        scope.setLevel('error');
        Sentry.captureException(err);
      });

      pushLog(`ERROR captured → "${taskName}" — check Sentry Issues`);
      alert(`"${taskName}" is protected.\n\nThis error was sent to Sentry with full context. Check the Issues tab!`);
      return;
    }

    setBoard((prev) => ({
      ...prev,
      [columnId]: {
        ...prev[columnId],
        items: prev[columnId].items.filter((i) => i.id !== taskId),
      },
    }));
    pushLog(`Deleted task "${taskName}"`);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // 8c. OPEN ITEM MODAL — fires addBreadcrumb
  //
  //   Demo: open a modal, then trigger an error → breadcrumb trail in Sentry
  //         shows "Opened item modal: Design new dashboard UI" as context.
  // ─────────────────────────────────────────────────────────────────────────
  const handleOpenModal = useCallback((item, columnId) => {
    Sentry.addBreadcrumb({
      category: 'ui.modal',
      message:  `Opened item modal: "${item.name}"`,
      level:    'info',
      data:     { itemId: item.id, column: columnId, priority: item.priority },
    });
    setSelectedItem({ item, columnId });
    pushLog(`Opened modal: "${item.name}"`);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // 8d. STATUS CHANGE — fires addBreadcrumb
  // ─────────────────────────────────────────────────────────────────────────
  const handleStatusChange = useCallback((taskId, columnId, newStatus) => {
    Sentry.addBreadcrumb({
      category: 'ui.interaction',
      message:  `Status changed → "${newStatus}"`,
      level:    'info',
      data:     { taskId, column: columnId, newStatus },
    });

    setBoard((prev) => ({
      ...prev,
      [columnId]: {
        ...prev[columnId],
        items: prev[columnId].items.map((i) =>
          i.id === taskId ? { ...i, status: newStatus } : i
        ),
      },
    }));

    // Keep modal in sync if it's open for the same item
    setSelectedItem((sel) =>
      sel?.item.id === taskId
        ? { ...sel, item: { ...sel.item, status: newStatus } }
        : sel
    );

    pushLog(`Task ${taskId} status → "${newStatus}"`);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // 8e. HEAVY COMPUTATION — custom span for the Performance demo
  //
  //   Demo: click "Calculate Board Metrics" → Performance tab → Interactions
  //         (or Trace Explorer) → find the "Calculate Board Metrics" span.
  //         Its duration will be several seconds, simulating a high INP /
  //         long task that blocks the main thread.
  //
  //   This is the same technique Monday.com would use to find slow renders
  //   or expensive reducers in their own codebase.
  // ─────────────────────────────────────────────────────────────────────────
  const handleComputeMetrics = useCallback(() => {
    setMetricsLoading(true);
    setMetrics(null);

    Sentry.startSpan(
      {
        op: 'ui.action.compute',
        name: 'Calculate Board Metrics (Heavy Computation)',
        attributes: {
          'board.columns':     COLUMN_ORDER.length,
          'board.total_items': Object.values(board).reduce((n, c) => n + c.items.length, 0),
        },
      },
      () => {
        const result = computeBoardMetrics(board); // intentionally slow
        setMetrics(result);
        setMetricsLoading(false);
        pushLog('Metrics computed — inspect the span in Sentry Performance');
      }
    );
  }, [board]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100">

      {/* ── HEADER ── */}
      <header className="bg-indigo-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">

          {/* Branding */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-700 font-black text-xl leading-none select-none">m</span>
            </div>
            <div>
              <h1 className="text-white text-lg font-bold tracking-tight leading-none">Monday Lite</h1>
              <p className="text-indigo-300 text-xs mt-0.5">workspace_type: enterprise · sprint: Q1 Demo</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            {/* Heavy computation — custom Sentry span */}
            <button
              onClick={handleComputeMetrics}
              disabled={metricsLoading}
              className="bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-gray-900 text-sm font-semibold
                         px-4 py-2 rounded-lg transition flex items-center gap-1.5"
            >
              <span>📊</span>
              {metricsLoading ? 'Computing…' : 'Calculate Board Metrics'}
            </button>

            {/* Error Boundary trigger */}
            <button
              onClick={() => {
                throw new Error('[Monday Lite] Unhandled render-phase exception — caught by Sentry.ErrorBoundary');
              }}
              className="bg-red-500 hover:bg-red-400 text-white text-sm font-semibold
                         px-4 py-2 rounded-lg transition flex items-center gap-1.5"
            >
              <span>💥</span> Trigger ErrorBoundary
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── BOARD ── */}
        <div className="flex gap-4 overflow-x-auto pb-2 items-start">
          {COLUMN_ORDER.map((colId) => (
            <Column
              key={colId}
              column={board[colId]}
              columnOrder={COLUMN_ORDER}
              onMove={handleMoveTask}
              onDelete={handleDeleteTask}
              onOpenModal={handleOpenModal}
              onStatusChange={handleStatusChange}
              movingTaskId={movingTaskId}
            />
          ))}
        </div>

        {/* ── METRICS PANEL ── */}
        <MetricsPanel metrics={metrics} loading={metricsLoading} />

        {/* ── ACTIVITY LOG ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="text-sm font-bold text-gray-700 mb-2">
            Activity Log{' '}
            <span className="text-gray-400 font-normal text-xs">(local only — events above go to Sentry)</span>
          </h4>
          {log.length === 0 ? (
            <p className="text-gray-400 text-xs italic">No activity yet. Try moving a task or opening a modal.</p>
          ) : (
            <ul className="space-y-1">
              {log.map((entry, i) => (
                <li key={i} className="text-xs text-gray-600 font-mono">{entry}</li>
              ))}
            </ul>
          )}
        </div>

        {/* ── DEMO CHEAT SHEET ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
            <h5 className="font-bold text-violet-800 mb-2 text-sm">Instrumentation in this app</h5>
            <ul className="space-y-1.5 text-xs text-violet-700 list-none">
              <li><span className="font-mono bg-violet-100 px-1 rounded">← Move / Move →</span> fires nested spans: <em>validate</em> + <em>db.update</em></li>
              <li><span className="font-mono bg-violet-100 px-1 rounded">Click task title</span> fires <code>addBreadcrumb</code> (modal opened)</li>
              <li><span className="font-mono bg-violet-100 px-1 rounded">Status dropdown</span> fires <code>addBreadcrumb</code> (status changed)</li>
              <li><span className="font-mono bg-violet-100 px-1 rounded">🔥 Delete "Error Task"</span> fires <code>captureException</code></li>
              <li><span className="font-mono bg-violet-100 px-1 rounded">📊 Calculate Metrics</span> fires slow custom span</li>
              <li><span className="font-mono bg-violet-100 px-1 rounded">💥 ErrorBoundary</span> throws → caught by <code>Sentry.ErrorBoundary</code></li>
            </ul>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <h5 className="font-bold text-emerald-800 mb-2 text-sm">Where to point in the Sentry UI</h5>
            <ul className="space-y-1.5 text-xs text-emerald-700 list-none">
              <li><strong>Issues</strong> → ProtectedTaskDeleteError with task_info context</li>
              <li><strong>Performance → Trace Explorer</strong> → "Move task" waterfall with child spans</li>
              <li><strong>Performance → Interactions / Web Vitals</strong> → long INP from metrics compute</li>
              <li><strong>Session Replay</strong> → auto-attached to every error event</li>
              <li><strong>Issue sidebar → Tags</strong> → <code>workspace_type: enterprise</code></li>
              <li><strong>Issue sidebar → Contexts</strong> → <code>sprint_data</code> object</li>
            </ul>
          </div>
        </div>
      </main>

      {/* ── ITEM MODAL ── */}
      {selectedItem && (
        <ItemModal
          item={selectedItem.item}
          columnId={selectedItem.columnId}
          onClose={() => setSelectedItem(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. ERROR BOUNDARY FALLBACK
//    Demo: shows engineers how Sentry.ErrorBoundary provides a user-friendly
//    recovery screen while automatically shipping the full error + replay.
// ═══════════════════════════════════════════════════════════════════════════
function ErrorFallback({ error, resetError }) {
  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center space-y-4">
        <div className="text-5xl">💥</div>
        <h2 className="text-2xl font-bold text-red-700">Something went wrong</h2>
        <p className="text-sm font-mono bg-gray-100 rounded-lg p-3 text-left break-words text-gray-700">
          {error?.message}
        </p>
        <p className="text-gray-500 text-sm leading-relaxed">
          This crash was automatically captured in Sentry with a full stack trace,
          breadcrumb trail, <strong>workspace_type</strong> tag, <strong>sprint_data</strong> context,
          and a Session Replay recording.
        </p>
        <button
          onClick={resetError}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-semibold transition"
        >
          Reload Board
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. ROOT EXPORT — wrapped in Sentry.ErrorBoundary
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  return (
    <Sentry.ErrorBoundary fallback={ErrorFallback} showDialog>
      <MondayLite />
    </Sentry.ErrorBoundary>
  );
}
