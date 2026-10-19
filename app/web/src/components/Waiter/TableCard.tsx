'use client';

import { useRouter } from 'next/navigation';
import type { Table } from '@/types';
import { AppIcon } from '@/components/icons';

type Props = {
  table: Table;
  onOpen?: () => void;
};

const TableCard = ({ table, onOpen }: Props) => {
  const router = useRouter();
  const isOccupied = table.status === 'ocupada';

  const handleClick = () => {
    if (onOpen) return onOpen();
    router.push(`/waiter/table/${table.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="p-6 rounded-xl cursor-pointer transition hover:scale-[1.02] hover:shadow-lg border border-slate-200 shadow-sm bg-white"
    >
      <h2 className="text-xl font-bold text-center text-slate-800">
        MESA {table.number}
      </h2>

      <div
        className={`font-bold text-center mt-2 ${
          isOccupied
            ? 'bg-amber-100 text-amber-800 border border-amber-300'
            : 'border border-emerald-300 bg-emerald-50 text-emerald-800'
        } rounded-lg p-1.5`}
      >
        <p className="text-xs text-center font-bold">
          {table.status.toUpperCase()}
        </p>
      </div>

      <p className="text-center font-medium text-slate-600 text-xs mt-3">
        Capacidad: {table.capacity} personas
      </p>

      <div className="mt-2 flex flex-wrap gap-1 justify-center">
        {Array.from({ length: table.capacity }).map((_, index) => (
          <span key={index} className="text-center p-0.5 rounded bg-slate-50 text-slate-400" title="Lugar">
            <AppIcon name="users" size={13} />
          </span>
        ))}
      </div>
    </div>
  );
};

export default TableCard;
