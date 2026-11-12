'use client';

import React, { useEffect, useState } from 'react';
import { getCashCutToday, downloadCashCutPdf, CashCutData } from '@/services/SaleService';
import { currency } from '@/utils/Manager/manager.functions';
import { AppIcon } from '@/components/icons';
import { useNotification } from '@/context/NotificationContext';

export default function CashCutPanel() {
  const { notify } = useNotification();
  const [data, setData] = useState<CashCutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCut = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getCashCutToday();
      setData(res);
    } catch (err: any) {
      console.error('[CashCutPanel] Error al cargar corte de caja:', err);
      setError(err?.message || 'Error al obtener el corte de caja del día actual');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCut();
  }, []);

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      await downloadCashCutPdf(data?.date);
      notify.success('Reporte de corte de caja descargado exitosamente en PDF');
    } catch (err: any) {
      console.error('[CashCutPanel] Error descargando PDF:', err);
      notify.error(err?.message || 'Error al generar o descargar el archivo PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center text-slate-500 text-sm">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="font-bold">Calculando corte de caja del día en tiempo real…</p>
          <p className="text-xs text-slate-400 mt-1">Auditando pagos, comandas y órdenes del día actual</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-rose-200 text-center max-w-lg mx-auto my-8 shadow-soft-xs">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-rose-200">
          <AppIcon name="error" size={26} />
        </div>
        <h3 className="text-lg font-black text-slate-800">No se pudo cargar el corte de caja</h3>
        <p className="text-xs text-slate-500 mt-1 mb-5">{error || 'Intente nuevamente'}</p>
        <button
          onClick={loadCut}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition active:scale-95 shadow-soft-xs"
        >
          Reintentar consulta
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Panel */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-soft-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Conciliación y Auditoría Diaria • {data.restaurantName}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Corte de caja
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Balance contable exclusivo de las operaciones del día de hoy ({data.dateFormatted}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loadCut}
            disabled={loading}
            className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-2 active:scale-95 shadow-soft-xs"
            title="Recargar datos de caja"
          >
            <AppIcon name="refresh" size={15} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-black transition-all shadow-soft-sm hover:shadow-soft-md flex items-center gap-2 active:scale-95 ring-2 ring-indigo-500/30"
          >
            {downloadingPdf ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Generando PDF…</span>
              </>
            ) : (
              <>
                <AppIcon name="download" size={16} />
                <span>Generar reporte de corte de caja</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Collected Revenue */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/40 rounded-3xl p-5 border border-emerald-200/90 shadow-soft-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
              Total Ingresos Cobrados
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-soft-xs">
              <AppIcon name="cash" size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight">
              {currency(data.summary.totalRevenue)}
            </div>
            <p className="text-[11px] font-bold text-emerald-700 mt-1">
              Ingresos efectivamente liquidados
            </p>
          </div>
        </div>

        {/* Total Transactions */}
        <div className="bg-gradient-to-br from-sky-50 to-sky-100/40 rounded-3xl p-5 border border-sky-200/90 shadow-soft-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-sky-800">
              Transacciones Cobradas
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-soft-xs">
              <AppIcon name="receipt" size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-sky-950 tracking-tight">
              {data.summary.totalTransactions}
            </div>
            <p className="text-[11px] font-bold text-sky-700 mt-1">
              Cobros procesados en caja
            </p>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/40 rounded-3xl p-5 border border-indigo-200/90 shadow-soft-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-800">
              Pedidos Atendidos
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-soft-xs">
              <AppIcon name="orders" size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-950 tracking-tight">
              {data.summary.totalOrders}
            </div>
            <p className="text-[11px] font-bold text-indigo-700 mt-1">
              Cuentas cerradas hoy
            </p>
          </div>
        </div>

        {/* Average Ticket */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100/40 rounded-3xl p-5 border border-purple-200/90 shadow-soft-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-purple-800">
              Ticket Promedio
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-soft-xs">
              <AppIcon name="kpis" size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-purple-950 tracking-tight">
              {currency(data.summary.averageTicket)}
            </div>
            <p className="text-[11px] font-bold text-purple-700 mt-1">
              Promedio por transacción
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Groupings A, B, C */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* A. Ventas por Método de Pago */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-soft-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <AppIcon name="card" size={18} />
                </span>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    A. Ventas por método de pago
                  </h2>
                  <p className="text-xs text-slate-500">
                    Ingresos recaudados clasificados por forma de cobro
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                {currency(data.byPaymentMethod.totalRevenue)}
              </span>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {data.byPaymentMethod.items.map((item) => {
                const renderPaymentIcon = () => {
                  if (item.method === 'efectivo') return <AppIcon name="cash" size={17} className="text-emerald-600" />;
                  if (item.method === 'tarjeta') return <AppIcon name="card" size={17} className="text-sky-600" />;
                  if (item.method === 'transferencia') return <AppIcon name="transfer" size={17} className="text-indigo-600" />;
                  return <AppIcon name="receipt" size={17} className="text-slate-600" />;
                };

                return (
                  <div key={item.method} className="py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0">
                        {renderPaymentIcon()}
                      </span>
                      <div>
                        <p className="text-xs font-black text-slate-900">{item.label}</p>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {item.transactionsCount} {item.transactionsCount === 1 ? 'transacción' : 'transacciones'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">{currency(item.total)}</p>
                      <p className="text-[11px] font-bold text-slate-500">
                        {item.percentage.toFixed(1)}% del total
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 bg-slate-50/80 -mx-6 -mb-6 p-4 rounded-b-3xl flex items-center justify-between">
            <span className="text-xs font-black text-slate-700">Total Ingresos Recaudados:</span>
            <span className="text-base font-black text-emerald-700">
              {currency(data.byPaymentMethod.totalRevenue)}
            </span>
          </div>
        </div>

        {/* B. Ventas por Modalidad del Pedido */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-soft-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                  <AppIcon name="tables" size={18} />
                </span>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    B. Ventas por modalidad del pedido
                  </h2>
                  <p className="text-xs text-slate-500">
                    Distribución de ventas por canal de servicio
                  </p>
                </div>
              </div>
              <span className="text-xs font-black text-indigo-800 bg-indigo-100 px-3 py-1 rounded-full">
                {data.byOrderType.totalOrders} pedidos
              </span>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {data.byOrderType.items.map((item) => {
                const renderModalityIcon = () => {
                  if (item.orderType === 'local') return <AppIcon name="tables" size={17} className="text-indigo-600" />;
                  if (item.orderType === 'para llevar') return <AppIcon name="products" size={17} className="text-amber-600" />;
                  if (item.orderType === 'domicilio') return <AppIcon name="home" size={17} className="text-emerald-600" />;
                  return <AppIcon name="sparkles" size={17} className="text-purple-600" />;
                };

                return (
                  <div key={item.orderType} className="py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0">
                        {renderModalityIcon()}
                      </span>
                      <div>
                        <p className="text-xs font-black text-slate-900">{item.label}</p>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {item.ordersCount} {item.ordersCount === 1 ? 'pedido' : 'pedidos'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">{currency(item.total)}</p>
                      <p className="text-[11px] font-bold text-slate-500">
                        {item.percentage.toFixed(1)}% de ventas
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 bg-slate-50/80 -mx-6 -mb-6 p-4 rounded-b-3xl flex items-center justify-between">
            <span className="text-xs font-black text-slate-700">Total Importe por Modalidad:</span>
            <span className="text-base font-black text-indigo-700">
              {currency(data.byOrderType.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* C. Actividad Operativa de Cocina por Estaciones */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-soft-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-amber-50 text-amber-700">
              <AppIcon name="kitchen" size={20} />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                C. Actividad operativa de cocina
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Separación y carga de comandas entre Cocina Fría (sushi, sashimi, ceviche) y Cocina Caliente (ramen, yakimeshi, tempura)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700">
              {data.kitchenActivity.totalComandasCount} comandas emitidas
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700">
              {data.kitchenActivity.totalDishesCount} platillos preparados
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Estación Cocina Fría */}
          <div className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50/70 to-sky-100/30 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-soft-xs">
                  <AppIcon name="frozen" size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-sky-950 uppercase tracking-wide">
                    Cocina Fría
                  </h3>
                  <span className="text-[10px] font-bold text-sky-700 uppercase">
                    Barra de Sushi, Sashimi y Ceviches
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-sky-600 text-white shadow-soft-xs">
                {data.kitchenActivity.coldComandasCount} Comandas
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-sky-200/80 text-center">
              <div className="bg-white/80 rounded-2xl p-2.5 border border-sky-200/60 shadow-soft-xs">
                <span className="text-[10px] font-bold text-sky-700 block">Comandas</span>
                <span className="text-lg font-black text-sky-950">{data.kitchenActivity.coldComandasCount}</span>
              </div>
              <div className="bg-white/80 rounded-2xl p-2.5 border border-sky-200/60 shadow-soft-xs">
                <span className="text-[10px] font-bold text-sky-700 block">Pedidos</span>
                <span className="text-lg font-black text-sky-950">{data.kitchenActivity.ordersWithColdCount}</span>
              </div>
              <div className="bg-white/80 rounded-2xl p-2.5 border border-sky-200/60 shadow-soft-xs">
                <span className="text-[10px] font-bold text-sky-700 block">Platillos</span>
                <span className="text-lg font-black text-sky-950">{data.kitchenActivity.coldDishesCount}</span>
              </div>
            </div>
            <p className="text-[11px] text-sky-800 font-medium">
              * Generó {data.kitchenActivity.coldComandasCount} tickets físicos independientes en cocina fría.
            </p>
          </div>

          {/* Estación Cocina Caliente */}
          <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50/70 to-amber-100/30 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-soft-xs">
                  <AppIcon name="flame" size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-950 uppercase tracking-wide">
                    Cocina Caliente
                  </h3>
                  <span className="text-[10px] font-bold text-amber-700 uppercase">
                    Wok, Ramen, Yakimeshi y Freidoras
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-amber-600 text-white shadow-soft-xs">
                {data.kitchenActivity.hotComandasCount} Comandas
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-amber-200/80 text-center">
              <div className="bg-white/80 rounded-2xl p-2.5 border border-amber-200/60 shadow-soft-xs">
                <span className="text-[10px] font-bold text-amber-700 block">Comandas</span>
                <span className="text-lg font-black text-amber-950">{data.kitchenActivity.hotComandasCount}</span>
              </div>
              <div className="bg-white/80 rounded-2xl p-2.5 border border-amber-200/60 shadow-soft-xs">
                <span className="text-[10px] font-bold text-amber-700 block">Pedidos</span>
                <span className="text-lg font-black text-amber-950">{data.kitchenActivity.ordersWithHotCount}</span>
              </div>
              <div className="bg-white/80 rounded-2xl p-2.5 border border-amber-200/60 shadow-soft-xs">
                <span className="text-[10px] font-bold text-amber-700 block">Platillos</span>
                <span className="text-lg font-black text-amber-950">{data.kitchenActivity.hotDishesCount}</span>
              </div>
            </div>
            <p className="text-[11px] text-amber-800 font-medium">
              * Generó {data.kitchenActivity.hotComandasCount} tickets físicos independientes en cocina caliente.
            </p>
          </div>
        </div>
      </div>

      {/* Tabla de Detalle de Cuentas Cobradas del Día */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-soft-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900">
              Detalle de cuentas cobradas en el día
            </h2>
            <p className="text-xs text-slate-500">
              Relación individual de transacciones registradas y liquidadas hoy ({data.recentSales.length} ventas)
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400">
            Zona horaria: {data.timezone}
          </span>
        </div>

        {data.recentSales.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-medium">
            No se han registrado ventas pagadas en el día de hoy.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-black uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Folio</th>
                  <th className="py-3 px-3">Mesa / Tipo</th>
                  <th className="py-3 px-3">Hora</th>
                  <th className="py-3 px-3">Método de Pago</th>
                  <th className="py-3 px-3 text-right">Descuento</th>
                  <th className="py-3 px-3 text-right">Monto Total</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {data.recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 font-mono font-black text-indigo-700">
                      {sale.folio}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900">
                        {sale.tableNumber ? `Mesa ${sale.tableNumber}` : 'Sin mesa'}
                      </span>
                      <span className="text-[10px] text-slate-400 block capitalize">
                        {sale.orderType}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {sale.time}
                    </td>
                    <td className="py-3 px-3 capitalize">
                      <span className="inline-flex items-center gap-1.5 font-bold">
                        {sale.paymentMethod === 'efectivo' && (
                          <>
                            <AppIcon name="cash" size={14} className="text-emerald-600" />
                            <span>Efectivo</span>
                          </>
                        )}
                        {sale.paymentMethod === 'tarjeta' && (
                          <>
                            <AppIcon name="card" size={14} className="text-sky-600" />
                            <span>Tarjeta</span>
                          </>
                        )}
                        {sale.paymentMethod === 'transferencia' && (
                          <>
                            <AppIcon name="transfer" size={14} className="text-indigo-600" />
                            <span>Transferencia</span>
                          </>
                        )}
                        {!['efectivo', 'tarjeta', 'transferencia'].includes(sale.paymentMethod) && (
                          <>
                            <AppIcon name="receipt" size={14} className="text-slate-500" />
                            <span className="capitalize">{sale.paymentMethod}</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-rose-600 font-semibold">
                      {sale.discountAmount > 0 ? `-${currency(sale.discountAmount)}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">
                      {currency(sale.totalAmount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                        {sale.status === 'paid' ? 'Pagado' : 'Parcial'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

