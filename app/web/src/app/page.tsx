'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import LoginPage from './login/page';

export default function RootPage() {
  const router = useRouter();
  const { adminUser, workerUser, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (adminUser) {
      // El gerente o dueño ingresa directamente a Monitoreo y Operativa (/manager)
      router.replace('/manager');
    } else if (workerUser) {
      // El trabajador operativo ingresa directamente a su estación (/worker)
      router.replace('/worker');
    }
  }, [adminUser, workerUser, loading, router]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center text-slate-400 text-sm">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Comprobando sesión del restaurante…
        </div>
      </div>
    );
  }

  // Si no hay ninguna sesión activa, mostrar la pantalla de inicio de sesión
  if (!adminUser && !workerUser) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-center text-slate-400 text-sm">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        Redirigiendo a tu espacio de trabajo…
      </div>
    </div>
  );
}
