'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import TableDetailPanel from '@/components/Waiter/TableDetailPanel';

export default function TableDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.push('/waiter')}
        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
      >
        ← Volver a mesas
      </button>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <TableDetailPanel tableId={resolvedParams.id} onClose={() => router.push('/waiter')} />
      </div>
    </div>
  );
}
