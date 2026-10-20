'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { User } from '@/types';
import {
  getStoredAdminUser,
  setStoredAdminUser,
  clearStoredAdminUser,
  getStoredWorkerUser,
  setStoredWorkerUser,
  clearStoredWorkerUser,
  getManagerUnlocked,
  setManagerUnlocked,
  loginUser,
  loginWorker as apiLoginWorker,
  verifyManagerCredentials,
  verifySession,
} from '@/services/AuthService';
import { getAuthToken, clearAuthToken } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  adminUser: User | null;
  workerUser: User | null;
  loading: boolean;
  isManagerUnlocked: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
  loginAdmin: (username: string, password: string) => Promise<User>;
  logoutAdmin: () => void;
  loginWorker: (username: string, password: string) => Promise<User>;
  logoutWorker: () => void;
  unlockManager: (username: string, password: string) => Promise<User>;
  lockManager: () => void;
  isOwner: boolean;
  isManager: boolean;
  isWorker: boolean;
  isWorkerAuthenticated: boolean;
  isAdminAuthenticated: boolean;
  hasWorkerAccess: boolean;
  hasAdminAccess: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  adminUser: null,
  workerUser: null,
  loading: true,
  isManagerUnlocked: false,
  login: async () => ({ id: '', username: '', name: '', role: 'manager' }),
  logout: () => {},
  loginAdmin: async () => ({ id: '', username: '', name: '', role: 'manager' }),
  logoutAdmin: () => {},
  loginWorker: async () => ({ id: '', username: '', name: '', role: 'worker' }),
  logoutWorker: () => {},
  unlockManager: async () => ({ id: '', username: '', name: '', role: 'manager' }),
  lockManager: () => {},
  isOwner: false,
  isManager: false,
  isWorker: false,
  isWorkerAuthenticated: false,
  isAdminAuthenticated: false,
  hasWorkerAccess: false,
  hasAdminAccess: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [workerUser, setWorkerUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isManagerUnlocked, setIsManagerUnlockedState] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      // 1. Carga rápida desde almacenamiento local
      const storedAdmin = getStoredAdminUser();
      const storedWorker = getStoredWorkerUser();
      const token = getAuthToken();

      // Si no existe un token de autenticación, las credenciales locales no son válidas para el backend
      if (!token) {
        clearStoredAdminUser();
        clearStoredWorkerUser();
        if (isMounted) {
          setAdminUser(null);
          setWorkerUser(null);
          setLoading(false);
        }
        return;
      }

      if (storedAdmin && isMounted) {
        setAdminUser(storedAdmin);
        if (storedAdmin.role === 'manager') {
          setIsManagerUnlockedState(true);
          setManagerUnlocked(true);
        } else {
          setIsManagerUnlockedState(getManagerUnlocked());
        }
      }

      if (storedWorker && isMounted) {
        setWorkerUser(storedWorker);
      }

      // 2. Validación autoritativa con el backend (/auth/me)
      try {
        const verified = await verifySession();
        if (isMounted) {
          if (verified) {
            if (verified.role === 'owner' || verified.role === 'manager') {
              setAdminUser(verified);
            } else if (verified.role === 'worker') {
              setWorkerUser(verified);
            }
          } else {
            // Si el token expiró o fue rechazado por el backend
            setAdminUser(null);
            setWorkerUser(null);
          }
        }
      } catch (e) {
        console.warn('[AuthProvider] Error verifying session on startup:', e);
      }

      if (isMounted) {
        setLoading(false);
      }
    }

    initializeAuth();

    // 3. Listener global para expiración de sesión (401)
    const handleUnauthorized = () => {
      clearStoredAdminUser();
      clearStoredWorkerUser();
      clearAuthToken();
      setAdminUser(null);
      setWorkerUser(null);
      setIsManagerUnlockedState(false);
    };

    window.addEventListener('pos:auth-unauthorized', handleUnauthorized);
    return () => {
      isMounted = false;
      window.removeEventListener('pos:auth-unauthorized', handleUnauthorized);
    };
  }, []);

  const loginAdmin = async (username: string, password: string): Promise<User> => {
    const logged = await loginUser(username, password);
    setAdminUser(logged);
    if (logged.role === 'manager') {
      setIsManagerUnlockedState(true);
      setManagerUnlocked(true);
    }
    return logged;
  };

  const logoutAdmin = () => {
    clearStoredAdminUser();
    clearAuthToken();
    setAdminUser(null);
    setIsManagerUnlockedState(false);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const loginWorker = async (username: string, password: string): Promise<User> => {
    const logged = await apiLoginWorker(username, password);
    if (logged.role === 'worker') {
      setWorkerUser(logged);
    } else if (logged.role === 'owner' || logged.role === 'manager') {
      // El administrador o gerente logueado en la estación conserva su autoridad completa
      setAdminUser(logged);
      setWorkerUser(logged);
    }
    return logged;
  };

  const logoutWorker = () => {
    clearStoredWorkerUser();
    clearAuthToken();
    setWorkerUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/worker';
    }
  };

  const unlockManager = async (username: string, password: string): Promise<User> => {
    const res = await verifyManagerCredentials(username, password);
    setIsManagerUnlockedState(true);
    setManagerUnlocked(true);
    return res.manager;
  };

  const lockManager = () => {
    setManagerUnlocked(false);
    setIsManagerUnlockedState(false);
  };

  // Determinar si la ruta actual es operativa
  const isWorkerRoute = pathname
    ? pathname.startsWith('/worker') ||
      pathname.startsWith('/waiter') ||
      pathname.startsWith('/cook') ||
      pathname.startsWith('/cashier') ||
      pathname.startsWith('/receptionist')
    : false;

  // Un administrador o gerente puede operar la estación de trabajo
  const user = isWorkerRoute ? (workerUser || adminUser) : adminUser;

  const isOwner = adminUser?.role === 'owner' || user?.role === 'owner';
  const isManager = adminUser?.role === 'manager' || user?.role === 'manager';
  const isWorker = workerUser?.role === 'worker' || user?.role === 'worker';

  const isWorkerAuthenticated = workerUser !== null && workerUser.role === 'worker';
  const isAdminAuthenticated =
    adminUser !== null && (adminUser.role === 'owner' || adminUser.role === 'manager');

  const hasWorkerAccess =
    isWorkerAuthenticated || (adminUser !== null && (adminUser.role === 'owner' || adminUser.role === 'manager'));
  const hasAdminAccess = isAdminAuthenticated;

  return (
    <AuthContext.Provider
      value={{
        user,
        adminUser,
        workerUser,
        loading,
        isManagerUnlocked,
        login: loginAdmin,
        logout: isWorkerRoute ? logoutWorker : logoutAdmin,
        loginAdmin,
        logoutAdmin,
        loginWorker,
        logoutWorker,
        unlockManager,
        lockManager,
        isOwner,
        isManager,
        isWorker,
        isWorkerAuthenticated,
        isAdminAuthenticated,
        hasWorkerAccess,
        hasAdminAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
