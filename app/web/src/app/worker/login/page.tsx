'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import WorkerLoginForm from '@/components/Worker/WorkerLoginForm';

export default function WorkerLoginPage() {
  const router = useRouter();
  const { workerUser, loading } = useAuth();

  useEffect(() => {
    if (!loading && workerUser && workerUser.role === 'worker') {
      router.replace('/worker');
    }
  }, [workerUser, loading, router]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center text-slate-400 text-sm">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Cargando estación de trabajo…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <WorkerLoginForm onSuccess={() => router.push('/worker')} />
    </div>
  );
}
