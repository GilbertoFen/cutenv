'use client';

import React, { useState, useEffect, useRef } from 'react';
import { lookupBarcode, registerStockEntry } from '@/services/BarcodeService';
import { createProduct } from '@/services/InventoryService';
import type { BarcodeLookupResponse } from '@/types';
import { AppIcon } from '@/components/icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORIES = [
  'Lácteos',
  'Carnes y Proteínas',
  'Verduras y Frutas',
  'Abarrotes y Secos',
  'Bebidas y Licores',
  'Panadería y Tortillería',
  'Salsas y Condimentos',
  'Desechables y Limpieza',
];

const PURCHASE_UNITS = [
  { val: 'caja', label: 'Caja' },
  { val: 'paquete', label: 'Paquete' },
  { val: 'botella', label: 'Botella' },
  { val: 'bolsa', label: 'Bolsa' },
  { val: 'lata', label: 'Lata' },
  { val: 'cubeta', label: 'Cubeta / Bidón' },
  { val: 'pieza', label: 'Pieza individual' },
];

const MEASURE_UNITS = [
  { val: 'kg', label: 'Kilogramos (kg)', type: 'mass' },
  { val: 'g', label: 'Gramos (g)', type: 'mass' },
  { val: 'l', label: 'Litros (l)', type: 'volume' },
  { val: 'ml', label: 'Mililitros (ml)', type: 'volume' },
  { val: 'pza', label: 'Piezas (pza)', type: 'count' },
];

