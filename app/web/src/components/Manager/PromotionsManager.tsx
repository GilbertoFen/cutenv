'use client';

import React, { useState, useEffect } from 'react';
import {
  getAllPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
} from '@/services/PromotionService';
import { getAllRecipes } from '@/services/RecipeService';
import type { Promotion, PromotionType, Recipe } from '@/types';
import { AppIcon } from '@/components/icons';

const DAYS_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const FULL_DAYS = [
  { val: 1, label: 'Lunes' },
  { val: 2, label: 'Martes' },
  { val: 3, label: 'Miércoles' },
  { val: 4, label: 'Jueves' },
  { val: 5, label: 'Viernes' },
  { val: 6, label: 'Sábado' },
  { val: 0, label: 'Domingo' },
];

export default function PromotionsManager() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal create/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'two_for_one' as PromotionType,
    daysOfWeek: [2], // Default martes
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    scope: 'all' as 'all' | 'categories' | 'recipes',
    targetCategories: [] as string[],
    targetRecipes: [] as string[],
    excludedRecipes: [] as string[],
    buyQuantity: 2,
    getQuantity: 1,
    triggerRecipeId: '',
    triggerQuantity: 1,
    rewardRecipeId: '',
    rewardQuantity: 1,
    discountValue: 0,
    minOrderAmount: 0,
    maxDiscountAmount: 0,
    maxApplicationsPerOrder: 0,
    applyMode: 'mix_and_match' as 'mix_and_match' | 'same_product',
    requiresAuth: false,
    isCumulative: false,
    description: '',
    authUsername: '',
    authPassword: '',
  });

  // Credential delete modal
  const [deletingPromo, setDeletingPromo] = useState<Promotion | null>(null);
  const [deleteAuth, setDeleteAuth] = useState({ username: '', password: '' });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [promos, recs] = await Promise.all([
        getAllPromotions(),
        getAllRecipes(),
      ]);
      setPromotions(promos);
      setRecipes(recs);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingPromo(null);
    setFormData({
      name: '',
      code: '',
      type: 'two_for_one',
      daysOfWeek: [2], // Martes
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      scope: 'all',
      targetCategories: [],
      targetRecipes: [],
      excludedRecipes: [],
      buyQuantity: 2,
      getQuantity: 1,
      triggerRecipeId: '',
      triggerQuantity: 1,
      rewardRecipeId: '',
      rewardQuantity: 1,
      discountValue: 0,
      minOrderAmount: 0,
      maxDiscountAmount: 0,
      maxApplicationsPerOrder: 0,
      applyMode: 'mix_and_match',
      requiresAuth: false,
      isCumulative: false,
      description: '',
      authUsername: '',
      authPassword: '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Promotion) => {
    setEditingPromo(p);
    const resolvedCategories = (p.targetCategories && p.targetCategories.length > 0)
      ? p.targetCategories
      : (p.applicableCategories || []);

    const resolvedScope = (resolvedCategories.length > 0 && p.scope === 'all')
      ? 'categories'
      : p.scope;

    setFormData({
      name: p.name,
      code: p.code || '',
      type: p.type,
      daysOfWeek: p.daysOfWeek || [],
      startDate: p.startDate ? p.startDate.substring(0, 10) : '',
      endDate: p.endDate ? p.endDate.substring(0, 10) : '',
      startTime: p.startTime || '',
      endTime: p.endTime || '',
      scope: resolvedScope,
      targetCategories: resolvedCategories,
      targetRecipes: (p.targetRecipes || []).map((r: any) => (typeof r === 'object' ? r._id || r.id : r)),
      excludedRecipes: (p.excludedRecipes || []).map((r: any) => (typeof r === 'object' ? r._id || r.id : r)),
      buyQuantity: p.buyQuantity ?? 2,
      getQuantity: p.getQuantity ?? 1,
      triggerRecipeId: p.triggerRecipeId
        ? (typeof p.triggerRecipeId === 'object' ? (p.triggerRecipeId as any)._id || (p.triggerRecipeId as any).id : p.triggerRecipeId)
        : '',
      triggerQuantity: p.triggerQuantity ?? 1,
      rewardRecipeId: p.rewardRecipeId
        ? (typeof p.rewardRecipeId === 'object' ? (p.rewardRecipeId as any)._id || (p.rewardRecipeId as any).id : p.rewardRecipeId)
        : '',
      rewardQuantity: p.rewardQuantity ?? 1,
      discountValue: p.discountValue || 0,
      minOrderAmount: p.minOrderAmount || 0,
      maxDiscountAmount: p.maxDiscountAmount || 0,
      maxApplicationsPerOrder: p.maxApplicationsPerOrder || 0,
      applyMode: p.applyMode || 'mix_and_match',
      requiresAuth: p.requiresAuth ?? (p.type === 'birthday'),
      isCumulative: p.isCumulative ?? false,
      description: p.description || '',
      authUsername: '',
      authPassword: '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleToggleDay = (day: number) => {
    setFormData((prev) => {
      const exists = prev.daysOfWeek.includes(day);
      if (exists) {
        return { ...prev, daysOfWeek: prev.daysOfWeek.filter((d) => d !== day) };
      }
      return { ...prev, daysOfWeek: [...prev.daysOfWeek, day] };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('El nombre de la promoción es obligatorio');
      return;
    }
    if (!formData.authUsername.trim() || !formData.authPassword.trim()) {
      setError('Debe ingresar credenciales de gerente para autorizar la operación');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (editingPromo) {
        await updatePromotion(editingPromo.id || editingPromo._id!, {
          name: formData.name.trim(),
          code: formData.code.trim() || undefined,
          type: formData.type,
          daysOfWeek: formData.daysOfWeek,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
          startTime: formData.startTime.trim() || undefined,
          endTime: formData.endTime.trim() || undefined,
          scope: formData.scope,
          targetCategories: formData.targetCategories,
          applicableCategories: formData.targetCategories,
          targetRecipes: formData.targetRecipes,
          excludedRecipes: formData.excludedRecipes,
          buyQuantity: Number(formData.buyQuantity) || 2,
          getQuantity: Number(formData.getQuantity) || 1,
          triggerRecipeId: formData.triggerRecipeId || undefined,
          triggerQuantity: Number(formData.triggerQuantity) || 1,
          rewardRecipeId: formData.rewardRecipeId || undefined,
          rewardQuantity: Number(formData.rewardQuantity) || 1,
          discountValue: Number(formData.discountValue) || 0,
          minOrderAmount: Number(formData.minOrderAmount) || 0,
          maxDiscountAmount: Number(formData.maxDiscountAmount) || 0,
          maxApplicationsPerOrder: Number(formData.maxApplicationsPerOrder) || 0,
          applyMode: formData.applyMode,
          requiresAuth: formData.requiresAuth || formData.type === 'birthday',
          isCumulative: formData.isCumulative,
          description: formData.description.trim() || undefined,
          authUsername: formData.authUsername.trim(),
          authPassword: formData.authPassword,
        });
      } else {
        await createPromotion({
          name: formData.name.trim(),
          code: formData.code.trim() || undefined,
          type: formData.type,
          daysOfWeek: formData.daysOfWeek,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
          startTime: formData.startTime.trim() || undefined,
          endTime: formData.endTime.trim() || undefined,
          scope: formData.scope,
          targetCategories: formData.targetCategories,
          applicableCategories: formData.targetCategories,
          targetRecipes: formData.targetRecipes,
          excludedRecipes: formData.excludedRecipes,
          buyQuantity: Number(formData.buyQuantity) || 2,
          getQuantity: Number(formData.getQuantity) || 1,
          triggerRecipeId: formData.triggerRecipeId || undefined,
          triggerQuantity: Number(formData.triggerQuantity) || 1,
          rewardRecipeId: formData.rewardRecipeId || undefined,
          rewardQuantity: Number(formData.rewardQuantity) || 1,
          discountValue: Number(formData.discountValue) || 0,
          minOrderAmount: Number(formData.minOrderAmount) || 0,
          maxDiscountAmount: Number(formData.maxDiscountAmount) || 0,
          maxApplicationsPerOrder: Number(formData.maxApplicationsPerOrder) || 0,
          applyMode: formData.applyMode,
          requiresAuth: formData.requiresAuth || formData.type === 'birthday',
          isCumulative: formData.isCumulative,
          description: formData.description.trim() || undefined,
          authUsername: formData.authUsername.trim(),
          authPassword: formData.authPassword,
        });
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la promoción');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingPromo) return;
    if (!deleteAuth.username.trim() || !deleteAuth.password.trim()) {
      setDeleteError('Ingrese usuario y contraseña de gerente');
      return;
    }

    try {
      setDeleteLoading(true);
      setDeleteError(null);
      await deletePromotion(deletingPromo.id || deletingPromo._id!, {
        authUsername: deleteAuth.username.trim(),
        authPassword: deleteAuth.password,
      });
      setDeletingPromo(null);
      await loadData();
    } catch (err: any) {
      setDeleteError(err.message || 'Error al autorizar baja');
    } finally {
      setDeleteLoading(false);
    }
  };

  const uniqueCategories = Array.from(new Set(recipes.map((r) => r.category).filter(Boolean)));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
              Caja & Marketing
            </span>
            <span className="text-xs text-slate-400">Control de Descuentos</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mt-1">Gestión de Promociones y Cupones</h2>
          <p className="text-xs text-slate-500">
            Configura promociones 2x1 programadas, descuentos directos y cupones protegidos por gerencia
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 rounded-xl bg-[#14144f] hover:bg-[#1f1f6d] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
        >
          <AppIcon name="zap" size={15} className="text-amber-300" />
          <span>+ Nueva Promoción</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Cargando promociones…</div>
      ) : promotions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <AppIcon name="zap" size={24} />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">No hay promociones registradas</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Crea promociones para días de la semana (ej. Martes 2x1) o descuentos aplicables en caja.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition"
          >
            Crear Primera Promoción
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promotions.map((p) => {
            const pId = p.id || p._id!;
            return (
              <div
                key={pId}
                className={`bg-white rounded-2xl border p-4 shadow-sm flex flex-col justify-between transition ${p.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50'
                  }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        p.type === 'two_for_one'
                          ? 'bg-amber-100 text-amber-800'
                          : p.type === 'percentage_discount'
                          ? 'bg-indigo-100 text-indigo-800'
                          : p.type === 'birthday'
                          ? 'bg-purple-100 text-purple-800'
                          : p.type === 'package_gift'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {p.type === 'two_for_one'
                        ? `${p.buyQuantity || 2}x${(p.buyQuantity || 2) - (p.getQuantity || 1)} Promoción`
                        : p.type === 'percentage_discount'
                        ? `${p.discountValue}% Descuento`
                        : p.type === 'birthday'
                        ? 'Cumpleañero (100%)'
                        : p.type === 'package_gift'
                        ? 'Regalo por Compra'
                        : `$${p.discountValue} Fijo`}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'
                        }`}
                    >
                      {p.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900">{p.name}</h3>
                  {p.code && (
                    <span className="inline-block mt-1 font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      Cupón: {p.code}
                    </span>
                  )}

                  {p.description && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{p.description}</p>
                  )}

                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-1 text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Días válidos:</span>
                      <span className="font-semibold text-[11px]">
                        {!p.daysOfWeek || p.daysOfWeek.length === 0
                          ? 'Todos los días'
                          : p.daysOfWeek.map((d) => DAYS_NAMES[d]).join(', ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Alcance:</span>
                      <span className="font-semibold text-[11px]">
                        {p.scope === 'all'
                          ? 'Toda la carta'
                          : p.scope === 'categories'
                            ? `Categorías (${(p.targetCategories || []).join(', ')})`
                            : 'Platillos seleccionados'}
                      </span>
                    </div>
                    {p.minOrderAmount ? (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Mínimo cuenta:</span>
                        <span className="font-semibold text-[11px]">${p.minOrderAmount.toFixed(2)}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditModal(p)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                  >
                    Editar
                  </button>
                  {p.isActive && (
                    <button
                      onClick={() => {
                        setDeletingPromo(p);
                        setDeleteAuth({ username: '', password: '' });
                        setDeleteError(null);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                    >
                      Desactivar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal crear / editar promoción */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <header className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {editingPromo ? 'Editar Promoción' : 'Nueva Promoción / Cupón'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Defina condiciones, días de vigencia y autorice con credenciales
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200 transition"
              >
                ✕
              </button>
            </header>

            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la Promoción *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Martes 2x1 en Bebidas"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Código de Cupón (opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej. MARTES2X1"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border rounded-xl text-xs uppercase font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Beneficio *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as PromotionType })}
                      className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-800"
                    >
                      <option value="two_for_one">2x1 / NxM (Cantidades especiales)</option>
                      <option value="percentage_discount">Descuento Porcentual (%)</option>
                      <option value="fixed_discount">Descuento Importe Fijo ($)</option>
                      <option value="birthday">Descuento de Cumpleañero (100% Bonificado)</option>
                      <option value="package_gift">Paquete / Obsequio (Compra X, lleva Y de regalo)</option>
                    </select>
                  </div>
                </div>

                {/* Campos dinámicos según el tipo de promoción */}
                {formData.type === 'two_for_one' && (
                  <div className="space-y-3 bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Unidades que adquiere (Compra)
                        </label>
                        <input
                          type="number"
                          min="2"
                          value={formData.buyQuantity}
                          onChange={(e) => setFormData({ ...formData, buyQuantity: Number(e.target.value) })}
                          className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                        <p className="text-[10px] text-slate-500 mt-0.5">Ej. 2 para 2x1, 3 para 3x2.</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Unidades bonificadas (Gratis)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={(formData.buyQuantity || 2) - 1}
                          value={formData.getQuantity}
                          onChange={(e) => setFormData({ ...formData, getQuantity: Number(e.target.value) })}
                          className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                        <p className="text-[10px] text-slate-500 mt-0.5">Ej. 1 unidad sin costo.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200/60">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Modo de Aplicación *
                        </label>
                        <select
                          value={formData.applyMode}
                          onChange={(e) => setFormData({ ...formData, applyMode: e.target.value as any })}
                          className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        >
                          <option value="mix_and_match">Mix & Match (Combina productos participantes)</option>
                          <option value="same_product">Mismo Producto (Unidades idénticas únicamente)</option>
                        </select>
                        <p className="text-[10px] text-slate-500 mt-1">
                          En Mix & Match se bonifica siempre la unidad de menor o igual precio.
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Límite de bonificaciones por cuenta (0 = sin límite)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.maxApplicationsPerOrder}
                          onChange={(e) => setFormData({ ...formData, maxApplicationsPerOrder: Number(e.target.value) })}
                          className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                          Ej. 1 = máximo una bonificación de cortesía por comanda.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {formData.type === 'package_gift' && (
                  <div className="space-y-3 bg-blue-50/60 p-3.5 rounded-2xl border border-blue-200">
                    <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <span>🎁 Configuración de Paquete / Producto de Regalo</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Producto Detonante (Requerido) *
                        </label>
                        <select
                          value={formData.triggerRecipeId}
                          onChange={(e) => setFormData({ ...formData, triggerRecipeId: e.target.value })}
                          className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="">Selecciona producto detonante…</option>
                          {recipes.map((r) => (
                            <option key={r.id || (r as any)._id} value={r.id || (r as any)._id}>
                              {r.name} (${r.price}) - {r.category}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Cantidad Detonante Requerida
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.triggerQuantity}
                          onChange={(e) => setFormData({ ...formData, triggerQuantity: Number(e.target.value) })}
                          className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-blue-200/60">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Producto de Regalo / Bonificado *
                        </label>
                        <select
                          value={formData.rewardRecipeId}
                          onChange={(e) => setFormData({ ...formData, rewardRecipeId: e.target.value })}
                          className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="">Selecciona producto de regalo…</option>
                          {recipes.map((r) => (
                            <option key={r.id || (r as any)._id} value={r.id || (r as any)._id}>
                              {r.name} (${r.price}) - {r.category}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Cantidad de Regalo por Paquete
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.rewardQuantity}
                          onChange={(e) => setFormData({ ...formData, rewardQuantity: Number(e.target.value) })}
                          className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-1">
                      <p className="text-[11px] text-blue-800 font-medium">
                        * Al ordenar el producto detonante y agregar el producto de regalo al pedido, el sistema bonificará automáticamente el 100% del costo del producto de regalo en el desglose de la venta.
                      </p>
                    </div>
                  </div>
                )}

                {formData.type === 'birthday' && (
                  <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 space-y-2">
                    <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      <span>🎂 Promoción de Cumpleañero (Bonificación 100%)</span>
                    </div>
                    <p className="text-xs text-purple-800 leading-relaxed">
                      Esta promoción aplica una bonificación del <strong>100%</strong> sobre los artículos elegibles. Requiere obligatoriamente autorización del personal en caja y está restringida a <strong>una sola aplicación por cuenta</strong>. No altera precios base de catálogo ni genera pagos ficticios.
                    </p>
                  </div>
                )}

                {(formData.type === 'percentage_discount' || formData.type === 'fixed_discount') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {formData.type === 'percentage_discount'
                          ? 'Porcentaje de Descuento (1-100%) *'
                          : 'Monto Fijo en Pesos ($) *'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={formData.type === 'percentage_discount' ? 100 : 99999}
                        step="0.5"
                        value={formData.discountValue}
                        onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tope máximo de descuento en pesos (0 = sin tope)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.maxDiscountAmount}
                        onChange={(e) => setFormData({ ...formData, maxDiscountAmount: Number(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Franja horaria y fechas de vigencia */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Fecha Inicio</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Fecha Fin</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Hora Inicio (HH:mm)</label>
                    <input
                      type="time"
                      placeholder="13:00"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Hora Fin (HH:mm)</label>
                    <input
                      type="time"
                      placeholder="18:00"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Días de la semana */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Días de la semana en los que aplica (servidor valida vigencia):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {FULL_DAYS.map((d) => {
                      const isSelected = formData.daysOfWeek.includes(d.val);
                      return (
                        <button
                          key={d.val}
                          type="button"
                          onClick={() => handleToggleDay(d.val)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${isSelected
                            ? 'bg-[#14144f] text-white border-[#14144f]'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, daysOfWeek: [] })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${formData.daysOfWeek.length === 0
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      Todos los días
                    </button>
                  </div>
                </div>

                {/* Alcance de productos elegibles (oculto si es package_gift) */}
                {formData.type !== 'package_gift' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Alcance de Productos Elegibles</label>
                      <select
                        value={formData.scope}
                        onChange={(e) => setFormData({ ...formData, scope: e.target.value as any })}
                        className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-800"
                      >
                        <option value="all">Toda la comanda / cuenta completa</option>
                        <option value="categories">Categorías seleccionadas con opción de exclusión</option>
                        <option value="recipes">Lista explícita de platillos / bebidas</option>
                      </select>
                    </div>

                    {formData.scope === 'categories' && (
                      <div className="space-y-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Categorías elegibles:</label>
                          <div className="flex flex-wrap gap-2">
                            {uniqueCategories.map((cat) => {
                              const isChecked = formData.targetCategories.includes(cat!);
                              return (
                                <label
                                  key={cat}
                                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border cursor-pointer font-medium transition ${isChecked ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-white border-slate-200 text-slate-700'}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setFormData({ ...formData, targetCategories: [...formData.targetCategories, cat!] });
                                      } else {
                                        setFormData({
                                          ...formData,
                                          targetCategories: formData.targetCategories.filter((c) => c !== cat),
                                        });
                                      }
                                    }}
                                  />
                                  <span>{cat}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* Exclusiones específicas de la categoría */}
                        {formData.targetCategories.length > 0 && (
                          <div className="pt-2 border-t border-slate-200">
                            <label className="block text-xs font-bold text-rose-800 mb-1">
                              Excluir platillos específicos de estas categorías:
                            </label>
                            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-white rounded-xl border border-slate-200">
                              {recipes
                                .filter((r) => formData.targetCategories.includes(r.category || ''))
                                .map((r) => {
                                  const rId = r.id || (r as any)._id;
                                  const isExcluded = formData.excludedRecipes.includes(rId);
                                  return (
                                    <label
                                      key={rId}
                                      className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border cursor-pointer transition ${isExcluded ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isExcluded}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setFormData({ ...formData, excludedRecipes: [...formData.excludedRecipes, rId] });
                                          } else {
                                            setFormData({
                                              ...formData,
                                              excludedRecipes: formData.excludedRecipes.filter((id) => id !== rId),
                                            });
                                          }
                                        }}
                                      />
                                      <span>{r.name}</span>
                                    </label>
                                  );
                                })}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">
                              Los platillos marcados aquí no recibirán el beneficio aunque su categoría participe.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {formData.scope === 'recipes' && (
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Selecciona los platillos o bebidas que participan:
                        </label>
                        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1.5 bg-white rounded-xl border border-slate-200">
                          {recipes.map((r) => {
                            const rId = r.id || (r as any)._id;
                            const isSelected = formData.targetRecipes.includes(rId);
                            return (
                              <label
                                key={rId}
                                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border cursor-pointer transition ${isSelected ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData({ ...formData, targetRecipes: [...formData.targetRecipes, rId] });
                                    } else {
                                      setFormData({
                                        ...formData,
                                        targetRecipes: formData.targetRecipes.filter((id) => id !== rId),
                                      });
                                    }
                                  }}
                                />
                                <span>{r.name} (${r.price})</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Descripción / Regla operativa</label>
                  <textarea
                    rows={2}
                    placeholder="Ej. Válido sólo en consumo en restaurante los martes..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Resumen en tiempo real de la configuración */}
                <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-3.5 space-y-1.5 text-xs text-indigo-950">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                    <AppIcon name="receipt" size={14} className="text-indigo-600" />
                    <span>Resumen Operativo de la Promoción:</span>
                  </div>
                  <div className="text-[11px] leading-relaxed text-indigo-900 space-y-0.5">
                    <p>
                      <strong>Beneficio:</strong>{' '}
                      {formData.type === 'two_for_one'
                        ? `${formData.buyQuantity}x${(formData.buyQuantity || 2) - (formData.getQuantity || 1)} (${formData.getQuantity} cortesía por cada ${formData.buyQuantity} consumidos)`
                        : formData.type === 'percentage_discount'
                        ? `${formData.discountValue}% de descuento directo`
                        : formData.type === 'fixed_discount'
                        ? `$${formData.discountValue} de descuento directo`
                        : formData.type === 'birthday'
                        ? '100% de bonificación por cumpleaños (1 por ticket)'
                        : `Obsequio de ${formData.rewardQuantity || 1} producto(s) por la compra de ${formData.triggerQuantity || 1}`}
                    </p>
                    <p>
                      <strong>Vigencia:</strong>{' '}
                      {formData.daysOfWeek.length === 0
                        ? 'Todos los días'
                        : formData.daysOfWeek.map((d) => DAYS_NAMES[d]).join(', ')}
                      {formData.startTime || formData.endTime
                        ? ` de ${formData.startTime || '00:00'} a ${formData.endTime || '23:59'} hrs`
                        : ''}
                    </p>
                    <p>
                      <strong>Alcance:</strong>{' '}
                      {formData.type === 'package_gift'
                        ? 'Detonante y obsequio definidos'
                        : formData.scope === 'all'
                        ? 'Toda la cuenta'
                        : formData.scope === 'categories'
                        ? `${formData.targetCategories.length} categoría(s)${formData.excludedRecipes.length > 0 ? ` con ${formData.excludedRecipes.length} platillo(s) excluidos` : ''}`
                        : `${formData.targetRecipes.length} platillo(s) participantes`}
                    </p>
                  </div>
                </div>

                {/* Autorización de Gerencia */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">
                    Autorización Gerencial Requerida
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Usuario Gerente/Admin</label>
                      <input
                        type="text"
                        required
                        placeholder="root o gerente"
                        value={formData.authUsername}
                        onChange={(e) => setFormData({ ...formData, authUsername: e.target.value })}
                        className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Contraseña</label>
                      <input
                        type="password"
                        required
                        placeholder="Contraseña"
                        value={formData.authPassword}
                        onChange={(e) => setFormData({ ...formData, authPassword: e.target.value })}
                        className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 p-3 sm:p-4 border-t border-slate-200 bg-slate-50 shrink-0">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 shadow-sm"
                >
                  {saving ? 'Validando…' : editingPromo ? 'Guardar Cambios' : 'Crear Promoción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmar baja / desactivar */}
      {deletingPromo && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900 mb-1">Desactivar Promoción</h3>
            <p className="text-xs text-slate-500 mb-4">
              ¿Deseas dar de baja la promoción <strong className="text-slate-800">{deletingPromo.name}</strong>? Se requiere autorización gerencial.
            </p>

            {deleteError && (
              <div className="p-2 mb-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleConfirmDelete} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Usuario Gerente</label>
                <input
                  type="text"
                  required
                  placeholder="Usuario"
                  value={deleteAuth.username}
                  onChange={(e) => setDeleteAuth({ ...deleteAuth, username: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contraseña</label>
                <input
                  type="password"
                  required
                  placeholder="Contraseña"
                  value={deleteAuth.password}
                  onChange={(e) => setDeleteAuth({ ...deleteAuth, password: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded-lg text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={() => setDeletingPromo(null)}
                  className="px-3 py-1.5 border rounded-lg text-xs font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                >
                  {deleteLoading ? 'Verificando…' : 'Confirmar Baja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
