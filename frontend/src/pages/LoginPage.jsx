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
      className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 relative transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
    >
      {/* Floating Theme Toggle */}
      <button
        onClick={toggleTheme}
        id="login-theme-toggle"
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center space-x-2 px-3 py-1.5 rounded-[6px] border border-[#E3E3DF] dark:border-[#303030] bg-white/95 dark:bg-[#1E1E1E]/95 shadow-xs text-xs font-semibold text-[#171717] dark:text-[#F0F0F0] hover:bg-[#F4F4F2] dark:hover:bg-[#252525] transition-colors cursor-pointer"
      >
        <DoodleIcon name={theme === 'dark' ? 'sun' : 'moon'} className="w-3.5 h-3.5 text-[#5F6368] dark:text-[#A0A0A0]" />
        <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
      </button>

      {/* Main Authentication Container */}
      <div className="w-full max-w-md space-y-6 my-auto z-10">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-10 h-10 rounded-[8px] items-center justify-center bg-[#141414] text-white shadow-xs mb-1">
            <DoodleIcon name="logo-pulse" className="w-5 h-5 text-white" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#171717] dark:text-[#F0F0F0]">
              GenHealth <span className="text-[#B4232F] dark:text-[#E04855]">AI</span>
            </h1>
            <p className="text-xs sm:text-sm font-medium text-[#5F6368] dark:text-[#A0A0A0] mt-0.5">
              Clinical Intelligence &amp; Diagnostic Platform
            </p>
          </div>
        </div>

        {/* Portal Mode Segmented Control */}
        <div className="p-1 rounded-[8px] bg-[#F4F4F2] dark:bg-[#202020] border border-[#E3E3DF] dark:border-[#303030] flex items-center gap-1">
          <button
            type="button"
            onClick={() => { setPortalMode('patient'); setErrorMessage(''); }}
            className={`flex-1 py-2 rounded-[6px] text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              portalMode === 'patient'
                ? 'bg-white dark:bg-[#1E1E1E] text-[#171717] dark:text-[#F0F0F0] shadow-xs border border-[#E3E3DF] dark:border-[#303030]'
                : 'text-[#5F6368] dark:text-[#A0A0A0] hover:text-[#171717]'
            }`}
          >
            <DoodleIcon name="user" className="w-3.5 h-3.5" />
            <span>Patient Portal</span>
          </button>

          <button
            type="button"
            onClick={() => { setPortalMode('doctor'); setAuthMode('login'); setErrorMessage(''); }}
            className={`flex-1 py-2 rounded-[6px] text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              portalMode === 'doctor'
                ? 'bg-[#B4232F] text-white shadow-xs'
                : 'text-[#5F6368] dark:text-[#A0A0A0] hover:text-[#171717]'
            }`}
          >
            <DoodleIcon name="doctor" className="w-3.5 h-3.5" />
            <span>Doctor / Hospital</span>
          </button>
        </div>

        {/* Authentication Card Form */}
        <Card radius="lg" className="p-6 sm:p-8 space-y-6 bg-white border border-[#E3E3DF] dark:border-[#303030]">
          {/* Header text based on mode */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#171717] dark:text-[#F0F0F0]">
                {portalMode === 'doctor' 
                  ? 'Clinical Provider Access' 
                  : authMode === 'login' 
                    ? 'Patient Sign In' 
                    : 'Create Patient Account'}
              </h2>
              <p className="text-xs text-[#5F6368] dark:text-[#A0A0A0] mt-0.5">
                {portalMode === 'doctor'
                  ? 'Access multi-patient lab analytics and clinical trends'
                  : authMode === 'login'
                    ? 'Enter your credentials to access your health records'
                    : 'Get your unique medical User ID today'}
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-[6px] text-xs font-semibold text-[#B4232F] bg-[#FCEBED] border border-[#E8B4B9] dark:bg-[#2D1416] dark:border-[#522226] dark:text-[#E04855] flex items-center space-x-2">
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
              leftIcon={<DoodleIcon name="check" className="w-4 h-4 text-white" />}
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
            <div className="pt-2 text-center text-xs text-[#5F6368] dark:text-[#A0A0A0] border-t border-[#E3E3DF] dark:border-[#303030]">
              {authMode === 'login' ? (
                <p>
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); setErrorMessage(''); }}
                    className="font-semibold text-[#B4232F] dark:text-[#E04855] hover:underline ml-1 cursor-pointer"
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
                    className="font-semibold text-[#B4232F] dark:text-[#E04855] hover:underline ml-1 cursor-pointer"
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
