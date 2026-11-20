'use client';

import { useRouter } from 'next/navigation';
import type { Table } from '@/types';
import { AppIcon } from '@/components/icons';

export interface TableAlert {
  orderId: string;
  itemId: string;
  reason: 'ready' | 'unavailable' | 'issue' | 'other';
  message?: string;
  itemName: string;
  requestedAt?: Date | string;
}

type Props = {
  table: Table;
  onOpen?: () => void;
  alerts?: TableAlert[];
};

const TableCard = ({ table, onOpen, alerts = [] }: Props) => {
  const router = useRouter();
  const isVirtual = Boolean(table.isVirtual);
  const isOccupied = table.status === 'ocupada';
  const isReserved = table.status === 'reservada';
  const isCompleted = table.status === 'completada';
  const hasAlerts = alerts.length > 0;

  const handleClick = () => {
    if (onOpen) return onOpen();
    router.push(`/waiter/table/${table.id}`);
  };

  const virtualMap: Record<string, {
    label: string;
    icon: string;
    badgeBg: string;
    cardBg: string;
    activeText: string;
    dot: string;
  }> = {
    para_llevar: {
      label: 'Para Llevar',
      icon: '🛍️',
      badgeBg: 'bg-sky-50 text-sky-800 border-sky-200',
      cardBg: 'from-sky-50/40 via-white to-white border-sky-200 hover:border-sky-400',
      activeText: 'text-sky-700',
      dot: 'bg-sky-500',
    },
    domicilio: {
      label: 'A Domicilio',
      icon: '🛵',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      cardBg: 'from-emerald-50/40 via-white to-white border-emerald-200 hover:border-emerald-400',
      activeText: 'text-emerald-700',
      dot: 'bg-emerald-500',
    },
    telefonico: {
      label: 'Telefónico',
      icon: '📞',
      badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
      cardBg: 'from-purple-50/40 via-white to-white border-purple-200 hover:border-purple-400',
      activeText: 'text-purple-700',
      dot: 'bg-purple-500',
    },
  };

  const virtualConfig = virtualMap[table.tableType || 'para_llevar'] || virtualMap.para_llevar;

  const statusConfig = isCompleted
    ? {
      label: 'Completado',
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-200',
      dot: 'bg-slate-400',
    }
    : isOccupied
      ? {
        label: isVirtual ? 'Activo' : 'Ocupada',
        bg: isVirtual ? 'bg-indigo-50' : 'bg-amber-50',
        text: isVirtual ? 'text-indigo-800' : 'text-amber-800',
        border: isVirtual ? 'border-indigo-200' : 'border-amber-200',
        dot: isVirtual ? 'bg-indigo-500' : 'bg-amber-500',
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
      className={`relative p-5 sm:p-6 rounded-3xl cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft-md border flex flex-col justify-between active:scale-[0.98] group ${
        isVirtual
          ? `bg-gradient-to-b ${virtualConfig.cardBg} shadow-soft-xs`
          : hasAlerts
          ? 'border-orange-400 ring-2 ring-orange-400/50 shadow-soft-md bg-gradient-to-b from-orange-50/20 to-white'
          : 'border-slate-200/90 shadow-soft-xs bg-white'
      }`}
    >
      {/* Indicator badge for kitchen alerts */}
      {hasAlerts && (
        <div className="absolute -top-2.5 -right-2.5 z-10 flex items-center gap-1.5 bg-orange-500 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-soft-md">
          <AppIcon name="bell" size={12} className="text-white" />
          <span>Aviso</span>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            {isVirtual ? (
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border flex items-center gap-1 ${virtualConfig.badgeBg}`}>
                <span>{virtualConfig.icon}</span>
                <span>{virtualConfig.label}</span>
              </span>
            ) : (
              'Mesa'
            )}
          </span>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}></span>
            <span>{statusConfig.label}</span>
          </span>
        </div>

        <div className="text-center my-2">
          {isVirtual ? (
            <div>
              <span className="text-2xl sm:text-3xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight">
                {table.virtualCode || `PEDIDO #${table.number}`}
              </span>
              {table.customerName ? (
                <p className="text-xs font-bold text-slate-700 truncate mt-0.5">
                  👤 {table.customerName}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 italic mt-0.5">Sin nombre asignado</p>
              )}
              {table.deliveryAddress && (
                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                  📍 {table.deliveryAddress}
                </p>
              )}
            </div>
          ) : (
            <span className="text-3xl sm:text-4xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
              {table.number}
            </span>
          )}
        </div>

        {/* Notice of specific kitchen alert */}
        {hasAlerts && (
          <div className="my-2 p-2 rounded-xl bg-orange-100/90 border border-orange-300 text-orange-950 text-[11px] font-semibold space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold flex items-center gap-1 text-orange-900">
                <AppIcon name={alerts[0].reason === 'ready' ? 'check' : 'warning'} size={12} className="text-orange-700" />
                <span>
                  {alerts[0].reason === 'ready' && (alerts[0].itemName?.toLowerCase().includes('comanda') ? 'Comanda lista:' : 'Platillo listo:')}
                  {alerts[0].reason === 'unavailable' && 'No disponible:'}
                  {alerts[0].reason === 'issue' && 'Alerta cocina:'}
                  {alerts[0].reason === 'other' && 'Aviso cocina:'}
                </span>
              </span>
            </div>
            <p className="truncate text-orange-900 font-bold">{alerts[0].itemName}</p>
            {alerts[0].message && (
              <p className="truncate text-[10px] text-orange-800 italic">&ldquo;{alerts[0].message}&rdquo;</p>
            )}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5 font-medium">
          {isVirtual ? (
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <span>{virtualConfig.icon}</span>
              <span>Pedido Virtual</span>
            </span>
          ) : (
            <>
              <AppIcon name="users" size={13} className="text-slate-400" />
              <span>{table.capacity} personas</span>
            </>
          )}
        </span>

        <span className="text-[11px] font-bold text-indigo-600 group-hover:underline">
          {isVirtual ? 'Gestionar pedido →' : 'Abrir detalle →'}
        </span>
      </div>
    </div>
  );
};

export default TableCard;
