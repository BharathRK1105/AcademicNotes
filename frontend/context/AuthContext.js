import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { setUnauthorizedHandler } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);

  const clearSession = useCallback(async () => {
    await authService.logoutUser();
    setUser(null);
    setToken(null);
    setRole(null);
  }, []);

  const bootstrap = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedToken = await authService.getStoredToken();
      if (!storedToken) {
        await clearSession();
        return;
      }

      const meData = await authService.getCurrentUser();
      setToken(storedToken);
      setUser(meData.user);
      setRole(meData.role);
    } catch (error) {
      await clearSession();
    } finally {
      setIsLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await clearSession();
    });
    bootstrap();
  }, [bootstrap, clearSession]);

  const registerStudent = useCallback(async (payload) => {
    const authData = await authService.registerStudent(payload);
    setToken(authData.token);
    setUser(authData.user);
    setRole(authData.role);
    return authData.user;
  }, []);

  const loginAsStudent = useCallback(async (credentials) => {
    const authData = await authService.loginStudent(credentials);
    setToken(authData.token);
    setUser(authData.user);
    setRole(authData.role);
    return authData.user;
  }, []);

  const loginAsAdmin = useCallback(async (credentials) => {
    const authData = await authService.loginAdmin(credentials);
    setToken(authData.token);
    setUser(authData.user);
    setRole(authData.role);
    return authData.user;
  }, []);

  const loginWithGoogle = useCallback(async (tokens) => {
    const authData = await authService.loginWithGoogle(tokens);
    setToken(authData.token);
    setUser(authData.user);
    setRole(authData.role);
    return authData.user;
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const updateProfile = useCallback(async (payload) => {
    const authData = await authService.updateProfile(payload);
    setUser(authData.user);
    setRole(authData.role);
    return authData.user;
  }, []);

  const changePassword = useCallback(async (payload) => {
    return authService.changePassword(payload);
  }, []);

  const value = useMemo(
    () => ({
      isLoading,
      user,
      token,
      role,
      currentUser: user,
      isAuthenticated: Boolean(token && user),
      registerStudent,
      loginAsStudent,
      loginAsAdmin,
      loginWithGoogle,
      logout,
      updateProfile,
      changePassword,
    }),
    [changePassword, isLoading, loginAsAdmin, loginAsStudent, loginWithGoogle, logout, registerStudent, role, token, updateProfile, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
