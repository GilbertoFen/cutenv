'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getInventory, adjustStock } from "@/services/InventoryService";
import type { InventoryItem } from "@/types";
import { Kpi, Th, Td, fmtNum, currency } from "@/utils/Manager/manager.functions";
import InventoryReportModal from "./InventoryReportModal";
import UnifiedAddProductModal from "@/components/Inventory/UnifiedAddProductModal";
import { AppIcon, IngredientIcon } from "@/components/icons";
import { useNotification } from "@/context/NotificationContext";

export default function InventoryPanel() {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InventoryItem[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [delta, setDelta] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  const refreshInventory = () => {
    getInventory().then(setRows).catch(console.error);
  };

  useEffect(() => {
    setLoading(true);
    getInventory().then(setRows).finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.category && set.add(r.category));
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (category !== "all" && (r.category ?? "") !== category) return false;
      if (!text) return true;
      return [r.name, r.brand, r.sku, r.category, r.unit, r.description].some((v) =>
        (v ?? "").toString().toLowerCase().includes(text)
      );
    });
  }, [rows, q, category]);

  const kpis = useMemo(() => {
    const totalItems = rows.length;
    return { totalItems };
  }, [rows]);

  const quickAdjust = async (r: InventoryItem, d: number) => {
    try {
      setSaving(true);
      const target = await adjustStock(r, d);
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, currentQty: target } : x)));
      notify.success(`Stock actualizado (${r.name}: ${target} ${r.unit || ''})`);
    } catch (e: any) {
      notify.error(e?.message || "Error al ajustar stock");
    } finally {
      setSaving(false);
    }
  };

  const openModal = (r: InventoryItem) => {
    setEditing(r);
    setDelta(0);
    setError("");
  };

  const confirmAdjust = async () => {
    if (!editing) return;
    if (!Number.isFinite(delta) || delta === 0) {
      setError("Ingresa una cantidad de ajuste distinta de 0.");
      return;
    }
    const resultingStock = (editing.currentQty ?? 0) + delta;
    if (resultingStock < 0) {
      setError(`No es posible tener existencias negativas (${resultingStock} ${editing.unit || ''}).`);
      return;
    }
    try {
      setSaving(true);
      const target = await adjustStock(editing, delta);
      setRows((prev) => prev.map((x) => (x.id === editing.id ? { ...x, currentQty: target } : x)));
      notify.success(`Ajuste de inventario aplicado a "${editing.name}": nueva existencia ${target} ${editing.unit || ''}.`);
      setEditing(null);
    } catch (e: any) {
      const msg = e?.message || "No se pudo registrar el ajuste de inventario";
      setError(msg);
      notify.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Control de Inventario y Almacén</h2>
          <p className="text-xs text-slate-500">Supervisión de stock, existencias físicas y reporte oficial</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReportModal(true)}
            className="min-h-[44px] px-4 py-2.5 rounded-2xl text-xs font-black bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition shadow-soft-xs flex items-center gap-2"
          >
            <AppIcon name="reports" size={15} />
            <span>Generar Reporte</span>
          </button>
          <button
            onClick={() => setShowAddProductModal(true)}
            className="min-h-[44px] px-5 py-2.5 rounded-2xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-soft-xs flex items-center gap-2 active:scale-95"
          >
            <AppIcon name="add" size={15} />
            <span>+ Agregar Insumo / Escanear</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Kpi label="Total de Insumos Registrados" value={String(kpis.totalItems)} />
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-soft-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Categorías Activas</div>
            <div className="mt-1 text-2xl font-black text-slate-900">{categories.length > 1 ? categories.length - 1 : 1}</div>
          </div>
          <span className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-700">
            <AppIcon name="inventory" size={20} />
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-3xl border border-slate-200/90 shadow-soft-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <label className="text-xs font-bold text-slate-700 shrink-0">Buscar:</label>
          <input
            className="w-full rounded-2xl border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition outline-hidden"
            placeholder="Nombre, marca, SKU…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-700 shrink-0">Categoría:</label>
          <select
            className="rounded-2xl border border-slate-200 px-3.5 py-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition outline-hidden font-medium"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "Todas las categorías" : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="w-full max-w-full overflow-x-auto rounded-3xl border border-slate-200/90 bg-white shadow-soft-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
            <tr>
              <Th className="px-2.5 py-2.5 hidden md:table-cell">SKU</Th>
              <Th className="px-2.5 py-2.5">Insumo</Th>
              <Th className="px-2 py-2.5 hidden lg:table-cell">Marca</Th>
              <Th className="px-2 py-2.5">Categoría</Th>
              <Th className="px-2 py-2.5">Unidad</Th>
              <Th className="px-2 py-2.5 text-right">Costo / U.</Th>
              <Th className="px-2 py-2.5 text-right">Stock</Th>
              <Th className="px-2 py-2.5 text-center">Acciones</Th>
              <Th className="px-2 py-2.5 hidden xl:table-cell">Actualizado</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-400" colSpan={9}>
                  Cargando inventario…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-400" colSpan={9}>
                  Sin productos encontrados.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <Td className="px-2.5 py-2 text-slate-400 font-mono text-[11px] hidden md:table-cell max-w-[80px] truncate">{r.sku ?? "—"}</Td>
                  <Td className="px-2.5 py-2 font-bold text-slate-900 max-w-[160px] sm:max-w-[210px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <IngredientIcon
                        category={r.category}
                        name={r.name}
                        size={15}
                        containerClassName="w-5 h-5 rounded shrink-0"
                      />
                      <span className="truncate" title={r.name}>{r.name}</span>
                    </div>
                  </Td>
                  <Td className="px-2 py-2 text-slate-500 hidden lg:table-cell max-w-[90px] truncate">{r.brand ?? "—"}</Td>
                  <Td className="px-2 py-2 text-slate-600 max-w-[105px] truncate">
                    <span className="truncate block" title={r.category ?? '—'}>{r.category ?? "—"}</span>
                  </Td>
                  <Td className="px-2 py-2 text-slate-600 whitespace-nowrap">{r.unit ?? "—"}</Td>
                  <Td className="px-2 py-2 text-right font-semibold whitespace-nowrap">{r.price != null ? currency(r.price) : "—"}</Td>
                  <Td className="px-2 py-2 text-right font-black text-indigo-700 whitespace-nowrap">{fmtNum(r.currentQty)}</Td>
                  <Td className="px-2 py-2 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        disabled={saving}
                        className="min-h-[26px] min-w-[26px] rounded-lg px-2 py-0.5 text-[11px] font-bold border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition shadow-soft-xs active:scale-95 disabled:opacity-50"
                        onClick={() => quickAdjust(r, -1)}
                        title="Descontar 1 unidad"
                      >
                        –1
                      </button>
                      <button
                        disabled={saving}
                        className="min-h-[26px] min-w-[26px] rounded-lg px-2 py-0.5 text-[11px] font-bold border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition shadow-soft-xs active:scale-95 disabled:opacity-50"
                        onClick={() => quickAdjust(r, +1)}
                        title="Añadir 1 unidad"
                      >
                        +1
                      </button>
                      <button
                        disabled={saving}
                        className="min-h-[26px] rounded-lg px-2.5 py-0.5 text-[11px] font-bold bg-[#14144f] text-white hover:bg-[#1f1f6d] transition shadow-soft-xs active:scale-95 disabled:opacity-50"
                        onClick={() => openModal(r)}
                        title="Abrir modal de ajuste manual de stock"
                      >
                        Ajuste
                      </button>
                    </div>
                  </Td>
                  <Td className="px-2 py-2 text-slate-400 text-[11px] whitespace-nowrap hidden xl:table-cell">
                    {r.lastUpdate ? new Date(r.lastUpdate).toLocaleDateString() : "—"}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn">
            <header className="flex items-center justify-between border-b border-slate-100 p-5 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <AppIcon name="inventory" size={18} />
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">Ajuste Manual de Inventario</h3>
                  <p className="text-[11px] text-slate-400">Actualización y arqueo físico de existencias</p>
                </div>
              </div>
              <button
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                onClick={() => setEditing(null)}
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </header>

            <div className="p-6 space-y-4">
              {/* Información del insumo */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Insumo:</span>
                  <span className="text-xs font-black text-slate-900">{editing.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Existencia actual:</span>
                  <span className="text-sm font-black text-indigo-700">
                    {fmtNum(editing.currentQty)} {editing.unit || 'unidades'}
                  </span>
                </div>
              </div>

              {/* Controles de ajuste */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Cantidad de ajuste ({editing.unit || 'unidades'}):
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDelta((prev) => (prev || 0) - 1)}
                    className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-base flex items-center justify-center transition active:scale-95 shadow-soft-xs"
                    title="Disminuir 1 unidad"
                  >
                    –1
                  </button>
                  <input
                    type="number"
                    step="any"
                    autoFocus
                    placeholder="Ej. +10, -5, +250..."
                    className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-center shadow-soft-xs"
                    value={delta === 0 ? '' : delta}
                    onChange={(e) => setDelta(parseFloat(e.target.value) || 0)}
                  />
                  <button
                    type="button"
                    onClick={() => setDelta((prev) => (prev || 0) + 1)}
                    className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-base flex items-center justify-center transition active:scale-95 shadow-soft-xs"
                    title="Aumentar 1 unidad"
                  >
                    +1
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Usa valores positivos para sumar (+10, +250) o negativos para restar (-5, -500).
                </p>
              </div>

              {/* Resultado estimado después del ajuste */}
              <div className={`p-4 rounded-2xl border transition-all ${
                (editing.currentQty ?? 0) + delta < 0
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : delta > 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : delta < 0
                  ? 'bg-amber-50 border-amber-200 text-amber-950'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider mb-1 opacity-80">
                  <span>Resultado estimado:</span>
                  <span>
                    {delta > 0 ? '▲ Aumento' : delta < 0 ? '▼ Disminución' : 'Sin cambios'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs">
                    {fmtNum(editing.currentQty)} {delta >= 0 ? `+ ${fmtNum(delta)}` : `- ${fmtNum(Math.abs(delta))}`}
                  </span>
                  <span className="text-base sm:text-lg font-black">
                    = {fmtNum((editing.currentQty ?? 0) + delta)} {editing.unit || 'unidades'}
                  </span>
                </div>
                {(editing.currentQty ?? 0) + delta < 0 && (
                  <p className="text-[11px] text-rose-700 font-bold mt-1">
                    ⚠️ El ajuste provocaría existencias negativas. No está permitido.
                  </p>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-bold">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  className="min-h-[40px] rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition active:scale-95"
                  onClick={() => setEditing(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={saving || delta === 0 || (editing.currentQty ?? 0) + delta < 0}
                  className="min-h-[40px] rounded-xl bg-[#14144f] hover:bg-[#1f1f6d] text-white px-5 py-2 text-xs font-black transition-all shadow-soft-xs active:scale-95 disabled:opacity-50"
                  onClick={confirmAdjust}
                >
                  {saving ? "Guardando…" : "Confirmar Ajuste"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <InventoryReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        items={rows}
      />

      <UnifiedAddProductModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        onSuccess={refreshInventory}
      />
    </section>
  );
}