export default function UnifiedAddProductModal({ isOpen, onClose, onSuccess }: Props) {
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('manual');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<BarcodeLookupResponse | null>(null);

  // Cámara / Escáner
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const zxingControlsRef = useRef<any>(null);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  // Formulario único de insumo
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Abarrotes y Secos');
  const [price, setPrice] = useState('0');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Lógica de empaque y unidades
  const [purchaseUnit, setPurchaseUnit] = useState('caja');
  const [packagesCount, setPackagesCount] = useState('1'); // Cuántas cajas se adquieren
  const [contentPerUnit, setContentPerUnit] = useState('1'); // Cantidad dentro de cada caja (ej. 12 botellas, o 1.5)
  const [contentUnit, setContentUnit] = useState('l'); // Unidad del contenido (l, ml, kg, g, pza)
  const [baseUnit, setBaseUnit] = useState('ml'); // Unidad base elegida para el consumo en recetas

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setLookupResult(null);
      setBarcodeInput('');
      setName('');
      setBrand('');
      setCategory('Abarrotes y Secos');
      setPrice('0');
      setDescription('');
      setImageUrl('');
      setPurchaseUnit('caja');
      setPackagesCount('1');
      setContentPerUnit('1');
      setContentUnit('l');
      setBaseUnit('ml');
      setActiveTab('manual');
    } else {
      stopCamera();
    }
  }, [isOpen]);

  const stopCamera = () => {
    if (zxingControlsRef.current) {
      try {
        zxingControlsRef.current.stop();
      } catch (e) {
        console.warn('Error stopping camera', e);
      }
      zxingControlsRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    setError(null);
    setIsCameraActive(true);
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      const videoDevices = await BrowserMultiFormatReader.listVideoInputDevices();
      if (!videoDevices || videoDevices.length === 0) {
        throw new Error('No se detectó ninguna cámara en este dispositivo');
      }
      const backCamera = videoDevices.find((d) => /back|rear|environment/i.test(d.label));
      const deviceId = backCamera ? backCamera.deviceId : videoDevices[0].deviceId;

      if (videoRef.current) {
        const controls = await reader.decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          (res, err) => {
            if (res) {
              const code = res.getText();
              setBarcodeInput(code);
              stopCamera();
              handleProcessBarcode(code);
            }
          }
        );
        zxingControlsRef.current = controls;
      }
    } catch (err: any) {
      setError(err.message || 'Error al encender la cámara');
      setIsCameraActive(false);
    }
  };

  const handleProcessBarcode = async (codeToSearch?: string) => {
    const code = (codeToSearch || barcodeInput).trim();
    if (!code) {
      setError('Ingrese un código de barras para consultar');
      return;
    }

    setLookingUp(true);
    setError(null);
    try {
      const res = await lookupBarcode(code);
      setLookupResult(res);

      if (res.source === 'local' && res.product) {
        // Producto ya existe en la base de datos (detectar duplicado)
        setName(res.product.name);
        setBrand(res.product.brand || '');
        setCategory(res.product.category || 'Abarrotes y Secos');
        setPrice(String(res.product.price || 0));
        setDescription(res.product.description || '');
        setImageUrl(res.product.imageUrl || '');
        if (res.product.unitMesure) {
          setContentUnit(res.product.unitMesure);
          setBaseUnit(res.product.unitMesure);
        }
      } else if (res.source === 'openfoodfacts' && res.product) {
        // Información precargada desde catálogo internacional
        setName(res.product.name);
        setBrand(res.product.brand || '');
        setCategory(res.product.category || 'Abarrotes y Secos');
        setDescription(res.product.description || '');
        setImageUrl(res.product.imageUrl || '');
        if (res.product.quantity && res.product.unitMesure) {
          setContentPerUnit(String(res.product.quantity));
          setContentUnit(res.product.unitMesure);
        }
      } else {
        // Código nuevo no encontrado en catálogo: mantener código y permitir captura manual directa
        setBarcodeInput(code);
      }
    } catch (e: any) {
      setError(`Error al buscar código: ${e.message || 'Sin conexión'}. Puede capturarlo manualmente.`);
    } finally {
      setLookingUp(false);
    }
  };

  // Cálculo en tiempo real de unidades compatibles
  const calculateResultingStock = () => {
    const pkgs = Math.max(0, parseFloat(packagesCount) || 0);
    const content = Math.max(0, parseFloat(contentPerUnit) || 0);
    const rawTotal = pkgs * content;

    // Conversión dimensional de contentUnit a baseUnit
    let convertedTotal = rawTotal;
    let unitType = 'compatible';

    if (contentUnit === 'l' && baseUnit === 'ml') convertedTotal = rawTotal * 1000;
    else if (contentUnit === 'ml' && baseUnit === 'l') convertedTotal = rawTotal / 1000;
    else if (contentUnit === 'kg' && baseUnit === 'g') convertedTotal = rawTotal * 1000;
    else if (contentUnit === 'g' && baseUnit === 'kg') convertedTotal = rawTotal / 1000;
    else if (
      (contentUnit === 'l' || contentUnit === 'ml') &&
      (baseUnit === 'kg' || baseUnit === 'g')
    ) {
      unitType = 'incompatible';
    } else if (
      (contentUnit === 'kg' || contentUnit === 'g') &&
      (baseUnit === 'l' || baseUnit === 'ml')
    ) {
      unitType = 'incompatible';
    } else if (contentUnit !== baseUnit && (contentUnit === 'pza' || baseUnit === 'pza')) {
      unitType = 'incompatible';
    }

    return {
      rawTotal,
      convertedTotal,
      isIncompatible: unitType === 'incompatible',
    };
  };

  const calc = calculateResultingStock();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre del insumo es obligatorio');
      return;
    }
    if (calc.isIncompatible) {
      setError(`No se puede convertir ${contentUnit} a ${baseUnit} (magnitudes físicas incompatibles).`);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Si el código ya existe localmente y el usuario está confirmando entrada
      if (lookupResult?.source === 'local' && lookupResult.product?.id) {
        await registerStockEntry(
          lookupResult.product.id,
          calc.convertedTotal,
          `Entrada unificada: ${packagesCount} ${purchaseUnit}(s) de ${contentPerUnit} ${contentUnit}`
        );
      } else {
        await createProduct({
          name: name.trim(),
          brand: brand.trim() || undefined,
          category,
          price: parseFloat(price) || 0,
          barCode: barcodeInput.trim() || undefined,
          description: description.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          purchaseUnit,
          contentPerUnit: parseFloat(contentPerUnit) || 1,
          contentUnit,
          baseUnit,
          quantity: parseFloat(packagesCount) || 1,
          stock: calc.convertedTotal,
          unitMesure: baseUnit,
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al registrar el insumo en el inventario');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <header className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Registro Unificado de Insumos e Inventario
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Escaneo óptico, catálogo asistido y calculadora de empaques a unidades base
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            ✕
          </button>
        </header>

        {/* Barra superior de modo de captura */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-wrap items-center gap-2 shrink-0">
          <div className="inline-flex rounded-xl overflow-hidden border border-slate-300">
            <button
              type="button"
              onClick={() => {
                setActiveTab('manual');
                stopCamera();
              }}
              className={`px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'manual'
                  ? 'bg-[#14144f] text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <AppIcon name="add" size={14} />
              <span>Captura de Insumo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('scan');
                startCamera();
              }}
              className={`px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'scan'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <AppIcon name="scan" size={14} />
              <span>Escanear Código</span>
            </button>
          </div>

          <div className="flex-1 min-w-[200px] flex items-center gap-2">
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Escanear o teclear código de barras…"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleProcessBarcode())}
              className="flex-1 px-3 py-1.5 border rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              type="button"
              disabled={lookingUp}
              onClick={() => handleProcessBarcode()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              {lookingUp ? 'Buscando…' : 'Consultar'}
            </button>
          </div>
        </div>

        {/* Cuerpo del formulario con scroll interno */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Advertencia de duplicado o producto local existente */}
          {lookupResult?.source === 'local' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <span>⚠️ Producto existente en inventario:</span>
                <span className="underline">{lookupResult.product?.name}</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Stock actual: <strong>{lookupResult.product?.stock} {lookupResult.product?.unitMesure}</strong>. Al guardar se sumarán las unidades calculadas como una entrada de mercancía.
              </p>
            </div>
          )}

          {/* Mensaje de datos externos recuperados */}
          {lookupResult?.source === 'openfoodfacts' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
              <span className="font-bold block">✓ Datos recuperados desde Open Food Facts</span>
              Se precargaron nombre, marca y contenido. Revisa y completa los campos de empaque antes de registrar.
            </div>
          )}

          {/* Cámara activa */}
          {isCameraActive && (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-56 mx-auto border-2 border-emerald-500">
              <video ref={videoRef} className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-2 border-dashed border-emerald-400 m-8 rounded-lg pointer-events-none"></div>
              <button
                type="button"
                onClick={stopCamera}
                className="absolute top-2 right-2 px-2.5 py-1 bg-black/60 text-white rounded-lg text-xs font-bold hover:bg-black/80"
              >
                Cerrar Cámara
              </button>
            </div>
          )}

          {/* Datos básicos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Insumo / Producto *</label>
              <input
                type="text"
                required
                placeholder="Ej. Jugo de Naranja Natural, Harina de Trigo, Queso Mozzarella"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Marca / Proveedor</label>
              <input
                type="text"
                placeholder="Ej. Lala, La Costeña, Local"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SECCIÓN 2.2: REESTRUCTURACIÓN DE UNIDADES, EMPAQUES Y EXISTENCIAS */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <AppIcon name="inventory" size={14} className="text-indigo-600" />
                <span>Estructura de Empaque, Unidades y Conversión</span>
              </h3>
              <span className="text-[10px] text-slate-500">Reglas compatibles de inventario</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Unidad de Compra</label>
                <select
                  value={purchaseUnit}
                  onChange={(e) => setPurchaseUnit(e.target.value)}
                  className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white focus:outline-none"
                >
                  {PURCHASE_UNITS.map((u) => (
                    <option key={u.val} value={u.val}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Cant. Empaques</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={packagesCount}
                  onChange={(e) => setPackagesCount(e.target.value)}
                  className="w-full px-2.5 py-1.5 border rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Contenido c/u</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={contentPerUnit}
                  onChange={(e) => setContentPerUnit(e.target.value)}
                  className="w-full px-2.5 py-1.5 border rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Unidad Contenido</label>
                <select
                  value={contentUnit}
                  onChange={(e) => setContentUnit(e.target.value)}
                  className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white focus:outline-none"
                >
                  {MEASURE_UNITS.map((u) => (
                    <option key={u.val} value={u.val}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Unidad Base para Recetas (Almacenamiento)
                </label>
                <select
                  value={baseUnit}
                  onChange={(e) => setBaseUnit(e.target.value)}
                  className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white focus:outline-none font-bold text-indigo-900"
                >
                  {MEASURE_UNITS.map((u) => (
                    <option key={u.val} value={u.val}>
                      {u.label}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400">
                  Las recetas descontarán insumos calculados en esta unidad base.
                </span>
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
                    No se puede convertir {contentUnit} a {baseUnit}
                  </span>
                ) : (
                  <div className="text-sm font-black mt-0.5">
                    {calc.convertedTotal.toLocaleString()} {baseUnit}
                    <span className="text-[11px] font-normal opacity-80 block">
                      ({packagesCount} {purchaseUnit}s de {contentPerUnit} {contentUnit})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Descripción / Notas</label>
            <textarea
              rows={2}
              placeholder="Notas de proveedor, especificaciones de almacenamiento..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Footer de guardado */}
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || calc.isIncompatible}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar en Inventario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
