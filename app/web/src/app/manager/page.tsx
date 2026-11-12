'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar, { ManagerTab } from '@/components/Manager/SideBar';
import EmployeesPanel from '@/components/Manager/EmployeesPanel';
import SalesTodayPanel from '@/components/Manager/SalesTodayPanel';
import SalesSummary from '@/components/Manager/SalesSummary';
import SaleDetailModal from '@/components/Manager/SaleDetailModal';
import CancelSaleModal from '@/components/Manager/CancelSaleModal';
import RecipesManager from '@/components/Manager/RecipesManager';
import ReportsPanel from '@/components/Manager/ReportsPanel';
import InventoryPanel from '@/components/Manager/InventoryPanel';
import InvoiceHistoryPanel from '@/components/Invoicing/InvoiceHistoryPanel';
import PromotionsManager from '@/components/Manager/PromotionsManager';
import CashCutPanel from '@/components/Manager/CashCutPanel';
import SalesAnalyticsDashboard from '@/components/Manager/Analytics/SalesAnalyticsDashboard';
import WorkdayModule from '@/components/Workday/WorkdayModule';
import { getAllSales } from '@/services/SaleService';
import type { SaleData } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { AppIcon } from '@/components/icons';

function ManagerPageContent() {
  const searchParams = useSearchParams();
  const isWorkdayView = searchParams?.get('view') === 'workday';

  const { adminUser, workerUser, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<ManagerTab>('sales');
  const [loading, setLoading] = useState(true);
  const [allSales, setAllSales] = useState<SaleData[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SaleData | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const refreshSales = () => {
    setLoading(true);
    getAllSales()
      .then((data) => setAllSales(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Si el usuario es gerente o dueño, cargar ventas directamente
    if (adminUser) {
      refreshSales();
    }
  }, [adminUser]);

  const dateRange = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const start = new Date(y, m - 1, d, 0, 0, 0, 0);
    const end = new Date(y, m - 1, d, 23, 59, 59, 999);
    return { start, end };
  }, [selectedDate]);

  const salesOfDay: SaleData[] = useMemo(() => {
    return (allSales || []).filter((s) => {
      if (!s?.date) return false;
      const dt = new Date(s.date);
      return dt >= dateRange.start && dt <= dateRange.end;
    });
  }, [allSales, dateRange]);

  const summary = useMemo(() => {
    const count = salesOfDay.length;
    const totalAmount = salesOfDay.reduce(
      (acc, s) => acc + (s.status !== 'cancelled' ? (s.totalAmount || 0) : 0),
      0
    );
    const avg = count > 0 ? totalAmount / count : 0;
    const paidCount = salesOfDay.filter((s) => s.status === 'paid').length;
    const unpaidCount = allSales.filter((s) => s.status === 'unpaid' || s.status === 'partial').length;
    return { count, totalAmount, avg, paidCount, unpaidCount };
  }, [salesOfDay, allSales]);

  if (authLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center text-slate-400 text-sm">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Validando credenciales administrativas…
        </div>
      </div>
    );
  }

  // 1. Si el usuario es un trabajador y NO tiene sesión de administrador activa
  if (!adminUser) {
    if (workerUser) {
      return (
        <div className="bg-white rounded-3xl p-8 border-2 border-rose-200 shadow-md text-center max-w-md mx-auto my-12 animate-fadeIn">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-3 shadow-sm">
            <AppIcon name="lock" size={28} />
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-rose-100 text-rose-800">
            Área Administrativa Restringida
          </span>
          <h2 className="text-xl font-bold text-slate-800 mt-2">Acceso No Autorizado</h2>
          <p className="text-xs text-slate-500 mt-2 mb-6 leading-relaxed">
            La sección de <strong>Monitoreo y Operativa</strong> está reservada para Gerentes y Administradores.
            Su sesión activa corresponde al perfil de <strong>Trabajador Operativo</strong> ({workerUser.name}).
          </p>
          <div className="space-y-3">
            <Link
              href="/worker"
              className="block w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm"
            >
              ← Volver a mi Estación de Trabajo (/worker)
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-md text-center max-w-md mx-auto my-12 animate-fadeIn">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-900 mb-3">
          <AppIcon name="lock" size={28} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Sesión Administrativa Requerida</h2>
        <p className="text-xs text-slate-500 mt-2 mb-6">
          Debe iniciar sesión como Gerente o Dueño para acceder a este módulo.
        </p>
        <Link
          href="/login"
          className="block w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-sm"
        >
          Ir al Inicio de Sesión Administrativo
        </Link>
      </div>
    );
  }

  // 2. Opción 2: Día de Trabajo (Operación diaria y estaciones de trabajadores)
  if (isWorkdayView) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <WorkdayModule initialTab="waiter" />
      </div>
    );
  }

  // 3. Opción 1: Monitoreo y Operativa (Módulos administrativos, KPIs, almacén, recetas, reportes)
  return (
    <div className="bg-white rounded-3xl shadow-soft-xs border border-slate-200/90 overflow-hidden flex flex-col md:flex-row min-h-[85vh] animate-fadeIn">
      <Sidebar active={tab} onSelect={(t) => setTab(t)} />

      <main className="flex-1 min-w-0 overflow-y-auto p-5 sm:p-7 space-y-6">
        {tab === 'sales' && (
          <div className="space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Supervisión Gerencial y Almacén
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Auditoría de cuentas en sala, control de stock, recetas del menú y KPIs en tiempo real
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700">Fecha:</label>
                <input
                  type="date"
                  className="rounded-2xl border border-slate-200 px-3.5 py-2 text-xs bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-soft-xs"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
                <button
                  className="rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 text-xs font-bold transition shadow-soft-xs active:scale-95"
                  onClick={refreshSales}
                >
                  ↻ Recargar
                </button>
              </div>
            </header>

            <SalesSummary
              loading={loading}
              dateLabel={selectedDate}
              count={summary.count}
              totalAmount={summary.totalAmount}
              avg={summary.avg}
              paidCount={summary.paidCount}
              unpaidCount={summary.unpaidCount}
            />

            <SalesTodayPanel
              loading={loading}
              sales={salesOfDay}
              onPrint={(id) => window.open(`/api/sales/${id}/print`, '_blank')}
              onOpen={(id) => setDetailId(id)}
              onCancel={(s) => setCancelTarget(s)}
              onGoToSummary={() => setTab('summary')}
            />
          </div>
        )}

        {tab === 'cash-cut' && <CashCutPanel />}
        {tab === 'analytics' && <SalesAnalyticsDashboard />}
        {tab === 'promotions' && <PromotionsManager />}
        {tab === 'invoicing' && <InvoiceHistoryPanel />}
        {tab === 'recipes' && <RecipesManager />}
        {tab === 'inventory' && <InventoryPanel />}
        {tab === 'employees' && <EmployeesPanel />}
        {tab === 'summary' && (
          <ReportsPanel allSales={allSales} defaultDate={selectedDate} />
        )}
      </main>

      {detailId && (
        <SaleDetailModal saleId={detailId} onClose={() => setDetailId(null)} />
      )}

      {cancelTarget && (
        <CancelSaleModal
          sale={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onCancelled={() => {
            setCancelTarget(null);
            refreshSales();
          }}
        />
      )}
    </div>
  );
}

export default function ManagerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <ManagerPageContent />
    </Suspense>
  );
}
