import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UploadProvider } from './context/UploadContext';
import { ThemeProvider } from './context/ThemeContext';
import AppShell from './components/layout/AppShell';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import FamilyTreePage from './pages/FamilyTreePage';
import DoctorPortalPage from './pages/DoctorPortalPage';
import ClaimantWaitingPage from './pages/ClaimantWaitingPage';

function ProtectedLayout({ children }) {
  const { isAuthenticated, isPendingClaim } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If user has a pending claim on a placeholder, gate to waiting screen
  if (isPendingClaim) {
    return <ClaimantWaitingPage />;
  }

  return <AppShell>{children}</AppShell>;
}

export function AppRoutes() {
  const { isAuthenticated, isPendingClaim } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            isPendingClaim ? (
              <ClaimantWaitingPage />
            ) : (
              <Navigate to="/" replace />
            )
          ) : (
            <LoginPage />
          )
        }
      />

      {/* Main App Routes - Exact Navigation Order: Dashboard -> Upload -> Family Tree -> Doctor Portal */}
      <Route
        path="/"
        element={
          <ProtectedLayout>
            <DashboardPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/upload"
        element={
          <ProtectedLayout>
            <UploadPage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/family-tree"
        element={
          <ProtectedLayout>
            <FamilyTreePage />
          </ProtectedLayout>
        }
      />
      <Route
        path="/doctor-portal"
        element={
          <ProtectedLayout>
            <DoctorPortalPage />
          </ProtectedLayout>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UploadProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </UploadProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
