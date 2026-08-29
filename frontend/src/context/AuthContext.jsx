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

  const signup = async (payload) => {
    // Accepts object with { email, password, full_name, gender, claim_uuid }
    // Or legacy positional arguments (email, password, fullName)
    let body;
    if (typeof payload === 'object' && payload !== null) {
      body = payload;
    } else {
      const [email, password, fullName] = arguments;
      body = { email, password, full_name: fullName };
    }
    const userData = await signupUser(body);
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
        setUser,
        userId: user?.id || null,
        isAuthenticated: !!user,
        isPendingClaim: Boolean(user?.is_pending_claim),
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

export default AuthContext;
