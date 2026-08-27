import React, { createContext, useContext, useState, useEffect } from 'react';
import { signupUser, loginUser } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('genhealth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [selectedHospital, setSelectedHospital] = useState('general');

  useEffect(() => {
    if (user) {
      localStorage.setItem('genhealth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('genhealth_user');
    }
  }, [user]);

  const login = async (email, password) => {
    const userData = await loginUser({ email, password });
    setUser(userData);
    return userData;
  };

  const signup = async (email, password, fullName) => {
    const userData = await signupUser({ email, password, full_name: fullName });
    setUser(userData);
    return userData;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userId: user?.id || null,
        isAuthenticated: !!user,
        selectedHospital,
        setSelectedHospital,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
