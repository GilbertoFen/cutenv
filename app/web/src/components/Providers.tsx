'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/context/AuthContext';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { adminUser, workerUser, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Rutas públicas o que renderizan su propio formulario de autenticación:
    const isPublicOrSelfAuth =
      pathname === '/' ||
      pathname === '/login' ||
      pathname === '/worker' ||
      pathname === '/worker/login' ||
      pathname === '/root-admin';

    if (isPublicOrSelfAuth) {
      return;
    }

    // Rutas operativas de trabajador (/waiter, /cook, /cashier, /receptionist):
    const isWorkerRoute =
      pathname.startsWith('/waiter') ||
      pathname.startsWith('/cook') ||
      pathname.startsWith('/cashier') ||
      pathname.startsWith('/receptionist');

    if (isWorkerRoute && (!workerUser || workerUser.role !== 'worker')) {
      router.replace('/worker');
      return;
    }

    // Rutas administrativas (/manager):
    const isAdminRoute = pathname.startsWith('/manager');
    if (isAdminRoute && !adminUser) {
      router.replace('/login');
      return;
    }
  }, [adminUser, workerUser, loading, pathname, router]);

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

  // Prevenir parpadeo en rutas operativas sin sesión mientras se ejecuta la redirección
  const isWorkerRoute =
    pathname.startsWith('/waiter') ||
    pathname.startsWith('/cook') ||
    pathname.startsWith('/cashier') ||
    pathname.startsWith('/receptionist');

  if (isWorkerRoute && (!workerUser || workerUser.role !== 'worker')) {
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
