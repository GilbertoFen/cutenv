'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReservationsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/receptionist');
  }, [router]);

  return (
    <div className="text-center py-20 text-slate-400 text-xs">
      Redirigiendo al Módulo de Recepción y Agenda...
    </div>
  );
}
