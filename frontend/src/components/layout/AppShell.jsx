import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import DoodleIcon from '../common/DoodleIcon';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export function AppShell({ children }) {
  const { user, userId, logout, selectedHospital, setSelectedHospital } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Primary Nav links in exact order: Dashboard -> Upload -> Family Tree -> Doctor Portal
  const navItems = [
    { label: 'Dashboard', path: '/', icon: 'dashboard' },
    { label: 'Upload', path: '/upload', icon: 'upload' },
    { label: 'Family Tree', path: '/family-tree', icon: 'tree' },
    { label: 'Doctor Portal', path: '/doctor-portal', icon: 'doctor' },
  ];

  const handleCopyId = (e) => {
    if (e) e.stopPropagation();
    if (userId) {
      navigator.clipboard.writeText(userId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleLogout = () => {
    setProfileMenuOpen(false);
    logout();
    navigate('/login');
  };

  const userInitial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
    >
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#141C19]/90 backdrop-blur-md border-b border-[#D0D9D0] dark:border-[#2A3B34] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Left: Brand Identity */}
          <div
            className="flex items-center space-x-3 cursor-pointer select-none shrink-0 group"
            onClick={() => navigate('/')}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#0D5446] text-white dark:bg-[#1A2421] dark:border dark:border-[#2A3B34] shadow-xs group-hover:bg-[#0A4337] transition-colors">
              <DoodleIcon name="logo-pulse" className="w-5 h-5 text-emerald-300 dark:text-[#3BB298]" strokeWidth={1.6} />
            </div>
            <div>
              <div className="flex items-center space-x-1.5 leading-none">
                <span className="text-base font-bold tracking-tight text-[#11231E] dark:text-[#ECF2EE]">
                  GenHealth
                </span>
                <span className="text-base font-bold text-[#0D5446] dark:text-[#3BB298]">
                  AI
                </span>
              </div>
              <p className="text-[10px] font-medium text-[#586D66] dark:text-[#7C9184] leading-tight mt-0.5 hidden sm:block">
                Clinical AI &amp; Diagnostic Intelligence
              </p>
            </div>
          </div>

          {/* Center: Primary Navigation Tabs (Desktop & Tablet) */}
          <nav className="hidden md:flex items-center space-x-1 bg-[#EDF1ED] dark:bg-[#1A2421] p-1 rounded-lg border border-[#D6DDD6] dark:border-[#2A3B34]">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-white dark:bg-[#141C19] text-[#11231E] dark:text-[#ECF2EE] shadow-xs border border-[#D0D9D0] dark:border-[#2A3B34]'
                      : 'text-[#586D66] dark:text-[#7C9184] hover:text-[#11231E] dark:hover:text-[#ECF2EE] hover:bg-[#E3EFE9]/60 dark:hover:bg-[#23312B]'
                  }`}
                >
                  <DoodleIcon
                    name={item.icon}
                    className={`w-3.5 h-3.5 ${
                      isActive
                        ? 'text-[#0D5446] dark:text-[#3BB298]'
                        : 'text-[#586D66] dark:text-[#7C9184]'
                    }`}
                  />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right: Hospital Scope + Theme Toggle + User Menu */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            
            {/* Hospital Scope Selector */}
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#EDF1ED] dark:bg-[#1A2421] border border-[#D6DDD6] dark:border-[#2A3B34]">
              <DoodleIcon name="hospital" className="w-3.5 h-3.5 text-[#0D5446] dark:text-[#3BB298]" />
              <select
                id="hospital-filter-select"
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                className="text-xs font-medium bg-transparent text-[#11231E] dark:text-[#ECF2EE] outline-none cursor-pointer pr-1"
              >
                <option value="general" className="dark:bg-[#141C19]">All Facilities</option>
                <option value="city_general" className="dark:bg-[#141C19]">City General Hospital</option>
                <option value="memorial_clinic" className="dark:bg-[#141C19]">Memorial Diagnostic</option>
                <option value="apex_labs" className="dark:bg-[#141C19]">Apex Clinical Labs</option>
              </select>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              id="theme-toggle-btn"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="w-9 h-9 rounded-lg flex items-center justify-center border border-[#D0D9D0] dark:border-[#2A3B34] text-[#334740] dark:text-[#B2C2B8] hover:bg-[#EDF1ED] dark:hover:bg-[#1A2421] hover:text-[#11231E] dark:hover:text-[#ECF2EE] transition-colors"
            >
              <DoodleIcon name={theme === 'dark' ? 'sun' : 'moon'} className="w-4 h-4" />
            </button>

            {/* User Profile Dropdown Menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={profileMenuOpen}
                className="flex items-center space-x-2 p-1 pl-2 pr-2.5 rounded-lg border border-[#D0D9D0] dark:border-[#2A3B34] hover:bg-[#EDF1ED] dark:hover:bg-[#1A2421] transition-colors min-h-[38px]"
              >
                <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold bg-[#E3EFE9] text-[#0D5446] dark:bg-[#1A332B] dark:text-[#3BB298]">
                  {userInitial}
                </div>
                <div className="hidden sm:flex flex-col text-left leading-none">
                  <span className="text-xs font-bold text-[#11231E] dark:text-[#ECF2EE] truncate max-w-[100px]">
                    {user?.full_name || 'Guest'}
                  </span>
                  <span className="text-[10px] text-[#586D66] dark:text-[#7C9184] capitalize">
                    {user?.role || 'Patient'}
                  </span>
                </div>
                <DoodleIcon name="chevron-down" className="w-3 h-3 text-[#586D66] dark:text-[#7C9184]" />
              </button>

              {/* Dropdown Menu Popover */}
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-[#141C19] border border-[#D0D9D0] dark:border-[#2A3B34] rounded-xl shadow-xl z-50 p-2.5 text-xs animate-in fade-in zoom-in-95 duration-150">
                  {/* User Profile Header */}
                  <div className="p-3 bg-[#EDF1ED] dark:bg-[#1A2421] rounded-lg space-y-1 mb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#11231E] dark:text-[#ECF2EE] text-xs truncate">
                        {user?.full_name || 'User Profile'}
                      </span>
                      <Badge status={user?.role === 'doctor' ? 'purple' : 'normal'} size="sm">
                        {user?.role || 'Patient'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[#586D66] dark:text-[#7C9184] truncate">
                      {user?.email || 'No email registered'}
                    </p>
                  </div>

                  {/* Unique User ID Row */}
                  <div className="px-1.5 py-1.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-[#586D66] dark:text-[#7C9184]">
                      <span>Unique User ID</span>
                      {copiedId && (
                        <span className="text-emerald-700 dark:text-[#4ADE80] font-semibold text-[10px]">
                          ✓ Copied
                        </span>
                      )}
                    </div>
                    <div
                      onClick={handleCopyId}
                      title="Click to copy User ID"
                      className="p-2.5 rounded-lg bg-[#F5F7F5] dark:bg-[#0F1714] border border-[#D6DDD6] dark:border-[#23312B] font-mono text-[11px] text-[#11231E] dark:text-[#ECF2EE] flex items-center justify-between cursor-pointer hover:border-[#0D5446] dark:hover:border-[#3BB298] transition-colors min-h-[40px]"
                    >
                      <span className="truncate">{userId || 'No ID assigned'}</span>
                      <DoodleIcon name="copy" className="w-3.5 h-3.5 text-[#586D66] dark:text-[#7C9184] shrink-0 ml-1.5" />
                    </div>
                  </div>

                  {/* Facility Selector for mobile */}
                  <div className="lg:hidden px-1.5 py-2 border-t border-[#EDF1ED] dark:border-[#1A2421] space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#586D66] dark:text-[#7C9184]">
                      Hospital Facility
                    </label>
                    <select
                      value={selectedHospital}
                      onChange={(e) => setSelectedHospital(e.target.value)}
                      className="w-full h-10 px-2.5 rounded-lg bg-[#F5F7F5] dark:bg-[#0F1714] border border-[#D6DDD6] dark:border-[#23312B] text-[#11231E] dark:text-[#ECF2EE] text-xs font-medium cursor-pointer outline-none"
                    >
                      <option value="general" className="dark:bg-[#141C19]">All Facilities</option>
                      <option value="city_general" className="dark:bg-[#141C19]">City General Hospital</option>
                      <option value="memorial_clinic" className="dark:bg-[#141C19]">Memorial Diagnostic</option>
                      <option value="apex_labs" className="dark:bg-[#141C19]">Apex Clinical Labs</option>
                    </select>
                  </div>

                  <div className="border-t border-[#EDF1ED] dark:border-[#1A2421] my-1.5" />

                  {/* Action Links */}
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setProfileModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[#EDF1ED] dark:hover:bg-[#1A2421] text-[#334740] dark:text-[#B2C2B8] font-medium flex items-center space-x-2 transition-colors min-h-[38px]"
                  >
                    <DoodleIcon name="user" className="w-3.5 h-3.5 text-[#586D66] dark:text-[#7C9184]" />
                    <span>View Medical Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    id="logout-btn"
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-700 dark:text-red-400 font-medium flex items-center space-x-2 transition-colors min-h-[38px]"
                  >
                    <DoodleIcon name="logout" className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Sub-bar */}
        <div className="md:hidden border-t border-[#D0D9D0] dark:border-[#2A3B34] px-3 py-1.5 flex items-center justify-between gap-1 overflow-x-auto bg-[#F5F7F5]/90 dark:bg-[#0E1412]/80 backdrop-blur-xs">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors min-h-[36px] ${
                  isActive
                    ? 'bg-white dark:bg-[#141C19] text-[#11231E] dark:text-[#ECF2EE] border border-[#D0D9D0] dark:border-[#2A3B34] shadow-xs'
                    : 'text-[#586D66] dark:text-[#7C9184] hover:text-[#11231E] dark:hover:text-[#ECF2EE]'
                }`}
              >
                <DoodleIcon name={item.icon} className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </header>

      {/* Main Full-Width Content Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>

      {/* Profile Details Modal */}
      <Modal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="User Medical Profile"
        subtitle="Account identity and clinical record details"
        icon={<DoodleIcon name="user" className="w-4 h-4" />}
        footer={
          <Button variant="secondary" size="sm" onClick={() => setProfileModalOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-bold text-[#586D66] dark:text-[#7C9184] uppercase tracking-wider text-[10px]">
                Full Name
              </span>
              <p className="text-sm font-semibold text-[#11231E] dark:text-[#ECF2EE] mt-0.5">
                {user?.full_name || 'N/A'}
              </p>
            </div>
            <div>
              <span className="font-bold text-[#586D66] dark:text-[#7C9184] uppercase tracking-wider text-[10px]">
                Role
              </span>
              <div className="mt-0.5">
                <Badge status={user?.role === 'doctor' ? 'purple' : 'normal'}>
                  {user?.role || 'Patient'}
                </Badge>
              </div>
            </div>
          </div>

          <div>
            <span className="font-bold text-[#586D66] dark:text-[#7C9184] uppercase tracking-wider text-[10px]">
              Email Address
            </span>
            <p className="text-sm font-semibold text-[#11231E] dark:text-[#ECF2EE] mt-0.5">
              {user?.email || 'N/A'}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-[#586D66] dark:text-[#7C9184] uppercase tracking-wider text-[10px]">
                Unique User ID (UUID)
              </span>
              {copiedId && (
                <span className="text-emerald-700 dark:text-[#4ADE80] font-semibold text-[10px]">
                  ✓ Copied to clipboard
                </span>
              )}
            </div>
            <div
              onClick={handleCopyId}
              title="Click to copy User ID"
              className="p-2.5 rounded-lg bg-[#F5F7F5] dark:bg-[#0F1714] border border-[#D6DDD6] dark:border-[#23312B] font-mono text-xs text-[#11231E] dark:text-[#ECF2EE] flex items-center justify-between cursor-pointer hover:border-[#0D5446] dark:hover:border-[#3BB298] transition-colors"
            >
              <span className="truncate">{userId || 'N/A'}</span>
              <DoodleIcon name="copy" className="w-4 h-4 text-[#586D66] dark:text-[#7C9184] ml-2 shrink-0" />
            </div>
            <p className="text-[11px] text-[#586D66] dark:text-[#7C9184] mt-1 leading-tight">
              Share this ID with family members or clinical providers to link records securely.
            </p>
          </div>

          <div>
            <span className="font-bold text-[#586D66] dark:text-[#7C9184] uppercase tracking-wider text-[10px]">
              Account Created
            </span>
            <p className="text-xs text-[#334740] dark:text-[#B2C2B8] mt-0.5">
              {user?.created_at ? new Date(user.created_at).toLocaleString() : 'Active session'}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default AppShell;
