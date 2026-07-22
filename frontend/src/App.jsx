import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';

function Header() {
  const location = useLocation();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="text-white font-bold text-lg">G</span>
          </div>
          <div>
            <span className="font-semibold text-lg tracking-tight text-white">GenHealth</span>
            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-mono border border-cyan-500/20">v2.0</span>
          </div>
        </div>

        <nav className="flex items-center space-x-1">
          <Link
            to="/"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/status"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/status'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            System Status
          </Link>
        </nav>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
            Tailwind Active
          </span>
        </div>
      </div>
    </header>
  );
}

function DashboardView() {
  const [testCount, setTestCount] = useState(0);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>Vite + React Frontend Scaffolding</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Clinical AI & Health Data Workspace
          </h1>

          <p className="text-slate-400 text-lg leading-relaxed">
            Frontend service integrated with Vite, Tailwind CSS, Axios, and React Router. Ready to build health record analytics and clinical workflow automation.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => setTestCount((c) => c + 1)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium shadow-lg shadow-cyan-500/25 transition-all duration-200 active:scale-95"
            >
              Interactive Test Count: {testCount}
            </button>

            <a
              href="#integrations"
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700 transition-colors"
            >
              View Configs
            </a>
          </div>
        </div>
      </div>

      {/* Integration Grid */}
      <div id="integrations" className="grid md:grid-cols-3 gap-6">
        {/* Card 1: API Config */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 hover:border-slate-700 transition-all shadow-lg">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-mono font-bold text-sm border border-blue-500/20">
            API
          </div>
          <h3 className="text-lg font-semibold text-white">Backend Connection</h3>
          <p className="text-sm text-slate-400">
            Targeting FastAPI backend service:
          </p>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 break-all">
            {apiBaseUrl}
          </div>
        </div>

        {/* Card 2: Tailwind Styling */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 hover:border-slate-700 transition-all shadow-lg">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-sm border border-cyan-500/20">
            TW
          </div>
          <h3 className="text-lg font-semibold text-white">Tailwind CSS v4</h3>
          <p className="text-sm text-slate-400">
            Utility-first styling loaded via Vite official plugin integration.
          </p>
          <div className="flex items-center space-x-2 pt-1">
            <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 text-xs font-medium border border-indigo-500/20">Flex/Grid</span>
            <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">Dark Mode</span>
            <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 text-xs font-medium border border-purple-500/20">Gradients</span>
          </div>
        </div>

        {/* Card 3: Stack Libraries */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 hover:border-slate-700 transition-all shadow-lg">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-sm border border-purple-500/20">
            LIB
          </div>
          <h3 className="text-lg font-semibold text-white">Dependencies</h3>
          <p className="text-sm text-slate-400">
            Installed dependencies verification:
          </p>
          <ul className="text-xs space-y-1.5 font-mono text-slate-300">
            <li className="flex items-center text-emerald-400">
              <span className="mr-1.5">✓</span> axios (HTTP Client)
            </li>
            <li className="flex items-center text-emerald-400">
              <span className="mr-1.5">✓</span> react-router-dom (Routing)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatusView() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  return (
    <div className="space-y-6">
      <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h2 className="text-2xl font-bold text-white">System Diagnostics & Status</h2>
        <p className="text-slate-400">
          React Router sub-page demonstrating seamless route rendering.
        </p>

        <div className="grid md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Axios Library</span>
            <p className="text-sm text-slate-200">
              Axios instance ready at <code className="text-cyan-400">{apiBaseUrl}</code>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Router Active</span>
            <p className="text-sm text-slate-200">
              Current route: <code className="text-cyan-400">/status</code>
            </p>
          </div>
        </div>

        <Link
          to="/"
          className="inline-block mt-4 text-sm text-cyan-400 hover:text-cyan-300 font-medium"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Header />
        <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
          <Routes>
            <Route path="/" element={<DashboardView />} />
            <Route path="/status" element={<StatusView />} />
          </Routes>
        </main>
        <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
          GenHealth 2.0 • Frontend Service • Vite + React + Tailwind CSS
        </footer>
      </div>
    </BrowserRouter>
  );
}
