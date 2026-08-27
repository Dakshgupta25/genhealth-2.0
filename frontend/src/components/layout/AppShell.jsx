import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import DoodleIcon from '../common/DoodleIcon';

export function AppShell({ children }) {
  const { user, userId, logout, selectedHospital, setSelectedHospital } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Primary Nav links in exact order: Dashboard -> Upload -> Family Tree -> Doctor Portal
  const navItems = [
    { label: 'Dashboard', path: '/', icon: 'dashboard' },
    { label: 'Upload', path: '/upload', icon: 'upload' },
    { label: 'Family Tree', path: '/family-tree', icon: 'tree' },
    { label: 'Doctor Portal', path: '/doctor-portal', icon: 'doctor' },
  ];

  const handleCopyId = () => {
    if (userId) {
      navigator.clipboard.writeText(userId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden selection:bg-slate-800 selection:text-white"
         style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Visual Accent: Top-Right Dark Navy Corner Shape */}
      <div 
        className="absolute top-0 right-0 w-80 h-32 md:w-96 md:h-40 pointer-events-none z-0 rounded-bl-[80px] transition-all duration-300 opacity-90"
        style={{ backgroundColor: 'var(--bg-accent-corner)' }}
      >
        <div className="absolute top-4 right-6 flex items-center space-x-2 text-xs font-mono text-slate-300/80">
          <DoodleIcon name="heartbeat" className="w-4 h-4 text-sky-400" />
          <span>GenHealth 2.0</span>
        </div>
      </div>

      {/* Main Top Header / Brand Bar */}
      <header className="relative z-10 border-b transition-colors duration-200"
              style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'transparent' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm"
                 style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--text-on-accent)' }}>
              <DoodleIcon name="pill" className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                  GenHealth
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: 'var(--brand-soft-blue)', color: 'var(--text-accent)' }}>
                  v2.0
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Clinical AI & Diagnostic Intelligence
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container: 2-Column Responsive Layout with Primary Nav & Main Content alongside Side Panel */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Left / Center Area: Primary Navigation + Page Content (9 Cols on Desktop) */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col space-y-6">
          
          {/* Primary Navigation Bar: Order: Dashboard -> Upload -> Family Tree -> Doctor Portal */}
          <nav className="p-1.5 rounded-2xl flex flex-wrap items-center gap-1.5 border shadow-sm transition-all"
               style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'shadow-sm text-white'
                      : 'hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: isActive ? 'var(--brand-primary)' : 'transparent',
                    color: isActive ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                  }}
                >
                  <DoodleIcon name={item.icon} className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Dynamic Page Content */}
          <main className="flex-1">
            {children}
          </main>
        </div>

        {/* Unified Side Section: Hospital Filter + Profile Controls (3-4 Cols on Desktop) */}
        <aside className="lg:col-span-4 xl:col-span-3 space-y-6">
          
          {/* Combined Side Card: Cohesive grouping of Hospital Filter & Profile */}
          <div className="p-6 rounded-2xl border shadow-sm space-y-6 transition-all"
               style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
            
            {/* Hospital Filter Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5"
                       style={{ color: 'var(--text-muted)' }}>
                  <DoodleIcon name="hospital" className="w-3.5 h-3.5" />
                  <span>Hospital Scope</span>
                </label>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: 'var(--brand-soft-blue)', color: 'var(--text-accent)' }}>
                  Active Filter
                </span>
              </div>
              <select
                id="hospital-filter-select"
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-colors outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="general">General / All Hospitals</option>
                <option value="city_general">City General Hospital</option>
                <option value="memorial_clinic">Memorial Diagnostic Center</option>
                <option value="apex_labs">Apex Clinical Laboratories</option>
              </select>
              <p className="text-[11px] leading-tight" style={{ color: 'var(--text-muted)' }}>
                Filter reports and analytics across medical facilities.
              </p>
            </div>

            <div className="border-t" style={{ borderColor: 'var(--border-subtle)' }} />

            {/* Profile & User Controls Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  User Profile
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                  user?.role === 'doctor'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                }`}>
                  {user?.role || 'Patient'}
                </span>
              </div>

              {/* User Details */}
              <div className="p-3.5 rounded-xl border flex items-center space-x-3"
                   style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-inner"
                     style={{ backgroundColor: 'var(--brand-soft-blue)', color: 'var(--brand-primary)' }}>
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    {user?.full_name || 'Guest User'}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {user?.email || 'Not logged in'}
                  </div>
                </div>
              </div>

              {/* Unique User ID Display with Copy */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold flex items-center justify-between"
                       style={{ color: 'var(--text-muted)' }}>
                  <span>Unique User ID:</span>
                  {copiedId && <span className="text-emerald-500 font-normal text-[10px]">Copied!</span>}
                </label>
                <div 
                  onClick={handleCopyId}
                  title="Click to copy User ID"
                  className="px-3 py-2 rounded-xl text-xs font-mono border flex items-center justify-between cursor-pointer hover:border-slate-400 transition-all select-all break-all"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-accent)',
                  }}
                >
                  <span className="truncate">{userId || 'No ID assigned'}</span>
                  <span className="text-[10px] ml-2 text-slate-400">📋</span>
                </div>
              </div>

              {/* Action Controls: Theme Toggle & Logout */}
              <div className="pt-2 grid grid-cols-2 gap-2">
                <button
                  onClick={toggleTheme}
                  id="theme-toggle-btn"
                  className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <DoodleIcon name={theme === 'dark' ? 'sun' : 'moon'} className="w-3.5 h-3.5" />
                  <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
                </button>

                <button
                  onClick={handleLogout}
                  id="logout-btn"
                  className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <DoodleIcon name="logout" className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>

              <button
                onClick={() => setProfileModalOpen(true)}
                className="w-full py-2 text-center text-xs font-semibold hover:underline"
                style={{ color: 'var(--text-accent)' }}
              >
                View Full Profile Details
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Profile Details Modal */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-5 animate-in fade-in"
               style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)', color: 'var(--text-primary)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <h3 className="text-lg font-bold">User Medical Profile</h3>
              <button 
                onClick={() => setProfileModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Full Name:</span>
                <p className="font-semibold">{user?.full_name || 'N/A'}</p>
              </div>
              <div>
                <span className="text-xs uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Email Address:</span>
                <p className="font-semibold">{user?.email || 'N/A'}</p>
              </div>
              <div>
                <span className="text-xs uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Role:</span>
                <p className="font-semibold capitalize">{user?.role || 'Patient'}</p>
              </div>
              <div>
                <span className="text-xs uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Unique User ID:</span>
                <p className="font-mono text-xs p-2 rounded-lg break-all" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  {userId || 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-xs uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Member Since:</span>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {user?.created_at ? new Date(user.created_at).toLocaleString() : 'Just now'}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end" style={{ borderColor: 'var(--border-subtle)' }}>
              <button
                onClick={() => setProfileModalOpen(false)}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white shadow-sm"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppShell;
