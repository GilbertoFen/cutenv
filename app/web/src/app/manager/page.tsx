'use client';

import { useEffect, useMemo, useState } from "react";
import Sidebar, { ManagerTab } from "@/components/Manager/SideBar";
import EmployeesPanel from "@/components/Manager/EmployeesPanel";
import SalesTodayPanel from "@/components/Manager/SalesTodayPanel";
import SalesSummary from "@/components/Manager/SalesSummary";
import SaleDetailModal from "@/components/Manager/SaleDetailModal";
import CancelSaleModal from "@/components/Manager/CancelSaleModal";
import RecipesManager from "@/components/Manager/RecipesManager";
import ManagerUnlockModal from "@/components/Manager/ManagerUnlockModal";
import { getAllSales } from "@/services/SaleService";
import type { SaleData } from "@/types";
import ReportsPanel from "@/components/Manager/ReportsPanel";
import InventoryPanel from "@/components/Manager/InventoryPanel";
import InvoiceHistoryPanel from "@/components/Invoicing/InvoiceHistoryPanel";
import PromotionsManager from "@/components/Manager/PromotionsManager";
import SalesAnalyticsDashboard from "@/components/Manager/Analytics/SalesAnalyticsDashboard";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { AppIcon } from "@/components/icons";

export default function ManagerPage() {
  const { adminUser, workerUser, isManagerUnlocked, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<ManagerTab>("sales");
  const [loading, setLoading] = useState(true);
  const [allSales, setAllSales] = useState<SaleData[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SaleData | null>(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const refreshSales = () => {
    setLoading(true);
    getAllSales()
      .then((data) => setAllSales(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Solo consultar ventas si está autorizado como administrador/gerente
    if (adminUser && (isManagerUnlocked || adminUser.role === 'manager')) {
      refreshSales();
    }
  }, [adminUser, isManagerUnlocked]);

  useEffect(() => {
    if (adminUser && !isManagerUnlocked && adminUser.role !== 'manager') {
      setShowUnlockModal(true);
    }
  }, [adminUser, isManagerUnlocked]);

  const dateRange = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
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
    const paidCount = salesOfDay.filter((s) => s.status === "paid").length;
    const unpaidCount = allSales.filter((s) => s.status === "unpaid" || s.status === "partial").length;
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

  // Si el usuario es un trabajador y NO tiene sesión de administrador activa
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

  // Si es administrador pero requiere confirmación de gerente
  if (!isManagerUnlocked && adminUser.role !== 'manager') {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center max-w-md mx-auto my-12">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-900 mb-3">
          <AppIcon name="lock" size={26} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Acceso Gerencial Requerido</h2>
        <p className="text-xs text-slate-500 mt-2 mb-6">
          Para acceder a la sección de Monitoreo y Operativa es obligatorio validar credenciales de un Gerente autorizado.
        </p>
        <button
          onClick={() => setShowUnlockModal(true)}
          className="w-full py-2.5 px-4 rounded-xl bg-[#14144f] hover:bg-[#1f1f6d] text-white font-bold text-xs transition"
        >
          Ingresar Credenciales de Gerente
        </button>
        <div className="mt-4">
          <Link href="/" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
            ← Volver a Principal
          </Link>
        </div>
        <ManagerUnlockModal
          isOpen={showUnlockModal}
          onClose={() => setShowUnlockModal(false)}
          onSuccess={() => setShowUnlockModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[82vh]">
      <Sidebar active={tab} onSelect={(t) => setTab(t)} />

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {tab === "sales" && (
          <div className="space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">
                    Operativa y Monitoreo
                  </span>
                  <span className="text-xs text-slate-400">Acceso Gerencial Desbloqueado</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mt-1">Supervisión Gerencial y Almacén</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Control de inventario, recetas del menú, KPIs y cancelación de cuentas
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600">Fecha:</label>
                <input
                  type="date"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
                <button
                  className="rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-semibold transition-colors"
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
              onPrint={(id) => window.open(`/api/sales/${id}/print`, "_blank")}
              onOpen={(id) => setDetailId(id)}
              onCancel={(s) => setCancelTarget(s)}
              onGoToSummary={() => setTab("summary")}
            />
          </div>
        )}

        {tab === "analytics" && <SalesAnalyticsDashboard />}
        {tab === "promotions" && <PromotionsManager />}
        {tab === "invoicing" && <InvoiceHistoryPanel />}
        {tab === "recipes" && <RecipesManager />}
        {tab === "inventory" && <InventoryPanel />}
        {tab === "employees" && <EmployeesPanel />}
        {tab === "summary" && (
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

      <ManagerUnlockModal
        isOpen={showUnlockModal}
        onClose={() => setShowUnlockModal(false)}
        onSuccess={() => setShowUnlockModal(false)}
      />
    </div>
  );
}
