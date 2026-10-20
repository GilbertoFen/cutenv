'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/context/AuthContext';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { adminUser, workerUser, hasWorkerAccess, hasAdminAccess, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // 1. Rutas públicas de autenticación o acceso explícito:
    const isPublic =
      pathname === '/' ||
      pathname === '/login' ||
      pathname === '/worker' ||
      pathname === '/worker/login' ||
      pathname === '/root-admin';

    if (isPublic) {
      return;
    }

    // 2. Rutas operativas de la estación tablet (/waiter, /cook, /cashier, /receptionist):
    const isOperationalRoute =
      pathname.startsWith('/waiter') ||
      pathname.startsWith('/cook') ||
      pathname.startsWith('/cashier') ||
      pathname.startsWith('/receptionist');

    if (isOperationalRoute && !hasWorkerAccess) {
      router.replace('/worker');
      return;
    }

    // 3. Rutas administrativas (/manager, /admin):
    const isAdminRoute = pathname.startsWith('/manager') || pathname.startsWith('/admin');
    if (isAdminRoute) {
      if (!hasAdminAccess) {
        if (workerUser) {
          // Si es un trabajador intentando entrar al administrador: rechazar y devolver a la tablet
          router.replace('/worker');
          return;
        }
        router.replace('/login');
        return;
      }
    }
  }, [adminUser, workerUser, hasWorkerAccess, hasAdminAccess, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center text-slate-400 text-sm">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Cargando entorno…
        </div>
      </div>
    );
  }

  // Prevenir parpadeo en rutas protegidas mientras se resuelve la redirección
  const isOperationalRoute =
    pathname.startsWith('/waiter') ||
    pathname.startsWith('/cook') ||
    pathname.startsWith('/cashier') ||
    pathname.startsWith('/receptionist');

  if (isOperationalRoute && !hasWorkerAccess) {
    return null;
  }

  const isAdminRoute = pathname.startsWith('/manager') || pathname.startsWith('/admin');
  if (isAdminRoute && !hasAdminAccess) {
    return null;
  }

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>{children}</AuthGuard>
    </AuthProvider>
  );
}
