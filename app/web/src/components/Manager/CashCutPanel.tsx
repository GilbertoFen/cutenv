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
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Corte de caja
          </h1>
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

      {/* Fila 1: Tres tarjetas principales de métricas de importes separados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* Venta Total Neta */}
        <div className="bg-gradient-to-br from-indigo-50 via-indigo-50/70 to-indigo-100/40 rounded-3xl p-5 sm:p-6 border border-indigo-200/90 shadow-soft-xs flex flex-col justify-between min-w-0 transition-all hover:shadow-soft-md">
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-800 truncate" title="Venta Total Neta">
              Venta Total Neta
            </span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-soft-xs flex-shrink-0">
              <AppIcon name="receipt" size={19} />
            </div>
          </div>
          <div className="min-w-0">
            <div
              className="text-2xl sm:text-3xl xl:text-4xl font-black text-indigo-950 tracking-tight tabular-nums truncate"
              title={currency(data.summary.totalNetSales ?? data.summary.totalRevenue)}
            >
              {currency(data.summary.totalNetSales ?? data.summary.totalRevenue)}
            </div>
          </div>
        </div>

        {/* Propinas Totales */}
        <div className="bg-gradient-to-br from-amber-50 via-amber-50/70 to-amber-100/40 rounded-3xl p-5 sm:p-6 border border-amber-200/90 shadow-soft-xs flex flex-col justify-between min-w-0 transition-all hover:shadow-soft-md">
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 truncate" title="Propinas Totales">
              Propinas Totales
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold text-xs shadow-soft-xs flex-shrink-0">
              <AppIcon name="sparkles" size={19} />
            </div>
          </div>
          <div className="min-w-0">
            <div
              className="text-2xl sm:text-3xl xl:text-4xl font-black text-amber-950 tracking-tight tabular-nums truncate"
              title={currency(data.summary.totalTips ?? 0)}
            >
              {currency(data.summary.totalTips ?? 0)}
            </div>
          </div>
        </div>

        {/* Total Cobrado */}
        <div className="bg-gradient-to-br from-emerald-50 via-emerald-50/70 to-emerald-100/40 rounded-3xl p-5 sm:p-6 border border-emerald-200/90 shadow-soft-xs flex flex-col justify-between min-w-0 transition-all hover:shadow-soft-md">
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 truncate" title="Total Cobrado">
              Total Cobrado (Neta + Propinas)
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-soft-xs flex-shrink-0">
              <AppIcon name="cash" size={19} />
            </div>
          </div>
          <div className="min-w-0">
            <div
              className="text-2xl sm:text-3xl xl:text-4xl font-black text-emerald-950 tracking-tight tabular-nums truncate"
              title={currency(data.summary.totalRevenue)}
            >
              {currency(data.summary.totalRevenue)}
            </div>
          </div>
        </div>
      </div>

      {/* Fila 2: Indicadores operativos y Ticket Promedio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* Transacciones Cobradas */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-soft-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Transacciones Cobradas
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
              {data.summary.totalTransactions}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Cobros procesados en caja</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center font-bold text-xs">
            <AppIcon name="receipt" size={18} />
          </div>
        </div>

        {/* Pedidos Atendidos */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-soft-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Pedidos Atendidos
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
              {data.summary.totalOrders}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Cuentas cerradas hoy</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold text-xs">
            <AppIcon name="orders" size={18} />
          </div>
        </div>

        {/* Ticket Promedio */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-purple-200/90 bg-gradient-to-br from-purple-50/40 to-white shadow-soft-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
                Ticket Promedio
              </span>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700">
                Venta Neta
              </span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-purple-950 mt-1 block">
              {currency(data.summary.averageTicket)}
            </span>
            <p className="text-[11px] text-purple-700 mt-0.5">Venta Neta ÷ Transacciones</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-soft-xs">
            <AppIcon name="kpis" size={18} />
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
                      <p className="text-[11px] font-semibold text-slate-500">
                        Venta neta: {currency(item.netSales ?? item.total)}
                      </p>
                      <p className="text-[10px] font-bold text-amber-700">
                        Propina: {currency(item.tips ?? 0)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 bg-slate-50/80 -mx-6 -mb-6 p-4 rounded-b-3xl space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Venta Total Neta:</span>
              <span className="font-bold text-slate-800">
                {currency(data.byPaymentMethod.totalNetSales ?? data.summary.totalNetSales ?? data.summary.totalRevenue)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-amber-700">
              <span>Propinas Totales:</span>
              <span className="font-bold">
                +{currency(data.byPaymentMethod.totalTips ?? data.summary.totalTips ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-xs font-black text-slate-800">
              <span>Total General Cobrado:</span>
              <span className="text-base text-emerald-700">
                {currency(data.byPaymentMethod.totalRevenue)}
              </span>
            </div>
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
                  <th className="py-3 px-3 text-right">Venta Neta</th>
                  <th className="py-3 px-3 text-right">Propina</th>
                  <th className="py-3 px-3 text-right">Total Cobrado</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {data.recentSales.map((sale) => {
                  const netAmount = sale.netAmount ?? sale.totalAmount;
                  const tipAmount = sale.tipAmount ?? 0;
                  const totalCollected = sale.totalCollected ?? (netAmount + tipAmount);

                  return (
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
                      <td className="py-3 px-3 text-right font-bold text-slate-800">
                        {currency(netAmount)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-amber-700">
                        {tipAmount > 0 ? `+${currency(tipAmount)}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">
                        {currency(totalCollected)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                          {sale.status === 'paid' ? 'Pagado' : 'Parcial'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Desglose y Balance Final del Corte de Caja */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-soft-xs border border-slate-200/90">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Desglose y Balance Final del Corte de Caja
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            {data.summary.totalTransactions} transacciones registradas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-soft-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 block">
              Venta Total Neta
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">
              {currency(data.summary.totalNetSales ?? data.summary.totalRevenue)}
            </span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-soft-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block">
              Propinas Totales
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">
              {currency(data.summary.totalTips ?? 0)}
            </span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-soft-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
              Total Cobrado en Caja
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">
              {currency(data.summary.totalRevenue)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

