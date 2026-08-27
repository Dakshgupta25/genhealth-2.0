import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import DoodleIcon from '../components/common/DoodleIcon';

export function LoginPage() {
  const [portalMode, setPortalMode] = useState('patient'); // 'patient' | 'doctor'
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [doctorCode, setDoctorCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const { login, signup } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      if (authMode === 'signup') {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name.');
        }
        await signup(email, password, fullName);
      } else {
        await login(email, password);
      }
      // Navigate to default landing view: Dashboard
      navigate('/');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setErrorMessage(
        typeof detail === 'string'
          ? detail
          : err.message || 'Authentication failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 relative overflow-hidden selection:bg-slate-800 selection:text-white"
         style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Visual Accent: Top-Right Dark Corner Shape */}
      <div 
        className="absolute top-0 right-0 w-80 h-32 md:w-96 md:h-48 pointer-events-none z-0 rounded-bl-[100px] transition-all duration-300 opacity-95"
        style={{ backgroundColor: 'var(--bg-accent-corner)' }}
      >
        <div className="absolute top-6 right-8 flex items-center space-x-2 text-xs font-mono text-slate-300">
          <DoodleIcon name="heartbeat" className="w-4 h-4 text-sky-400" />
          <span>GenHealth Portal</span>
        </div>
      </div>

      {/* Floating Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 left-6 z-20 flex items-center space-x-2 px-3 py-1.5 rounded-full border shadow-sm text-xs font-medium transition-all"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
      >
        <DoodleIcon name={theme === 'dark' ? 'sun' : 'moon'} className="w-3.5 h-3.5" />
        <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
      </button>

      {/* Main Login / Portal Card */}
      <div className="w-full max-w-md relative z-10 space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl items-center justify-center shadow-md mb-2"
               style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--text-on-accent)' }}>
            <DoodleIcon name="logo-pulse" className="w-7 h-7" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            GenHealth <span style={{ color: 'var(--text-accent)' }}>AI</span>
          </h1>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Clinical AI &amp; Health Intelligence Platform
          </p>
        </div>

        {/* Portal Selector: Patient vs Doctor / Hospital Portal */}
        <div className="p-1 rounded-2xl border flex items-center shadow-sm"
             style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
          <button
            type="button"
            onClick={() => { setPortalMode('patient'); setErrorMessage(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
              portalMode === 'patient'
                ? 'shadow-sm'
                : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: portalMode === 'patient' ? 'var(--bg-card)' : 'transparent',
              color: portalMode === 'patient' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <DoodleIcon name="user" className="w-3.5 h-3.5" />
            <span>Patient Portal</span>
          </button>

          <button
            type="button"
            onClick={() => { setPortalMode('doctor'); setAuthMode('login'); setErrorMessage(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
              portalMode === 'doctor'
                ? 'shadow-sm'
                : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: portalMode === 'doctor' ? 'var(--brand-primary)' : 'transparent',
              color: portalMode === 'doctor' ? 'var(--text-on-accent)' : 'var(--text-muted)',
            }}
          >
            <DoodleIcon name="doctor" className="w-3.5 h-3.5" />
            <span>Doctor / Hospital</span>
          </button>
        </div>

        {/* Form Container */}
        <div className={`p-8 rounded-3xl border shadow-xl transition-all space-y-6 ${
          portalMode === 'doctor' ? 'ring-2 ring-indigo-500/30' : ''
        }`}
             style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
          
          {/* Header text based on mode */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                {portalMode === 'doctor' 
                  ? 'Clinical Provider Access' 
                  : authMode === 'login' 
                    ? 'Patient Sign In' 
                    : 'Create Patient Account'}
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {portalMode === 'doctor'
                  ? 'Access multi-patient lab analytics and clinical trends'
                  : authMode === 'login'
                    ? 'Enter your credentials to access your health records'
                    : 'Get your unique medical User ID today'}
              </p>
            </div>
            {portalMode === 'doctor' && (
              <span className="p-2 rounded-xl text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40">
                <DoodleIcon name="stethoscope" className="w-5 h-5" />
              </span>
            )}
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl text-xs font-medium border text-red-700 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {portalMode === 'patient' && authMode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eleanor Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all focus:ring-2"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all focus:ring-2"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {portalMode === 'doctor' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Hospital / Clinical ID Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="HOSP-CLINIC-CODE"
                  value={doctorCode}
                  onChange={(e) => setDoctorCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all focus:ring-2 font-mono"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-[0.99] disabled:opacity-50 text-white flex items-center justify-center space-x-2"
              style={{
                backgroundColor: 'var(--brand-primary)',
              }}
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>
                    {portalMode === 'doctor'
                      ? 'Access Doctor Portal'
                      : authMode === 'login'
                        ? 'Sign In to Dashboard'
                        : 'Complete Sign Up'}
                  </span>
                  <DoodleIcon name="check" className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Login vs Signup (For Patient Portal) */}
          {portalMode === 'patient' && (
            <div className="pt-2 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              {authMode === 'login' ? (
                <p>
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); setErrorMessage(''); }}
                    className="font-bold underline ml-1"
                    style={{ color: 'var(--text-accent)' }}
                  >
                    Sign Up
                  </button>
                </p>
              ) : (
                <p>
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setErrorMessage(''); }}
                    className="font-bold underline ml-1"
                    style={{ color: 'var(--text-accent)' }}
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
