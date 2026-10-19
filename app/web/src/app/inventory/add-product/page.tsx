"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createProduct } from "@/services/InventoryService";
import { lookupBarcode } from "@/services/BarcodeService";
import { AppIcon } from "@/components/icons";

export default function AddProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<{ type: 'success' | 'info' | 'warn'; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    price: "",
    purchaseUnit: "caja",
    packagesCount: "1",
    contentPerUnit: "1",
    contentUnit: "l",
    baseUnit: "ml",
    category: "Lácteos",
    description: "",
    barCode: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const calculateResultingStock = () => {
    const pkgs = Math.max(0, parseFloat(formData.packagesCount) || 0);
    const content = Math.max(0, parseFloat(formData.contentPerUnit) || 0);
    const rawTotal = pkgs * content;

    let convertedTotal = rawTotal;
    let unitType = 'compatible';

    if (formData.contentUnit === 'l' && formData.baseUnit === 'ml') convertedTotal = rawTotal * 1000;
    else if (formData.contentUnit === 'ml' && formData.baseUnit === 'l') convertedTotal = rawTotal / 1000;
    else if (formData.contentUnit === 'kg' && formData.baseUnit === 'g') convertedTotal = rawTotal * 1000;
    else if (formData.contentUnit === 'g' && formData.baseUnit === 'kg') convertedTotal = rawTotal / 1000;
    else if (
      (formData.contentUnit === 'l' || formData.contentUnit === 'ml') &&
      (formData.baseUnit === 'kg' || formData.baseUnit === 'g')
    ) {
      unitType = 'incompatible';
    } else if (
      (formData.contentUnit === 'kg' || formData.contentUnit === 'g') &&
      (formData.baseUnit === 'l' || formData.baseUnit === 'ml')
    ) {
      unitType = 'incompatible';
    } else if (formData.contentUnit !== formData.baseUnit && (formData.contentUnit === 'pza' || formData.baseUnit === 'pza')) {
      unitType = 'incompatible';
    }

    return {
      convertedTotal,
      isIncompatible: unitType === 'incompatible',
    };
  };

  const calc = calculateResultingStock();

  const handleLookupBarcode = async () => {
    const code = formData.barCode.trim();
    if (!code) {
      setLookupMessage({ type: 'warn', text: 'Ingresa un código de barras para consultar.' });
      return;
    }

    setLookingUp(true);
    setLookupMessage(null);
    try {
      const res = await lookupBarcode(code);
      if (res.source === 'local' && res.product) {
        setLookupMessage({
          type: 'info',
          text: `El producto ya existe localmente como "${res.product.name}" con stock de ${res.product.stock ?? 0} ${res.product.unitMesure}.`,
        });
        setFormData((prev) => ({
          ...prev,
          name: res.product?.name || prev.name,
          brand: res.product?.brand || prev.brand,
          category: res.product?.category || prev.category,
          baseUnit: res.product?.unitMesure || prev.baseUnit,
          price: res.product?.price != null ? String(res.product.price) : prev.price,
          description: res.product?.description || prev.description,
        }));
      } else if (res.source === 'openfoodfacts' && res.product) {
        setLookupMessage({
          type: 'success',
          text: `Información recuperada de Open Food Facts ("${res.product.name}"). Revisa y ajusta los valores antes de registrar.`,
        });
        setFormData((prev) => ({
          ...prev,
          name: res.product?.name || prev.name,
          brand: res.product?.brand || prev.brand,
          category: res.product?.category || prev.category,
          contentUnit: res.product?.unitMesure || prev.contentUnit,
          contentPerUnit: res.product?.quantity != null ? String(res.product.quantity) : prev.contentPerUnit,
          description: res.product?.description || prev.description,
        }));
      } else {
        setLookupMessage({
          type: 'warn',
          text: 'No se encontraron datos automáticos para este código. Puedes capturarlo manualmente conservando el código.',
        });
      }
    } catch (e: any) {
      setLookupMessage({
        type: 'warn',
        text: `Error de consulta externa: ${e.message || 'No se pudo conectar'}. Puedes registrarlo manualmente.`,
      });
    } finally {
      setLookingUp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("El nombre del producto es obligatorio.");
      return;
    }
    if (calc.isIncompatible) {
      setError(`No se puede convertir ${formData.contentUnit} a ${formData.baseUnit} (magnitudes físicas incompatibles).`);
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      name: formData.name.trim(),
      brand: formData.brand.trim() || undefined,
      price: Number(formData.price) || 0,
      purchaseUnit: formData.purchaseUnit,
      contentPerUnit: Number(formData.contentPerUnit) || 1,
      contentUnit: formData.contentUnit,
      baseUnit: formData.baseUnit,
      quantity: Number(formData.packagesCount) || 1,
      unitMesure: formData.baseUnit,
      category: formData.category,
      description: formData.description.trim() || undefined,
      stock: calc.convertedTotal,
      barCode: formData.barCode.trim() || undefined,
    };

    try {
      await createProduct(payload);
      router.push("/inventory");
    } catch (err: any) {
      console.error("Error creating product:", err);
      setError(err.message || "Error al registrar el producto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/inventory" className="hover:text-indigo-600 font-medium transition-colors">
            Inventario
          </Link>
          <span>›</span>
          <span className="font-bold text-slate-900">Nuevo Producto / Insumo</span>
        </div>
        <Link
          href="/inventory"
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded-xl transition-colors border border-slate-200 inline-flex items-center gap-1.5"
        >
          <AppIcon name="close" size={14} />
          <span>Cancelar</span>
        </Link>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <AppIcon name="add" size={20} className="text-indigo-900" />
              <span>Registrar Insumo en el Catálogo</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Ingresa los datos para mantener el control de existencias y costos en cocina y almacén
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AppIcon name="warning" size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs uppercase font-bold text-slate-700 mb-1.5">
                  Nombre del Insumo / Producto *
                </label>
                <input
                  required
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ej. Leche Entera 1L"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-slate-700 mb-1.5">
                  Marca / Fabricante
                </label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  placeholder="Ej. Lala, Santa Clara..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-slate-700 mb-1.5">
                  Categoría
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="Lácteos">Lácteos</option>
                  <option value="Verduras">Verduras</option>
                  <option value="Carnes">Carnes</option>
                  <option value="Bebidas">Bebidas</option>
                  <option value="Pastas">Pastas</option>
                  <option value="Panadería">Panadería</option>
                  <option value="Abarrotes">Abarrotes</option>
                  <option value="Limpieza">Limpieza</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              {/* Sección de empaque y cálculo de unidades */}
              <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <AppIcon name="inventory" size={14} className="text-indigo-600" />
                    <span>Estructura de Empaque y Conversión a Unidad Base</span>
                  </h3>
                  <span className="text-[10px] text-slate-500">Almacén y recetas</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Unidad de Compra</label>
                    <select
                      name="purchaseUnit"
                      value={formData.purchaseUnit}
                      onChange={handleChange}
                      className="w-full px-2.5 py-2 border rounded-xl text-xs bg-white focus:outline-none"
                    >
                      <option value="caja">Caja</option>
                      <option value="paquete">Paquete</option>
                      <option value="botella">Botella</option>
                      <option value="bolsa">Bolsa</option>
                      <option value="lata">Lata</option>
                      <option value="cubeta">Cubeta / Bidón</option>
                      <option value="pieza">Pieza individual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Cant. Empaques</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      name="packagesCount"
                      value={formData.packagesCount}
                      onChange={handleChange}
                      className="w-full px-2.5 py-2 border rounded-xl text-xs bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Contenido c/u</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      name="contentPerUnit"
                      value={formData.contentPerUnit}
                      onChange={handleChange}
                      className="w-full px-2.5 py-2 border rounded-xl text-xs bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Unidad Contenido</label>
                    <select
                      name="contentUnit"
                      value={formData.contentUnit}
                      onChange={handleChange}
                      className="w-full px-2.5 py-2 border rounded-xl text-xs bg-white focus:outline-none"
                    >
                      <option value="kg">Kilogramos (kg)</option>
                      <option value="g">Gramos (g)</option>
                      <option value="l">Litros (l)</option>
                      <option value="ml">Mililitros (ml)</option>
                      <option value="pza">Piezas (pza)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Unidad Base para Recetas (Almacenamiento)
                    </label>
                    <select
                      name="baseUnit"
                      value={formData.baseUnit}
                      onChange={handleChange}
                      className="w-full px-2.5 py-2 border rounded-xl text-xs bg-white font-bold text-indigo-900 focus:outline-none"
                    >
                      <option value="kg">Kilogramos (kg)</option>
                      <option value="g">Gramos (g)</option>
                      <option value="l">Litros (l)</option>
                      <option value="ml">Mililitros (ml)</option>
                      <option value="pza">Piezas (pza)</option>
                    </select>
                  </div>

                  {/* Tarjeta de cálculo y verificación en vivo */}
                  <div
                    className={`p-3 rounded-xl border flex flex-col justify-center ${
                      calc.isIncompatible
                        ? 'bg-rose-50 border-rose-200 text-rose-800'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}
                  >
                    <span className="text-[10px] font-extrabold uppercase tracking-wider block">
                      {calc.isIncompatible ? 'Conversión Inválida' : 'Inventario Resultante Calculado:'}
                    </span>
                    {calc.isIncompatible ? (
                      <span className="text-xs font-semibold mt-0.5">
                        No se puede convertir {formData.contentUnit} a {formData.baseUnit}
                      </span>
                    ) : (
                      <div className="text-sm font-black mt-0.5">
                        {calc.convertedTotal.toLocaleString()} {formData.baseUnit}
                        <span className="text-[11px] font-normal opacity-80 block">
                          ({formData.packagesCount} {formData.purchaseUnit}s de {formData.contentPerUnit} {formData.contentUnit})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-slate-700 mb-1.5">
                  Costo Unitario ($)
                </label>
                <input
                  type="number"
                  name="price"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs uppercase font-bold text-slate-700">
                    Código de Barras / SKU (Opcional)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Soporta escáner físico y Open Food Facts
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    name="barCode"
                    value={formData.barCode}
                    onChange={handleChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleLookupBarcode();
                      }
                    }}
                    placeholder="Escanea o escribe (ej. 7501000111...)"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleLookupBarcode}
                    disabled={lookingUp || !formData.barCode.trim()}
                    className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    {lookingUp ? (
                      "Consultando…"
                    ) : (
                      <>
                        <AppIcon name="zap" size={14} />
                        <span>Consultar OFF</span>
                      </>
                    )}
                  </button>
                </div>
                {lookupMessage && (
                  <div
                    className={`mt-2 p-2.5 rounded-lg text-xs font-medium border flex items-center gap-2 ${
                      lookupMessage.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : lookupMessage.type === "info"
                        ? "bg-blue-50 text-blue-800 border-blue-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    <AppIcon
                      name={
                        lookupMessage.type === "success"
                          ? "check"
                          : lookupMessage.type === "info"
                          ? "info"
                          : "warning"
                      }
                      size={14}
                    />
                    <span>{lookupMessage.text}</span>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs uppercase font-bold text-slate-700 mb-1.5">
                  Notas de Proveedor / Almacenamiento
                </label>
                <textarea
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Condiciones de refrigeración, proveedor habitual..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <Link
                href="/inventory"
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#14144f] hover:bg-[#202070] text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? "Guardando..." : "Guardar Insumo"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
