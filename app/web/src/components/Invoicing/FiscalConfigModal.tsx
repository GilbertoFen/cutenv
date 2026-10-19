'use client';

import React, { useState, useEffect } from 'react';
import { getFiscalConfig, saveFiscalConfig, validatePacCredentials, getSatCatalogs } from '@/services/InvoicingService';
import type { FiscalConfigData, SatCatalogsData } from '@/types';
import { AppIcon } from '@/components/icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function FiscalConfigModal({ isOpen, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [catalogs, setCatalogs] = useState<SatCatalogsData | null>(null);

  const [formData, setFormData] = useState({
    rfc: '',
    legalName: '',
    taxRegime: '601',
    postalCode: '',
    pacProvider: 'mock_sandbox' as 'facturama' | 'finkok' | 'mock_sandbox',
    pacUsername: '',
    pacPassword: '',
    environment: 'sandbox' as 'sandbox' | 'production',
    defaultClaveProdServ: '90101501',
    defaultClaveUnidad: 'E48',
    defaultIvaRate: '0.16',
    series: 'F',
    nextFolio: '1',
    isValidated: false,
    hasPassword: false,
  });

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);

      Promise.all([getFiscalConfig(), getSatCatalogs()])
        .then(([cfg, cat]) => {
          setCatalogs(cat);
          setFormData({
            rfc: cfg.rfc || '',
            legalName: cfg.legalName || '',
            taxRegime: cfg.taxRegime || '601',
            postalCode: cfg.postalCode || '',
            pacProvider: cfg.pacProvider || 'mock_sandbox',
            pacUsername: cfg.pacUsername || '',
            pacPassword: '',
            environment: cfg.environment || 'sandbox',
            defaultClaveProdServ: cfg.defaultClaveProdServ || '90101501',
            defaultClaveUnidad: cfg.defaultClaveUnidad || 'E48',
            defaultIvaRate: String(cfg.defaultIvaRate ?? 0.16),
            series: cfg.series || 'F',
            nextFolio: String(cfg.nextFolio || 1),
            isValidated: cfg.isValidated,
            hasPassword: Boolean(cfg.hasPassword),
          });
        })
        .catch((err) => setError(err.message || 'Error al cargar configuración'))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!formData.rfc.trim()) {
      setError('El RFC del restaurante es obligatorio');
      return;
    }
    if (!formData.legalName.trim()) {
      setError('La razón social es obligatoria');
      return;
    }
    if (formData.postalCode.length !== 5) {
      setError('El código postal debe tener exactamente 5 dígitos');
      return;
    }

    try {
      setSaving(true);
      const res = await saveFiscalConfig({
        rfc: formData.rfc.toUpperCase().trim(),
        legalName: formData.legalName.toUpperCase().trim(),
        taxRegime: formData.taxRegime,
        postalCode: formData.postalCode.trim(),
        pacProvider: formData.pacProvider,
        pacUsername: formData.pacUsername.trim(),
        pacPassword: formData.pacPassword ? formData.pacPassword : undefined,
        environment: formData.environment,
        defaultClaveProdServ: formData.defaultClaveProdServ.trim(),
        defaultClaveUnidad: formData.defaultClaveUnidad.trim(),
        defaultIvaRate: Number(formData.defaultIvaRate) || 0.16,
        series: formData.series.toUpperCase().trim(),
        nextFolio: Number(formData.nextFolio) || 1,
      });

      setSuccessMsg(res.message || 'Configuración fiscal guardada correctamente');
      setFormData((prev) => ({ ...prev, isValidated: res.isValidated }));
      if (onSaved) onSaved();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setError(null);
    setSuccessMsg(null);
    try {
      setValidating(true);
      const res = await validatePacCredentials();
      if (res.valid) {
        setSuccessMsg(res.message);
        setFormData((prev) => ({ ...prev, isValidated: true }));
      } else {
        setError(res.message);
        setFormData((prev) => ({ ...prev, isValidated: false }));
      }
    } catch (err: any) {
      setError(err.message || 'Error al probar conexión con el PAC');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        <header className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AppIcon name="building" size={18} className="text-indigo-600" />
              <span>Configuración Fiscal y PAC (CFDI 4.0)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Datos del emisor restaurante y credenciales autorizadas del PAC ante el SAT
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
            aria-label="Cerrar modal"
          >
            <AppIcon name="close" size={16} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AppIcon name="warning" size={16} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AppIcon name="check" size={16} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Cargando configuración fiscal…
            </div>
          ) : (
            <>
              {/* Sección Emisor */}
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                  1. Datos del Restaurante Emisor
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      RFC del Restaurante *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. EKU9003173C9"
                      value={formData.rfc}
                      onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                      className="w-full text-xs font-mono px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Código Postal (Lugar Expedición) *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      placeholder="Ej. 06000"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value.replace(/\D/g, '') })}
                      className="w-full text-xs font-mono px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nombre o Razón Social (Mayúsculas, sin S.A. de C.V.) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. RESTAURANTE Y ALIMENTOS GASTRONOMICOS"
                      value={formData.legalName}
                      onChange={(e) => setFormData({ ...formData, legalName: e.target.value.toUpperCase() })}
                      className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Régimen Fiscal (SAT) *
                    </label>
                    <select
                      value={formData.taxRegime}
                      onChange={(e) => setFormData({ ...formData, taxRegime: e.target.value })}
                      className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    >
                      {catalogs?.regimenes?.map((r) => (
                        <option key={r.code} value={r.code}>
                          {r.code} - {r.description}
                        </option>
                      )) || (
                        <>
                          <option value="601">601 - General de Ley Personas Morales</option>
                          <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
                          <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sección PAC */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                    2. Proveedor Autorizado de Certificación (PAC)
                  </h3>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                      formData.isValidated
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    <AppIcon
                      name={formData.isValidated ? 'check' : 'clock'}
                      size={12}
                    />
                    <span>{formData.isValidated ? 'PAC Validado' : 'Requiere Validación'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Proveedor PAC
                    </label>
                    <select
                      value={formData.pacProvider}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pacProvider: e.target.value as any,
                        })
                      }
                      className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="mock_sandbox">PAC Sandbox Autónomo (Pruebas SAT 100% Locales)</option>
                      <option value="facturama">Facturama PAC (API v3 SAT #58032)</option>
                      <option value="finkok">Finkok PAC (Próximamente)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ambiente Operativo
                    </label>
                    <select
                      value={formData.environment}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          environment: e.target.value as any,
                        })
                      }
                      className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="sandbox">Sandbox / Modo de Pruebas</option>
                      <option value="production">Producción Fiscal SAT</option>
                    </select>
                  </div>

                  {formData.pacProvider === 'facturama' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Usuario / API Key PAC
                        </label>
                        <input
                          type="text"
                          placeholder="Usuario de Facturama"
                          value={formData.pacUsername}
                          onChange={(e) => setFormData({ ...formData, pacUsername: e.target.value })}
                          className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Contraseña / Token Secreto PAC
                        </label>
                        <input
                          type="password"
                          placeholder={formData.hasPassword ? '•••••••• (Guardado)' : 'Ingresa la contraseña'}
                          value={formData.pacPassword}
                          onChange={(e) => setFormData({ ...formData, pacPassword: e.target.value })}
                          className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500">
                    Verifica la conexión con el servidor de timbrado antes de emitir facturas
                  </span>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={validating}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <AppIcon name="zap" size={13} className="text-indigo-600" />
                    <span>{validating ? 'Verificando…' : 'Probar Conexión PAC'}</span>
                  </button>
                </div>
              </div>

              {/* Parámetros de Factura */}
              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
                  3. Parámetros de Folios y Catálogos por Defecto
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Serie</label>
                    <input
                      type="text"
                      maxLength={5}
                      value={formData.series}
                      onChange={(e) => setFormData({ ...formData, series: e.target.value.toUpperCase() })}
                      className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Folio Sig.</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.nextFolio}
                      onChange={(e) => setFormData({ ...formData, nextFolio: e.target.value })}
                      className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Clave Prod/Serv</label>
                    <input
                      type="text"
                      value={formData.defaultClaveProdServ}
                      onChange={(e) => setFormData({ ...formData, defaultClaveProdServ: e.target.value })}
                      className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tasa IVA</label>
                    <select
                      value={formData.defaultIvaRate}
                      onChange={(e) => setFormData({ ...formData, defaultIvaRate: e.target.value })}
                      className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 bg-white text-slate-900"
                    >
                      <option value="0.16">16% (General)</option>
                      <option value="0.08">8% (Frontera)</option>
                      <option value="0.00">0% (Tasa cero)</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={saving || loading}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#14144f] hover:bg-[#1f1f6d] text-white transition disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar Configuración Fiscal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
