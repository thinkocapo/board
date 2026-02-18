import React, { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';
import Tasks   from './pages/Tasks';
import Sprints from './pages/Sprints';
import Epics   from './pages/Epics';

// ═══════════════════════════════════════════════════════════════════════════
// 1. SENTRY INITIALIZATION
//
//    Key upgrade from the single-page version:
//    reactRouterV6BrowserTracingIntegration replaces browserTracingIntegration
//    so that each sidebar navigation (/tasks, /sprints, /epics) is recorded
//    as a NAMED transaction in Sentry Performance — fully automatic.
//
//    Demo: navigate between pages, then open Performance → Transactions and
//    filter by name. You'll see distinct entries for /tasks, /sprints, /epics
//    each with their own load time and child spans.
// ═══════════════════════════════════════════════════════════════════════════
Sentry.init({
  dsn: 'https://7db0eda1ad18469f80353b3b26c436b6@o262702.ingest.us.sentry.io/1776195',
  integrations: [
    Sentry.reactRouterV6BrowserTracingIntegration({
      useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// Workspace-level context — attached to every event
Sentry.setTag('workspace_type', 'enterprise');
Sentry.setContext('sprint_data', {
  id: 'sprint-2024',
  goal: 'Q1 Demo',
  team: 'Platform Engineering',
  velocity: 42,
});

// Wrap Routes so each navigation produces a named Sentry transaction
const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes);

// ═══════════════════════════════════════════════════════════════════════════
// 2. SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════
const NAV_ITEMS = [
  { to: '/tasks',   label: 'Tasks',   icon: '📋', sub: 'Kanban board'    },
  { to: '/sprints', label: 'Sprints', icon: '🏃', sub: 'Sprint planning' },
  { to: '/epics',   label: 'Epics',   icon: '⚡', sub: 'Epic tracking'   },
];

function Sidebar() {
  return (
    <aside className="w-56 bg-indigo-900 min-h-screen flex flex-col flex-shrink-0">

      {/* Logo */}
      <div className="p-4 border-b border-indigo-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-700 font-black text-xl leading-none select-none">m</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Monday Lite</p>
            <p className="text-indigo-400 text-xs mt-0.5">Enterprise workspace</p>
          </div>
        </div>
      </div>

      {/* Navigation — clicking any link fires a Sentry route-change transaction */}
      <nav className="p-2 pt-4 flex-1">
        <p className="text-indigo-500 text-xs font-semibold uppercase tracking-wider px-3 mb-2">
          Main Menu
        </p>
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5 transition-all
              ${isActive
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-indigo-300 hover:bg-indigo-800 hover:text-white'}`
            }
          >
            <span className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Sprint badge */}
      <div className="p-3 border-t border-indigo-800">
        <div className="flex items-center gap-2 px-2">
          <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            Q
          </div>
          <div className="min-w-0">
            <p className="text-indigo-200 text-xs font-medium leading-none">Q1 Demo</p>
            <p className="text-indigo-500 text-xs mt-0.5">Sprint active</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LAYOUT — sidebar + routed content area
// ═══════════════════════════════════════════════════════════════════════════
function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 overflow-auto min-w-0">
        <SentryRoutes>
          <Route path="/tasks"   element={<Tasks />}   />
          <Route path="/sprints" element={<Sprints />} />
          <Route path="/epics"   element={<Epics />}   />
          <Route path="*"        element={<Navigate to="/tasks" replace />} />
        </SentryRoutes>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. ERROR BOUNDARY FALLBACK
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
// 5. ROOT EXPORT
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  return (
    <Sentry.ErrorBoundary fallback={ErrorFallback} showDialog>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  );
}
