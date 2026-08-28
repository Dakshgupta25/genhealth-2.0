import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import DoodleIcon from '../components/common/DoodleIcon';
import { Button, Card, FormField, Input } from '../components/ui';

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
    <div
      className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 relative selection:bg-slate-800 selection:text-white transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
    >
      {/* Floating Theme Toggle (Top Left/Right) */}
      <button
        onClick={toggleTheme}
        id="login-theme-toggle"
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-xs text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        <DoodleIcon name={theme === 'dark' ? 'sun' : 'moon'} className="w-3.5 h-3.5" />
        <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
      </button>

      {/* Main Authentication Container */}
      <div className="w-full max-w-md space-y-6 my-auto z-10">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl items-center justify-center bg-slate-900 text-white dark:bg-slate-800 dark:border dark:border-slate-700 shadow-md mb-1">
            <DoodleIcon name="logo-pulse" className="w-7 h-7 text-cyan-400" strokeWidth={1.6} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              GenHealth <span className="text-cyan-600 dark:text-cyan-400">AI</span>
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Clinical AI &amp; Diagnostic Intelligence Platform
            </p>
          </div>
        </div>

        {/* Portal Mode Segmented Control */}
        <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
          <button
            type="button"
            onClick={() => { setPortalMode('patient'); setErrorMessage(''); }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 min-h-[40px] ${
              portalMode === 'patient'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 shadow-xs border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <DoodleIcon name="user" className="w-3.5 h-3.5" />
            <span>Patient Portal</span>
          </button>

          <button
            type="button"
            onClick={() => { setPortalMode('doctor'); setAuthMode('login'); setErrorMessage(''); }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 min-h-[40px] ${
              portalMode === 'doctor'
                ? 'bg-slate-900 dark:bg-slate-800 text-white dark:text-cyan-300 shadow-xs border border-slate-800 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <DoodleIcon name="doctor" className="w-3.5 h-3.5" />
            <span>Doctor / Hospital</span>
          </button>
        </div>

        {/* Authentication Card Form */}
        <Card radius="xl" className="shadow-lg p-6 sm:p-8 space-y-6">
          {/* Header text based on mode */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50">
                {portalMode === 'doctor' 
                  ? 'Clinical Provider Access' 
                  : authMode === 'login' 
                    ? 'Patient Sign In' 
                    : 'Create Patient Account'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {portalMode === 'doctor'
                  ? 'Access multi-patient lab analytics and clinical trends'
                  : authMode === 'login'
                    ? 'Enter your credentials to access your health records'
                    : 'Get your unique medical User ID today'}
              </p>
            </div>
            {portalMode === 'doctor' && (
              <span className="p-2 rounded-lg text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 dark:text-cyan-400 shrink-0">
                <DoodleIcon name="stethoscope" className="w-5 h-5" />
              </span>
            )}
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300 flex items-center space-x-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {portalMode === 'patient' && authMode === 'signup' && (
              <FormField label="Full Name" required>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Eleanor Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </FormField>
            )}

            <FormField label="Email Address" required>
              <Input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>

            <FormField label="Password" required>
              <Input
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormField>

            {portalMode === 'doctor' && (
              <FormField label="Hospital / Clinical ID Code (Optional)">
                <Input
                  type="text"
                  mono
                  placeholder="HOSP-CLINIC-CODE"
                  value={doctorCode}
                  onChange={(e) => setDoctorCode(e.target.value)}
                />
              </FormField>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
              leftIcon={<DoodleIcon name="check" className="w-4 h-4 text-cyan-400" />}
            >
              {loading
                ? 'Authenticating...'
                : portalMode === 'doctor'
                ? 'Access Doctor Portal'
                : authMode === 'login'
                ? 'Sign In to Dashboard'
                : 'Complete Sign Up'}
            </Button>
          </form>

          {/* Toggle Login vs Signup (For Patient Portal) */}
          {portalMode === 'patient' && (
            <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
              {authMode === 'login' ? (
                <p>
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); setErrorMessage(''); }}
                    className="font-bold text-cyan-600 dark:text-cyan-400 hover:underline ml-1"
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
                    className="font-bold text-cyan-600 dark:text-cyan-400 hover:underline ml-1"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default LoginPage;
