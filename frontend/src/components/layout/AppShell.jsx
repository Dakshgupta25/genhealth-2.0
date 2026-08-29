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
      {/* Top Header Bar (Dark Charcoal Anchor for Both Light & Dark Modes) */}
      <header className="sticky top-0 z-40 w-full bg-[#141414] border-b border-[#262626] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-6">
          
          {/* Left: Brand Identity */}
          <div
            className="flex items-center space-x-3 cursor-pointer select-none shrink-0 group"
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 rounded-[8px] flex items-center justify-center bg-white text-[#141414] shadow-xs group-hover:bg-[#B4232F] group-hover:text-white transition-colors">
              <DoodleIcon name="logo-pulse" className="w-4 h-4" strokeWidth={1.8} />
            </div>
            <div>
              <div className="flex items-center space-x-1 leading-none">
                <span className="text-base font-bold tracking-tight text-white">
                  GenHealth
                </span>
                <span className="text-base font-bold text-[#D64550]">
                  AI
                </span>
              </div>
              <p className="text-[10px] font-medium text-[#858585] leading-tight mt-0.5 hidden sm:block">
                Clinical Intelligence
              </p>
            </div>
          </div>

          {/* Center/Left: Primary Navigation Tabs (Desktop & Tablet) */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-[6px] text-xs font-semibold transition-all duration-150 relative ${
                    isActive
                      ? 'text-white bg-[#B4232F]'
                      : 'text-[#9E9E9E] hover:text-white hover:bg-[#222222]'
                  }`}
                >
                  <DoodleIcon
                    name={item.icon}
                    className={`w-3.5 h-3.5 ${
                      isActive
                        ? 'text-white'
                        : 'text-[#858585]'
                    }`}
                  />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right: Hospital Scope + Theme Toggle + User Menu */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 ml-auto md:ml-0">
            
            {/* Hospital Scope Selector */}
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-[6px] bg-[#202020] border border-[#333333]">
              <DoodleIcon name="hospital" className="w-3.5 h-3.5 text-[#858585]" />
              <select
                id="hospital-filter-select"
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                className="text-xs font-medium bg-transparent text-[#E0E0E0] outline-none cursor-pointer pr-1"
              >
                <option value="general" className="bg-[#202020] text-white">All Facilities</option>
                <option value="city_general" className="bg-[#202020] text-white">City General Hospital</option>
                <option value="memorial_clinic" className="bg-[#202020] text-white">Memorial Diagnostic</option>
                <option value="apex_labs" className="bg-[#202020] text-white">Apex Clinical Labs</option>
              </select>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              id="theme-toggle-btn"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="w-8.5 h-8.5 rounded-[6px] flex items-center justify-center border border-[#333333] text-[#A0A0A0] hover:bg-[#252525] hover:text-white transition-colors cursor-pointer"
            >
              <DoodleIcon name={theme === 'dark' ? 'sun' : 'moon'} className="w-3.5 h-3.5" />
            </button>

            {/* User Profile Dropdown Menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={profileMenuOpen}
                className="flex items-center space-x-2 p-1 pl-1.5 pr-2.5 rounded-[6px] border border-[#333333] hover:bg-[#252525] transition-colors min-h-[34px] cursor-pointer"
              >
                <div className="w-6 h-6 rounded-[4px] flex items-center justify-center text-xs font-bold bg-[#B4232F] text-white">
                  {userInitial}
                </div>
                <div className="hidden sm:flex flex-col text-left leading-none">
                  <span className="text-xs font-semibold text-white truncate max-w-[100px]">
                    {user?.full_name || 'Guest'}
                  </span>
                  <span className="text-[10px] text-[#858585] capitalize">
                    {user?.role || 'Patient'}
                  </span>
                </div>
                <DoodleIcon name="chevron-down" className="w-3 h-3 text-[#858585]" />
              </button>

              {/* Dropdown Menu Popover */}
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-[#1E1E1E] border border-[#E3E3DF] dark:border-[#303030] rounded-[10px] shadow-lg z-50 p-2.5 text-xs animate-in fade-in zoom-in-95 duration-150">
                  {/* User Profile Header */}
                  <div className="p-3 bg-[#F4F4F2] dark:bg-[#252525] rounded-[8px] space-y-1 mb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#171717] dark:text-[#F0F0F0] text-xs truncate">
                        {user?.full_name || 'User Profile'}
                      </span>
                      <Badge status={user?.role === 'doctor' ? 'brand' : 'normal'} size="sm">
                        {user?.role || 'Patient'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[#5F6368] dark:text-[#A0A0A0] truncate">
                      {user?.email || 'No email registered'}
                    </p>
                  </div>

                  {/* Unique User ID Row */}
                  <div className="px-1.5 py-1.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-[#5F6368] dark:text-[#A0A0A0]">
                      <span>Unique Patient UUID</span>
                      {copiedId && (
                        <span className="text-[#247A59] dark:text-[#48BB78] font-semibold text-[10px]">
                          ✓ Copied
                        </span>
                      )}
                    </div>
                    <div
                      onClick={handleCopyId}
                      title="Click to copy User ID"
                      className="p-2 rounded-[6px] bg-[#FCFCFB] dark:bg-[#181818] border border-[#E3E3DF] dark:border-[#303030] font-mono text-[11px] text-[#171717] dark:text-[#F0F0F0] flex items-center justify-between cursor-pointer hover:border-[#B4232F] dark:hover:border-[#E04855] transition-colors"
                    >
                      <span className="truncate">{userId || 'No ID assigned'}</span>
                      <DoodleIcon name="copy" className="w-3.5 h-3.5 text-[#858585] shrink-0 ml-1.5" />
                    </div>
                  </div>

                  {/* Facility Selector for mobile */}
                  <div className="lg:hidden px-1.5 py-2 border-t border-[#E3E3DF] dark:border-[#303030] space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-[#858585]">
                      Hospital Facility
                    </label>
                    <select
                      value={selectedHospital}
                      onChange={(e) => setSelectedHospital(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-[6px] bg-[#FCFCFB] dark:bg-[#181818] border border-[#E3E3DF] dark:border-[#303030] text-[#171717] dark:text-[#F0F0F0] text-xs font-medium cursor-pointer outline-none"
                    >
                      <option value="general" className="dark:bg-[#1E1E1E]">All Facilities</option>
                      <option value="city_general" className="dark:bg-[#1E1E1E]">City General Hospital</option>
                      <option value="memorial_clinic" className="dark:bg-[#1E1E1E]">Memorial Diagnostic</option>
                      <option value="apex_labs" className="dark:bg-[#1E1E1E]">Apex Clinical Labs</option>
                    </select>
                  </div>

                  <div className="border-t border-[#E3E3DF] dark:border-[#303030] my-1.5" />

                  {/* Action Links */}
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setProfileModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-[6px] hover:bg-[#F4F4F2] dark:hover:bg-[#252525] text-[#171717] dark:text-[#F0F0F0] font-medium flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <DoodleIcon name="user" className="w-3.5 h-3.5 text-[#858585]" />
                    <span>View Medical Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    id="logout-btn"
                    className="w-full text-left px-3 py-2 rounded-[6px] hover:bg-[#FCEBED] dark:hover:bg-[#2D1416] text-[#B4232F] dark:text-[#E04855] font-medium flex items-center space-x-2 transition-colors cursor-pointer"
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
        <div className="md:hidden border-t border-[#262626] px-3 py-1 flex items-center justify-between gap-1 overflow-x-auto bg-[#181818]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#B4232F] text-white'
                    : 'text-[#9E9E9E] hover:text-white'
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
        icon={<DoodleIcon name="user" className="w-4 h-4 text-[#171717] dark:text-[#F0F0F0]" />}
        footer={
          <Button variant="secondary" size="sm" onClick={() => setProfileModalOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-semibold text-[#858585] uppercase tracking-wider text-[10px]">
                Full Name
              </span>
              <p className="text-sm font-semibold text-[#171717] dark:text-[#F0F0F0] mt-0.5">
                {user?.full_name || 'N/A'}
              </p>
            </div>
            <div>
              <span className="font-semibold text-[#858585] uppercase tracking-wider text-[10px]">
                Role
              </span>
              <div className="mt-0.5">
                <Badge status={user?.role === 'doctor' ? 'brand' : 'normal'}>
                  {user?.role || 'Patient'}
                </Badge>
              </div>
            </div>
          </div>

          <div>
            <span className="font-semibold text-[#858585] uppercase tracking-wider text-[10px]">
              Email Address
            </span>
            <p className="text-sm font-semibold text-[#171717] dark:text-[#F0F0F0] mt-0.5">
              {user?.email || 'N/A'}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-[#858585] uppercase tracking-wider text-[10px]">
                Unique User ID (UUID)
              </span>
              {copiedId && (
                <span className="text-[#247A59] dark:text-[#48BB78] font-semibold text-[10px]">
                  ✓ Copied to clipboard
                </span>
              )}
            </div>
            <div
              onClick={handleCopyId}
              title="Click to copy User ID"
              className="p-2.5 rounded-[8px] bg-[#FCFCFB] dark:bg-[#181818] border border-[#E3E3DF] dark:border-[#303030] font-mono text-xs text-[#171717] dark:text-[#F0F0F0] flex items-center justify-between cursor-pointer hover:border-[#B4232F] dark:hover:border-[#E04855] transition-colors"
            >
              <span className="truncate">{userId || 'N/A'}</span>
              <DoodleIcon name="copy" className="w-4 h-4 text-[#858585] ml-2 shrink-0" />
            </div>
            <p className="text-[11px] text-[#858585] mt-1 leading-tight">
              Share this ID with family members or clinical providers to link records securely.
            </p>
          </div>

          <div>
            <span className="font-semibold text-[#858585] uppercase tracking-wider text-[10px]">
              Account Created
            </span>
            <p className="text-xs text-[#5F6368] dark:text-[#A0A0A0] mt-0.5">
              {user?.created_at ? new Date(user.created_at).toLocaleString() : 'Active session'}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default AppShell;
