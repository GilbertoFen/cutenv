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
  { val: 'kg', label: 'Kilogramos (kg)' },
  { val: 'l', label: 'Litros (l)' },
];

const MEASURE_UNITS = [
  { val: 'kg', label: 'Kilogramos (kg)', type: 'mass' },
  { val: 'g', label: 'Gramos (g)', type: 'mass' },
  { val: 'l', label: 'Litros (l)', type: 'volume' },
  { val: 'ml', label: 'Mililitros (ml)', type: 'volume' },
  { val: 'pza', label: 'Piezas (pza)', type: 'count' },
];

export default function UnifiedAddProductModal({ isOpen, onClose, onSuccess }: Props) {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<BarcodeLookupResponse | null>(null);

  // Notificaciones limpias de búsqueda
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [searchSuccess, setSearchSuccess] = useState<boolean | null>(null);

  // Opción producto genérico / sin código de barras
  const [isGeneric, setIsGeneric] = useState(false);

  // Cámara / Escáner
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const zxingControlsRef = useRef<any>(null);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  // Formulario único de insumo
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Verduras y Frutas');
  const [price, setPrice] = useState('0');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Lógica de empaque y unidades
  const [purchaseUnit, setPurchaseUnit] = useState('pieza');
  const [packagesCount, setPackagesCount] = useState('1'); // Cuántas unidades/cajas se adquieren
  const [contentPerUnit, setContentPerUnit] = useState('1'); // Contenido dentro de cada unidad (ej. 1 kg, 12 botellas, etc.)
  const [contentUnit, setContentUnit] = useState('kg'); // Unidad del contenido (kg, g, l, ml, pza)
  const [baseUnit, setBaseUnit] = useState('g'); // Unidad base elegida para recetas (g, ml, pza)

  // Costos de adquisición
  const [acquisitionCost, setAcquisitionCost] = useState('0');
  const [returnableOnCancel, setReturnableOnCancel] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSearchMessage(null);
      setSearchSuccess(null);
      setLookupResult(null);
      setBarcodeInput('');
      setIsGeneric(false);
      setName('');
      setBrand('');
      setCategory('Abarrotes y Secos');
      setPrice('0');
      setDescription('');
      setImageUrl('');
      setPurchaseUnit('caja');
      setPackagesCount('1');
      setContentPerUnit('1');
      setContentUnit('kg');
      setBaseUnit('g');
      setAcquisitionCost('0');
      setReturnableOnCancel(false);
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
    setSearchMessage(null);
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
          (res) => {
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
      setError('Ingresa un código de barras para consultar');
      return;
    }

    setLookingUp(true);
    setError(null);
    setSearchMessage(null);
    setSearchSuccess(null);

    try {
      const res = await lookupBarcode(code);
      setLookupResult(res);

      const prod = res.product || res.data;

      if (res.found && prod) {
        setName(prod.name || '');
        setBrand(prod.brand || '');
        setCategory(prod.category || 'Abarrotes y Secos');
        setDescription(prod.description || '');
        setImageUrl(prod.imageUrl || '');
        if (prod.price || prod.unitCost) {
          setPrice(String(prod.price || prod.unitCost || 0));
        }
        if (prod.acquisitionCost) {
          setAcquisitionCost(String(prod.acquisitionCost));
        }
        if (prod.quantity && prod.unitMesure) {
          setContentPerUnit(String(prod.quantity));
          setContentUnit(prod.unitMesure);
          setBaseUnit(prod.unitMesure);
        }
        if (prod.returnableOnCancel !== undefined) {
          setReturnableOnCancel(Boolean(prod.returnableOnCancel));
        }
        setSearchMessage('Producto encontrado.');
        setSearchSuccess(true);
      } else {
        setBarcodeInput(code);
        setSearchMessage('Producto no encontrado. Ingresa los datos manualmente.');
        setSearchSuccess(false);
      }
    } catch {
      setSearchMessage('Producto no encontrado. Ingresa los datos manualmente.');
      setSearchSuccess(false);
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

  // Cálculo de costo unitario por unidad base
  const totalCost = Math.max(0, parseFloat(acquisitionCost) || 0);
  const unitCostCalculated = calc.convertedTotal > 0 && totalCost > 0
    ? +(totalCost / calc.convertedTotal).toFixed(4)
    : 0;

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
          `Entrada: ${packagesCount} ${purchaseUnit}(s) de ${contentPerUnit} ${contentUnit}`
        );
      } else {
        await createProduct({
          name: name.trim(),
          brand: brand.trim() || undefined,
          category,
          price: unitCostCalculated || parseFloat(price) || 0,
          acquisitionCost: totalCost,
          unitCost: unitCostCalculated,
          isGeneric,
          returnableOnCancel,
          barCode: isGeneric ? undefined : (barcodeInput.trim() || undefined),
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
                Registro de Insumos e Inventario
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Captura asistida por código de barras o registro directo de productos genéricos
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            ✕
          </button>
        </header>

        {/* Barra superior de captura */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[260px]">
            <input
              ref={barcodeInputRef}
              type="text"
              disabled={isGeneric}
              placeholder={isGeneric ? "Insumo genérico (sin código de barras)" : "Escanear o teclear código de barras…"}
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleProcessBarcode())}
              className="flex-1 px-3.5 py-2 border rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
            />
            <button
              type="button"
              disabled={lookingUp || isGeneric}
              onClick={() => handleProcessBarcode()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-soft-xs"
            >
              {lookingUp ? 'Buscando…' : 'Buscar'}
            </button>
            <button
              type="button"
              onClick={isCameraActive ? stopCamera : startCamera}
              disabled={isGeneric}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${isCameraActive
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                } disabled:opacity-50`}
              title="Encender cámara para escanear"
            >
              <AppIcon name="scan" size={14} />
              <span>{isCameraActive ? 'Detener Cámara' : 'Cámara'}</span>
            </button>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 transition">
              <input
                type="checkbox"
                checked={isGeneric}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsGeneric(checked);
                  if (checked) {
                    setBarcodeInput('');
                    setSearchMessage(null);
                    stopCamera();
                  }
                }}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span>Producto genérico / Sin código de barras</span>
            </label>
          </div>
        </div>

        {/* Cuerpo del formulario con scroll interno */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Notificación limpia de búsqueda */}
          {searchMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${searchSuccess
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border border-amber-200 text-amber-900'
                }`}
            >
              <AppIcon name={searchSuccess ? 'check' : 'warning'} size={15} />
              <span>{searchMessage}</span>
            </div>
          )}

          {/* Advertencia de producto local existente */}
          {lookupResult?.source === 'local' && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-indigo-800">
                <span>⚠️ Producto existente en inventario:</span>
                <span className="underline">{lookupResult.product?.name}</span>
              </div>
              <p className="text-[11px] text-indigo-800">
                Stock actual: <strong>{lookupResult.product?.stock} {lookupResult.product?.unitMesure}</strong>. Al guardar se sumarán las unidades calculadas como una entrada de mercancía.
              </p>
            </div>
          )}

          {/* Cámara activa */}
          {isCameraActive && (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-52 mx-auto border-2 border-emerald-500">
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
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre del Insumo / Producto <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Jitomate bola, Cebolla blanca, Queso Mozzarella, Agua embotellada 600ml"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Marca / Proveedor</label>
              <input
                type="text"
                placeholder="Ej. Local, Central de Abastos, Bonafont, Bimbo"
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

          {/* SECCIÓN: UNIDADES, EMPAQUE Y CONVERSIÓN */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <AppIcon name="inventory" size={14} className="text-indigo-600" />
                <span>Presentación de Compra y Conversión a Recetas</span>
              </h3>
              <span className="text-[10px] text-slate-500">Unidades base</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Unidad de Compra</label>
                <select
                  value={purchaseUnit}
                  onChange={(e) => setPurchaseUnit(e.target.value)}
                  className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white focus:outline-none font-medium"
                >
                  {PURCHASE_UNITS.map((u) => (
                    <option key={u.val} value={u.val}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Cant. Adquirida</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={packagesCount}
                  onChange={(e) => setPackagesCount(e.target.value)}
                  className="w-full px-2.5 py-1.5 border rounded-lg text-xs focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Contenido c/u</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={contentPerUnit}
                  onChange={(e) => setContentPerUnit(e.target.value)}
                  className="w-full px-2.5 py-1.5 border rounded-lg text-xs focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Unidad Contenido</label>
                <select
                  value={contentUnit}
                  onChange={(e) => setContentUnit(e.target.value)}
                  className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white focus:outline-none font-medium"
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
                  Las recetas descontarán porciones calculadas en esta unidad base.
                </span>
              </div>

              {/* Tarjeta de cálculo y verificación en vivo */}
              <div
                className={`p-3 rounded-xl border flex flex-col justify-center ${calc.isIncompatible
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

          {/* SECCIÓN 7: COSTO DE ADQUISICIÓN Y COSTO UNITARIO CALCULADO */}
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <AppIcon name="cashier" size={14} className="text-indigo-600" />
                <span>Costo de Adquisición y Costo Unitario</span>
              </h3>
              <span className="text-[10px] text-indigo-700 font-semibold">Cálculo automático para costeo de recetas</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Costo Total de Adquisición ($ MXN) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={acquisitionCost}
                    onChange={(e) => setAcquisitionCost(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Importe total pagado por el restaurante por esta compra.
                </p>
              </div>

              {/* Resultado del costo unitario */}
              <div className="bg-white p-3 rounded-xl border border-indigo-100 flex flex-col justify-center shadow-soft-xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Costo Unitario Calculado:
                </span>
                <div className="text-sm sm:text-base font-black text-indigo-900 mt-0.5">
                  ${unitCostCalculated.toFixed(4)} <span className="text-xs font-bold text-slate-500">/ {baseUnit}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Base: ${totalCost.toFixed(2)} por {calc.convertedTotal.toLocaleString()} {baseUnit}
                </p>
              </div>
            </div>

            {/* Checkbox de reincorporación al cancelar orden */}
            <div className="pt-2 border-t border-indigo-100/70">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={returnableOnCancel}
                  onChange={(e) => setReturnableOnCancel(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-800">
                  ¿Es bebida en presentación individual cerrada? (Reincorporable a inventario si se cancela la orden)
                </span>
              </label>
              <p className="text-[10px] text-slate-500 pl-6 mt-0.5">
                Aplica únicamente para aguas, refrescos y bebidas embotelladas sin abrir. Los platillos preparados nunca se reincorporan.
              </p>
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
