import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Manager/SideBar";
import EmployeesPanel from "../../components/Manager/EmployeesPanel";
import SalesTodayPanel from "../../components/Manager/SalesTodayPanel";
import SalesSummary from "../../components/Manager/SalesSummary";
import SaleDetailModal from "../../components/Manager/SaleDetailModal";
import { getAllSales } from "../../services/SaleService";
import type { SaleData } from "../../types";
import ReportsPanel from "../../components/Manager/ReportsPanel";
import InventoryPanel from "../../components/Manager/InventoryPanel"
type Tab = "employees" | "sales" | "summary"| "inventory";

export default function ManagerPage() {
  const [tab, setTab] = useState<Tab>("sales");
  const [loading, setLoading] = useState(true);
  const [allSales, setAllSales] = useState<SaleData[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
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
    refreshSales();
  }, []);

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
      (acc, s) => acc + (s.totalAmount || 0),
      0
    );
    const avg = count > 0 ? totalAmount / count : 0;
    const paidCount = salesOfDay.filter((s) => s.status === "paid").length;
    const unpaidCount = allSales.filter((s) => s.status !== "paid").length;
    return { count, totalAmount, avg, paidCount, unpaidCount };
  }, [salesOfDay, allSales]);

  return (
    <div className="flex h-[100dvh]">
      <Sidebar active={tab} onSelect={(t) => setTab(t)} />

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-4 md:p-6">
          <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Panel del gerente</h1>
              <p className="text-sm text-gray-500">
                Empleados en turno y ventas diarias (por fecha).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Fecha:</label>
              <input
                type="date"
                className="rounded-xl border px-3 py-2 text-sm"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <button
                className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                onClick={refreshSales}
              >
                Recargar
              </button>
            </div>
          </header>

          {tab === "sales" && (
  <SalesSummary
    loading={loading}
    dateLabel={selectedDate}
    count={summary.count}
    totalAmount={summary.totalAmount}
    avg={summary.avg}
    paidCount={summary.paidCount}
    unpaidCount={summary.unpaidCount}
  />
)}
           {/*//////////////////////// METER AQUI EL BOTON DE REALIZAR REPORTES//////////////*/}


          {tab === "employees" && <EmployeesPanel />}
          {tab === "inventory" && <InventoryPanel />}

          {tab === "sales" && (
  <>
    <div className="mb-2 flex justify-end">
      <button
        className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
        onClick={() => setTab("summary")}
        title="Ver reporte del periodo"
      >
        Ir al resumen
      </button>
    </div>

    <SalesTodayPanel
      loading={loading}
      sales={salesOfDay}
      onPrint={(id) => window.open(`/api/sales/${id}/print`, "_blank")}
      onOpen={(id) => setDetailId(id)}
      onGoToSummary={() => setTab("summary")}
    />
  </>
)}
        </div>
        {tab === "summary" && (
  <ReportsPanel
    allSales={allSales}
    defaultDate={selectedDate}  
  />
)}
      </main>
      {detailId && (
        <SaleDetailModal saleId={detailId} onClose={() => setDetailId(null)} />
      )}
      
    </div>
  );
}
