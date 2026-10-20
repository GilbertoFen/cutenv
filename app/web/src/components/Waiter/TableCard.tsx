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
  const isReserved = table.status === 'reservada';

  const handleClick = () => {
    if (onOpen) return onOpen();
    router.push(`/waiter/table/${table.id}`);
  };

  const statusConfig = isOccupied
    ? {
        label: 'Ocupada',
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
      }
    : isReserved
    ? {
        label: 'Reservada',
        bg: 'bg-purple-50',
        text: 'text-purple-800',
        border: 'border-purple-200',
        dot: 'bg-purple-500',
      }
    : {
        label: 'Disponible',
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
      };

  return (
    <div
      onClick={handleClick}
      className="p-5 sm:p-6 rounded-3xl cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft-md border border-slate-200/90 shadow-soft-xs bg-white flex flex-col justify-between active:scale-[0.98] group"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
            Mesa
          </span>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}></span>
            <span>{statusConfig.label}</span>
          </span>
        </div>

        <div className="text-center my-3">
          <span className="text-3xl sm:text-4xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
            {table.number}
          </span>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5 font-medium">
          <AppIcon name="users" size={13} className="text-slate-400" />
          <span>{table.capacity} personas</span>
        </span>

        <span className="text-[11px] font-bold text-indigo-600 group-hover:underline">
          Abrir detalle →
        </span>
      </div>
    </div>
  );
};

export default TableCard;
