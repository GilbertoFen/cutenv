import { useEffect, useMemo, useState } from "react";
import { getInventory, adjustStock } from "../../services/InventoryService";
import type { InventoryItem } from "../../types";
import { Kpi, Th, Td, fmtNum, currency } from "../../utils/Manager/manager.functions";

export default function InventoryPanel() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InventoryItem[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [delta, setDelta] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    getInventory().then(setRows).finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => r.category && set.add(r.category));
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return rows.filter(r => {
      if (category !== "all" && (r.category ?? "") !== category) return false;
      if (!text) return true;
      return [r.name, r.brand, r.sku, r.category, r.unit, r.description]
        .some(v => (v ?? "").toString().toLowerCase().includes(text));
    });
  }, [rows, q, category]);

  const kpis = useMemo(() => {
    const totalItems = rows.length;
    const totalStock = rows.reduce((acc, r) => acc + (Number.isFinite(r.currentQty) ? r.currentQty : 0), 0);
    return { totalItems, totalStock };
  }, [rows]);

  const quickAdjust = async (r: InventoryItem, d: number) => {
    try {
      setSaving(true);
      const target = await adjustStock(r, d);
      setRows(prev => prev.map(x => x.id === r.id ? { ...x, currentQty: target } : x));
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
      setRows(prev => prev.map(x => x.id === editing.id ? { ...x, currentQty: target } : x));
      setEditing(null);
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Inventario</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Kpi label="Ítems" value={String(kpis.totalItems)} />
        <Kpi label="Stock total (unidades)" value={String(kpis.totalStock)} />
      </div>

      {/* Filtros (sin exportar CSV) */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Buscar</label>
          <input
            className="rounded-xl border px-3 py-2 text-sm"
            placeholder="Nombre, marca, SKU…"
            value={q} onChange={e => setQ(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Categoría</label>
          <select
            className="rounded-xl border px-3 py-2 text-sm"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {categories.map(c => <option key={c} value={c}>{c === "all" ? "Todas" : c}</option>)}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-auto rounded-2xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <Th>SKU</Th>
              <Th>Nombre</Th>
              <Th>Marca</Th>
              <Th>Categoría</Th>
              <Th>Unidad</Th>
              <Th className="text-right">Precio</Th>
              <Th className="text-right">Stock</Th>
              <Th>Acciones</Th>
              <Th>Actualizado</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-3 py-3 text-gray-500" colSpan={9}>Cargando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-3 py-3 text-gray-500" colSpan={9}>Sin resultados.</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="border-t">
                <Td>{r.sku ?? "—"}</Td>
                <Td className="font-medium">{r.name}</Td>
                <Td>{r.brand ?? "—"}</Td>
                <Td>{r.category ?? "—"}</Td>
                <Td>{r.unit ?? "—"}</Td>
                <Td className="text-right">{r.price != null ? currency(r.price) : "—"}</Td>
                <Td className="text-right">{fmtNum(r.currentQty)}</Td>
                <Td>
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={saving}
                      className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                      onClick={() => quickAdjust(r, -1)}
                    >–1</button>
                    <button
                      disabled={saving}
                      className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                      onClick={() => quickAdjust(r, +1)}
                    >+1</button>
                    <button
                      disabled={saving}
                      className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                      onClick={() => quickAdjust(r, -5)}
                    >–5</button>
                    <button
                      disabled={saving}
                      className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                      onClick={() => quickAdjust(r, +5)}
                    >+5</button>
                    <button
                      disabled={saving}
                      className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                      onClick={() => openModal(r)}
                    >Ajuste…</button>
                  </div>
                </Td>
                <Td>{r.lastUpdate ? new Date(r.lastUpdate).toLocaleString() : "—"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
            <header className="flex items-center justify-between border-b p-4">
              <h3 className="text-lg font-semibold">Ajustar stock</h3>
              <button className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50" onClick={() => setEditing(null)}>
                Cerrar
              </button>
            </header>
            <div className="p-4 space-y-3">
              <div className="text-sm">
                Producto: <span className="font-medium">{editing.name}</span>
              </div>
              <div className="text-sm">
                Stock actual: <span className="font-medium">{fmtNum(editing.currentQty)}</span>
              </div>
              <label className="block text-sm">
                Delta (+ agrega, – descuenta)
                <input
                  type="number"
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={delta}
                  onChange={e => setDelta(Number(e.target.value))}
                />
              </label>
              {error && <div className="text-sm text-red-600">{error}</div>}
              <div className="flex justify-end gap-2 pt-2">
                <button className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50" onClick={() => setEditing(null)}>
                  Cancelar
                </button>
                <button
                  disabled={saving}
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={confirmAdjust}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}