'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getInventory, adjustStock } from "@/services/InventoryService";
import type { InventoryItem } from "@/types";
import { Kpi, Th, Td, fmtNum, currency } from "@/utils/Manager/manager.functions";
import InventoryReportModal from "./InventoryReportModal";
import UnifiedAddProductModal from "@/components/Inventory/UnifiedAddProductModal";
import { AppIcon, IngredientIcon } from "@/components/icons";

export default function InventoryPanel() {
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
    const totalStock = rows.reduce(
      (acc, r) => acc + (Number.isFinite(r.currentQty) ? r.currentQty : 0),
      0
    );
    return { totalItems, totalStock };
  }, [rows]);

  const quickAdjust = async (r: InventoryItem, d: number) => {
    try {
      setSaving(true);
      const target = await adjustStock(r, d);
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, currentQty: target } : x)));
    } catch (e: any) {
      alert(e?.message || "Error al ajustar stock");
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
      setError("Ingresa un número distinto de 0.");
      return;
    }
    try {
      setSaving(true);
      const target = await adjustStock(editing, delta);
      setRows((prev) => prev.map((x) => (x.id === editing.id ? { ...x, currentQty: target } : x)));
      setEditing(null);
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar");
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
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
          >
            <AppIcon name="reports" size={14} />
            <span>Generar Reporte</span>
          </button>
          <button
            onClick={() => setShowAddProductModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#14144f] hover:bg-[#1f1f6d] text-white transition shadow-sm flex items-center gap-2"
          >
            <AppIcon name="add" size={14} />
            <span>+ Agregar Insumo / Escanear</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Kpi label="Total de Ítems" value={String(kpis.totalItems)} />
        <Kpi label="Stock Total en Unidades" value={String(kpis.totalStock)} />
      </div>

      <div className="flex flex-wrap items-end gap-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
          <label className="text-xs font-semibold text-slate-600">Buscar:</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
            placeholder="Nombre, marca, SKU…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-slate-600">Categoría:</label>
          <select
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
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

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
            <tr>
              <Th>SKU</Th>
              <Th>Nombre</Th>
              <Th>Marca</Th>
              <Th>Categoría</Th>
              <Th>Unidad</Th>
              <Th className="text-right">Precio</Th>
              <Th className="text-right">Stock</Th>
              <Th>Acciones rápidas</Th>
              <Th>Actualizado</Th>
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
                  <Td className="text-slate-400 font-mono">{r.sku ?? "—"}</Td>
                  <Td className="font-bold text-slate-900">
                    <div className="flex items-center gap-2">
                      <IngredientIcon
                        category={r.category}
                        name={r.name}
                        size={16}
                        containerClassName="w-6 h-6 rounded shrink-0"
                      />
                      <span>{r.name}</span>
                    </div>
                  </Td>
                  <Td>{r.brand ?? "—"}</Td>
                  <Td>{r.category ?? "—"}</Td>
                  <Td>{r.unit ?? "—"}</Td>
                  <Td className="text-right font-semibold">{r.price != null ? currency(r.price) : "—"}</Td>
                  <Td className="text-right font-bold text-indigo-700">{fmtNum(r.currentQty)}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <button
                        disabled={saving}
                        className="rounded px-2 py-0.5 text-[11px] font-bold border border-slate-300 hover:bg-slate-100"
                        onClick={() => quickAdjust(r, -1)}
                      >
                        –1
                      </button>
                      <button
                        disabled={saving}
                        className="rounded px-2 py-0.5 text-[11px] font-bold border border-slate-300 hover:bg-slate-100"
                        onClick={() => quickAdjust(r, +1)}
                      >
                        +1
                      </button>
                      <button
                        disabled={saving}
                        className="rounded px-2 py-0.5 text-[11px] font-bold border border-slate-300 hover:bg-slate-100"
                        onClick={() => quickAdjust(r, -5)}
                      >
                        –5
                      </button>
                      <button
                        disabled={saving}
                        className="rounded px-2 py-0.5 text-[11px] font-bold border border-slate-300 hover:bg-slate-100"
                        onClick={() => quickAdjust(r, +5)}
                      >
                        +5
                      </button>
                      <button
                        disabled={saving}
                        className="rounded px-2 py-0.5 text-[11px] font-bold bg-[#14144f] text-white hover:bg-[#1f1f6d]"
                        onClick={() => openModal(r)}
                      >
                        Ajuste
                      </button>
                    </div>
                  </Td>
                  <Td className="text-slate-400 text-[11px]">
                    {r.lastUpdate ? new Date(r.lastUpdate).toLocaleDateString() : "—"}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <header className="flex items-center justify-between border-b p-4 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">Ajustar Stock Manual</h3>
              <button
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
                onClick={() => setEditing(null)}
                aria-label="Cerrar modal"
              >
                <AppIcon name="close" size={16} />
              </button>
            </header>
            <div className="p-5 space-y-3">
              <div className="text-xs text-slate-600">
                Producto: <strong className="text-slate-900">{editing.name}</strong>
              </div>
              <div className="text-xs text-slate-600">
                Stock actual: <strong className="text-indigo-700">{fmtNum(editing.currentQty)}</strong>
              </div>
              <label className="block text-xs font-semibold text-slate-700">
                Diferencia (+ suma, – descuenta):
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  value={delta}
                  onChange={(e) => setDelta(Number(e.target.value))}
                />
              </label>
              {error && <div className="text-xs text-rose-600 font-semibold">{error}</div>}
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
                  onClick={() => setEditing(null)}
                >
                  Cancelar
                </button>
                <button
                  disabled={saving}
                  className="rounded-lg bg-[#14144f] hover:bg-[#1f1f6d] text-white px-4 py-1.5 text-xs font-bold transition-colors disabled:opacity-50"
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
