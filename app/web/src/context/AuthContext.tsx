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
} from '@/services/AuthService';

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
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [workerUser, setWorkerUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isManagerUnlocked, setIsManagerUnlockedState] = useState(false);

  useEffect(() => {
    const storedAdmin = getStoredAdminUser();
    if (storedAdmin) {
      setAdminUser(storedAdmin);
      if (storedAdmin.role === 'manager') {
        setIsManagerUnlockedState(true);
        setManagerUnlocked(true);
      } else {
        setIsManagerUnlockedState(getManagerUnlocked());
      }
    }

    const storedWorker = getStoredWorkerUser();
    if (storedWorker) {
      setWorkerUser(storedWorker);
    }

    setLoading(false);
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
    setAdminUser(null);
    setIsManagerUnlockedState(false);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const loginWorker = async (username: string, password: string): Promise<User> => {
    const logged = await apiLoginWorker(username, password);
    setWorkerUser(logged);
    return logged;
  };

  const logoutWorker = () => {
    clearStoredWorkerUser();
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

  // Determinar contexto según la ruta
  const isWorkerRoute = pathname
    ? pathname.startsWith('/worker') ||
      pathname.startsWith('/waiter') ||
      pathname.startsWith('/cook') ||
      pathname.startsWith('/cashier') ||
      pathname.startsWith('/receptionist')
    : false;

  const user = isWorkerRoute ? workerUser : adminUser;

  const isOwner = user?.role === 'owner';
  const isManager = user?.role === 'manager';
  const isWorker = user?.role === 'worker';
  const isWorkerAuthenticated = workerUser !== null && workerUser.role === 'worker';
  const isAdminAuthenticated =
    adminUser !== null && (adminUser.role === 'owner' || adminUser.role === 'manager');

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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
