'use client';

import React, { useState, useEffect, useRef } from 'react';
import { lookupBarcode, registerStockEntry } from '@/services/BarcodeService';
import { createProduct } from '@/services/InventoryService';
import type { BarcodeLookupResponse, BarcodeLookupProduct } from '@/types';
import { AppIcon, IngredientIcon } from '@/components/icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated?: () => void;
  onStockUpdated?: () => void;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onProductCreated,
  onStockUpdated,
}: Props) {
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Resultado de la búsqueda
  const [result, setResult] = useState<BarcodeLookupResponse | null>(null);

  // Formulario de confirmación y registro (para Open Food Facts o alta manual)
  const [confirmForm, setConfirmForm] = useState<{
    name: string;
    brand: string;
    category: string;
    price: string;
    stock: string;
    quantity: string;
    unitMesure: string;
    description: string;
    imageUrl?: string;
  } | null>(null);

  // Estado para registrar entrada de mercancía de producto local existente
  const [entryQty, setEntryQty] = useState('1');
  const [entryNotes, setEntryNotes] = useState('');
  const [submittingEntry, setSubmittingEntry] = useState(false);

  // Cámara / Escáner óptico
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const zxingControlsRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBarcode('');
      setResult(null);
      setError(null);
      setSuccessMsg(null);
      setConfirmForm(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      stopCamera();
    }
  }, [isOpen]);

  // Manejo de la cámara con @zxing/browser
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

      // Priorizar cámara trasera si existe (móvil/tablet)
      const selectedDevice =
        videoDevices.find((d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('trasera')) ||
        videoDevices[0];

      if (videoRef.current) {
        const controls = await reader.decodeFromVideoDevice(
          selectedDevice.deviceId,
          videoRef.current,
          (scanResult, scanErr) => {
            if (scanResult) {
              const scannedText = scanResult.getText();
              if (scannedText) {
                stopCamera();
                setBarcode(scannedText);
                handleLookupCode(scannedText);
              }
            }
          }
        );
        zxingControlsRef.current = controls;
      }
    } catch (err: any) {
      console.warn('Error al iniciar cámara para escanear:', err);
      setError(err.message || 'No se pudo acceder a la cámara. Ingrese el código manualmente o use lector USB.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (zxingControlsRef.current) {
      try {
        zxingControlsRef.current.stop();
      } catch (e) {
        // ignore
      }
      zxingControlsRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleLookupCode = async (codeToSearch: string) => {
    const clean = codeToSearch.trim();
    if (!clean) {
      setError('Por favor ingrese un código de barras');
      return;
    }

    if (loading) return; // Prevenir consultas duplicadas concurrentes

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setResult(null);
    setConfirmForm(null);

    try {
      const res = await lookupBarcode(clean);
      setResult(res);

      if (res.source === 'openfoodfacts' && res.data) {
        // Pre-llenar formulario editable con los datos normalizados de Open Food Facts
        setConfirmForm({
          name: res.data.name || '',
          brand: res.data.brand || '',
          category: res.data.category || 'Abarrotes',
          price: '0.00',
          stock: '1',
          quantity: String(res.data.quantity || 1),
          unitMesure: res.data.unitMesure || 'pza',
          description: res.data.description || '',
          imageUrl: res.data.imageUrl,
        });
      } else if (!res.found) {
        setError(res.message || 'Producto no encontrado en inventario ni en Open Food Facts.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al buscar el código de barras');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLookupCode(barcode);
    }
  };

  // Confirmar y registrar producto importado o manual
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmForm) return;

    if (!confirmForm.name.trim()) {
      setError('El nombre del producto es obligatorio');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createProduct({
        name: confirmForm.name.trim(),
        brand: confirmForm.brand.trim() || undefined,
        price: parseFloat(confirmForm.price) || 0,
        stock: parseInt(confirmForm.stock) || 0,
        quantity: parseFloat(confirmForm.quantity) || 1,
        unitMesure: confirmForm.unitMesure,
        category: confirmForm.category,
        description: confirmForm.description.trim() || 'Registrado mediante escaneo de código',
        barCode: barcode.trim(),
        imageUrl: confirmForm.imageUrl || undefined,
        source: result?.source === 'openfoodfacts' ? 'openfoodfacts' : 'manual',
      });

      setSuccessMsg(`¡Producto "${confirmForm.name}" guardado exitosamente en el inventario!`);
      setConfirmForm(null);
      setResult(null);
      setBarcode('');
      onProductCreated?.();
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  // Registrar entrada de mercancía para producto local encontrado
  const handleStockEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result?.product?.id) return;

    const qty = parseFloat(entryQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('La cantidad a ingresar debe ser mayor a 0');
      return;
    }

    setSubmittingEntry(true);
    setError(null);

    try {
      const res = await registerStockEntry(
        result.product.id,
        qty,
        entryNotes.trim() || undefined,
        barcode.trim()
      );
      setSuccessMsg(res.message || `Entrada registrada: +${qty} existencias.`);
      setEntryQty('1');
      setEntryNotes('');
      // Actualizar el stock en el preview local
      if (result.product) {
        result.product.stock = (result.product.stock || 0) + qty;
      }
      onStockUpdated?.();
    } catch (err: any) {
      setError(err.message || 'Error al registrar la entrada de mercancía');
    } finally {
      setSubmittingEntry(false);
    }
  };

  // Iniciar alta manual con el código escaneado
  const handleStartManualEntry = () => {
    setConfirmForm({
      name: '',
      brand: '',
      category: 'Abarrotes',
      price: '0.00',
      stock: '1',
      quantity: '1',
      unitMesure: 'pza',
      description: `Código escaneado: ${barcode}`,
    });
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#14144f] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/50 flex items-center justify-center">
              <AppIcon name="barcode" size={18} className="text-indigo-200" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Lector de Códigos de Barras e Inventario</h3>
              <p className="text-[11px] text-indigo-200">
                Compatible con lectores USB/Bluetooth y consulta inteligente con Open Food Facts
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            aria-label="Cerrar modal"
          >
            <AppIcon name="close" size={16} />
          </button>
        </div>

        {/* Scanner input bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <AppIcon name="barcode" size={14} />
              </span>
              <input
                ref={inputRef}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escanee o escriba el código de barras y presione Enter..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              {barcode && (
                <button
                  type="button"
                  onClick={() => {
                    setBarcode('');
                    setResult(null);
                    setConfirmForm(null);
                    inputRef.current?.focus();
                  }}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                  title="Limpiar código"
                  aria-label="Limpiar código"
                >
                  <AppIcon name="close" size={13} />
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={loading || !barcode.trim()}
              onClick={() => handleLookupCode(barcode)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Buscando…</span>
                </>
              ) : (
                <>
                  <AppIcon name="search" size={13} />
                  <span>Buscar</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={isCameraActive ? stopCamera : startCamera}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 ${
                isCameraActive
                  ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
              title="Activar cámara del dispositivo para leer códigos"
            >
              <AppIcon name="camera" size={14} />
              <span className="hidden sm:inline">{isCameraActive ? 'Detener Cámara' : 'Cámara'}</span>
            </button>
          </div>

          {/* Video Stream para escaneo con cámara */}
          {isCameraActive && (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-56 border-2 border-indigo-500 shadow-inner flex items-center justify-center">
              <video ref={videoRef} className="w-full h-full object-cover" />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-3/4 h-28 border-2 border-dashed border-red-500 rounded-lg animate-pulse flex items-center justify-center">
                  <span className="text-[10px] text-white bg-black/60 px-2 py-0.5 rounded font-mono">
                    Apunte al código de barras
                  </span>
                </div>
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <AppIcon name="info" size={14} className="text-amber-500 shrink-0" />
            <span>
              <strong>Lector USB / Bluetooth:</strong> Coloque el cursor en el campo y dispare el escáner. El código se procesará automáticamente al emitir Enter.
            </span>
          </p>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start justify-between gap-2">
              <div>
                <strong>Aviso:</strong> {error}
              </div>
              {!confirmForm && barcode && (
                <button
                  onClick={handleStartManualEntry}
                  className="shrink-0 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] transition"
                >
                  + Alta Manual
                </button>
              )}
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
              <AppIcon name="check" size={15} className="text-emerald-700 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ESTADO 1: Producto local existente encontrado */}
          {result?.found && result.source === 'local' && result.product && (
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <IngredientIcon
                    category={result.product.category}
                    name={result.product.name}
                    size={24}
                    containerClassName="w-12 h-12 rounded-xl shrink-0"
                  />
                  <div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 uppercase">
                      Catálogo Local del Restaurante
                    </span>
                    <h4 className="font-bold text-base text-slate-900 mt-1">{result.product.name}</h4>
                    <p className="text-xs text-slate-500">
                      Marca: {result.product.brand || '—'} · Código: <code className="font-mono font-bold text-slate-700">{result.product.barCode}</code>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-500">Existencias actuales:</div>
                  <div className="text-lg font-black text-emerald-700">
                    {result.product.stock} {result.product.unitMesure || 'unidades'}
                  </div>
                </div>
              </div>

              {/* Formulario para registrar recepción de mercancía (Entrada de stock auditada) */}
              <div className="pt-3 border-t border-emerald-100">
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AppIcon name="download" size={14} className="text-emerald-700" />
                  <span>Registrar Entrada de Mercancía (Recepción):</span>
                </h5>
                <form onSubmit={handleStockEntry} className="flex flex-wrap items-end gap-2">
                  <div className="w-28">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      Cantidad Recibida:
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      required
                      value={entryQty}
                      onChange={(e) => setEntryQty(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-right bg-white"
                      placeholder="1"
                    />
                  </div>

                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      Nota / Factura de Recepción (Opcional):
                    </label>
                    <input
                      type="text"
                      value={entryNotes}
                      onChange={(e) => setEntryNotes(e.target.value)}
                      placeholder="Ej. Factura #402 / Proveedor San Juan..."
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingEntry}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-60 flex items-center gap-1.5"
                  >
                    <AppIcon name="add" size={13} />
                    <span>{submittingEntry ? 'Guardando…' : '+ Sumar a Existencias'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ESTADO 2: Formulario de revisión y confirmación (Open Food Facts o Manual) */}
          {confirmForm && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <AppIcon
                    name={result?.source === 'openfoodfacts' ? 'global' : 'edit'}
                    size={16}
                    className="text-indigo-600"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {result?.source === 'openfoodfacts'
                        ? 'Confirmar Registro desde Open Food Facts'
                        : 'Alta Manual de Producto Escaneado'}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Código de barras: <code className="font-mono font-bold text-indigo-700">{barcode}</code>
                    </p>
                  </div>
                </div>

                {confirmForm.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={confirmForm.imageUrl}
                    alt="Preview"
                    className="w-12 h-12 object-contain rounded-lg border bg-white p-0.5"
                  />
                )}
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nombre del Producto <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={confirmForm.name}
                      onChange={(e) => setConfirmForm({ ...confirmForm, name: e.target.value })}
                      placeholder="Ej. Coca-Cola 330ml"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Marca / Fabricante
                    </label>
                    <input
                      type="text"
                      value={confirmForm.brand}
                      onChange={(e) => setConfirmForm({ ...confirmForm, brand: e.target.value })}
                      placeholder="Ej. Coca-Cola"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Categoría
                    </label>
                    <input
                      type="text"
                      value={confirmForm.category}
                      onChange={(e) => setConfirmForm({ ...confirmForm, category: e.target.value })}
                      placeholder="Bebidas, Lácteos..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Precio Venta ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={confirmForm.price}
                      onChange={(e) => setConfirmForm({ ...confirmForm, price: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Stock Inicial
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={confirmForm.stock}
                      onChange={(e) => setConfirmForm({ ...confirmForm, stock: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-bold text-emerald-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Unidad Medida
                    </label>
                    <select
                      value={confirmForm.unitMesure}
                      onChange={(e) => setConfirmForm({ ...confirmForm, unitMesure: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-bold"
                    >
                      <option value="pza">Pieza (pza)</option>
                      <option value="ml">Mililitros (ml)</option>
                      <option value="l">Litros (l)</option>
                      <option value="g">Gramos (g)</option>
                      <option value="kg">Kilos (kg)</option>
                      <option value="oz">Onzas (oz)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Descripción / Ingredientes
                  </label>
                  <textarea
                    rows={2}
                    value={confirmForm.description}
                    onChange={(e) => setConfirmForm({ ...confirmForm, description: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  />
                </div>

                {/* Info nutricional si viene de Open Food Facts */}
                {result?.data?.nutriments && (
                  <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100 text-[10px] text-indigo-950 flex flex-wrap gap-3">
                    <span className="flex items-center gap-1">
                      <AppIcon name="meat" size={12} className="text-rose-500" />
                      <span>Proteínas: {result.data.nutriments.proteins ?? '—'} g</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <AppIcon name="oil" size={12} className="text-amber-600" />
                      <span>Grasas: {result.data.nutriments.fat ?? '—'} g</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <AppIcon name="dessert" size={12} className="text-pink-500" />
                      <span>Azúcares: {result.data.nutriments.sugars ?? '—'} g</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <AppIcon name="sparkles" size={12} className="text-slate-500" />
                      <span>Sodio: {result.data.nutriments.sodium ?? '—'} g</span>
                    </span>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmForm(null)}
                    className="px-4 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {loading ? (
                      'Guardando…'
                    ) : (
                      <>
                        <AppIcon name="check" size={14} />
                        <span>Confirmar y Registrar en Inventario</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Estado vacío inicial */}
          {!result && !confirmForm && !error && (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-2">
                <AppIcon name="barcode" size={24} />
              </div>
              <p className="text-xs text-slate-500 font-semibold">Listo para escanear</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Utilice una pistola lectora de código de barras, la cámara o introduzca el código manualmente para identificar el artículo.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-[11px] text-slate-400">
            Base externa: Open Food Facts API v3
          </span>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
          >
            Cerrar Lector
          </button>
        </div>
      </div>
    </div>
  );
}
