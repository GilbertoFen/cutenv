'use client';

import React, { useState, useEffect } from 'react';
import { getAllRecipes, createRecipe, updateRecipe, deleteRecipe } from '@/services/RecipeService';
import { getInventory } from '@/services/InventoryService';
import type { InventoryItem } from '@/types';
import { currency } from '@/utils/Manager/manager.functions';
import RecipeIngredientPickerModal from './RecipeIngredientPickerModal';
import { AppIcon, RecipeIcon } from '@/components/icons';

interface RecipeItem {
  id: string;
  name: string;
  price: number;
  category?: string;
  steps?: string;
  imageUrl?: string;
  ingredients?: {
    name?: string;
    ingredientId?: string;
    quantity: number;
    unitMesure?: string;
  }[];
}

export default function RecipesManager() {
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');

  // Modal create/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<RecipeItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: 'Platos Fuertes',
    steps: '',
    imageUrl: '',
    ingredients: [] as { ingredientId: string; quantity: number; unitMesure: string }[],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [recData, invData] = await Promise.all([
        getAllRecipes(),
        getInventory(),
      ]);
      setRecipes(recData as any);
      setInventory(invData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingRecipe(null);
    setFormData({
      name: '',
      price: '',
      category: 'Platos Fuertes',
      steps: '',
      imageUrl: '',
      ingredients: [],
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (r: RecipeItem) => {
    setEditingRecipe(r);
    setFormData({
      name: r.name,
      price: String(r.price ?? 0),
      category: r.category || 'Platos Fuertes',
      steps: r.steps || '',
      imageUrl: r.imageUrl || '',
      ingredients: (r.ingredients || []).map((ing: any) => ({
        ingredientId: ing.ingredientId?._id || ing.ingredientId || '',
        quantity: ing.quantity || 1,
        unitMesure: ing.unitMesure || 'pza',
      })),
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleAddFromPicker = (item: {
    ingredientId: string;
    name: string;
    quantity: number;
    unitMesure: string;
  }) => {
    setFormData((prev) => {
      const existingIdx = prev.ingredients.findIndex((i) => i.ingredientId === item.ingredientId);
      if (existingIdx >= 0) {
        const copy = [...prev.ingredients];
        copy[existingIdx] = {
          ingredientId: item.ingredientId,
          quantity: item.quantity,
          unitMesure: item.unitMesure,
        };
        return { ...prev, ingredients: copy };
      }
      return {
        ...prev,
        ingredients: [
          ...prev.ingredients,
          {
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unitMesure: item.unitMesure,
          },
        ],
      };
    });
  };

  const addIngredientRow = () => {
    if (inventory.length === 0) return;
    setFormData((prev) => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        {
          ingredientId: inventory[0].id,
          quantity: 1,
          unitMesure: inventory[0].unit || 'kg',
        },
      ],
    }));
  };

  const removeIngredientRow = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== idx),
    }));
  };

  const handleIngredientChange = (idx: number, field: string, val: any) => {
    setFormData((prev) => {
      const updated = [...prev.ingredients];
      updated[idx] = { ...updated[idx], [field]: val };
      if (field === 'ingredientId') {
        const prod = inventory.find((p) => p.id === val);
        if (prod?.unit) {
          updated[idx].unitMesure = prod.unit;
        }
      }
      return { ...prev, ingredients: updated };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('El nombre de la receta es obligatorio.');
      return;
    }
    const priceNum = Number(formData.price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError('El precio debe ser un número válido.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        price: priceNum,
        category: formData.category,
        steps: formData.steps.trim() || undefined,
        imageUrl: formData.imageUrl.trim() || undefined,
        ingredients: formData.ingredients.map((ing) => ({
          ingredientId: ing.ingredientId,
          quantity: Number(ing.quantity) || 1,
          unitMesure: ing.unitMesure || 'pza',
        })),
      };

      if (editingRecipe) {
        await updateRecipe(editingRecipe.id, {
          name: payload.name,
          price: payload.price,
          category: payload.category,
          steps: payload.steps,
          imageUrl: payload.imageUrl,
          ingredients: payload.ingredients.map((i) => ({
            ingredientId: i.ingredientId,
            quantity: i.quantity,
            unit: i.unitMesure,
          })),
        });
      } else {
        await createRecipe(payload);
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la receta');
    } finally {
      setSaving(false);
    }
  };

  // Recipe deletion modal state
  const [deletingRecipe, setDeletingRecipe] = useState<RecipeItem | null>(null);
  const [deleteAuth, setDeleteAuth] = useState({ username: '', password: '', reason: '' });
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteClick = (r: RecipeItem) => {
    setDeletingRecipe(r);
    setDeleteAuth({ username: '', password: '', reason: '' });
    setDeleteError(null);
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletingRecipe) return;
    if (!deleteAuth.username.trim() || !deleteAuth.password.trim()) {
      setDeleteError('Ingrese usuario y contraseña de gerente');
      return;
    }
    if (!deleteAuth.reason.trim() || deleteAuth.reason.trim().length < 5) {
      setDeleteError('El motivo debe tener al menos 5 caracteres');
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteRecipe(deletingRecipe.id, {
        username: deleteAuth.username.trim(),
        password: deleteAuth.password,
        reason: deleteAuth.reason.trim(),
      });
      setDeletingRecipe(null);
      await loadData();
    } catch (err: any) {
      setDeleteError(err.message || 'Error al autorizar la eliminación de la receta');
    } finally {
      setDeleteLoading(false);
    }
  };

  const categories = ['all', 'Platos Fuertes', 'Entradas', 'Bebidas', 'Postres', 'Guarniciones'];

  const filtered = recipes.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCat === 'all' || r.category === selectedCat;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Recetas de Cocina y Menú</h2>
          <p className="text-xs text-slate-500">
            Administra los platillos a la venta, sus ingredientes del inventario y precios
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-[#14144f] hover:bg-[#1f1f6d] text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
        >
          <AppIcon name="add" size={14} />
          <span>Nueva Receta</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Buscar receta por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-slate-600">Categoría:</label>
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? 'Todas las categorías' : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid de recetas */}
      {loading ? (
        <div className="text-center py-12 text-xs text-slate-400">Cargando recetas del menú…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-xs text-slate-400 border border-dashed rounded-xl bg-white">
          No hay recetas registradas con estos criterios. Presione &quot;+ Nueva Receta&quot; para dar de alta platillos.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start gap-3">
                  <RecipeIcon
                    category={r.category}
                    imageUrl={r.imageUrl}
                    name={r.name}
                    size={28}
                    containerClassName="w-14 h-14 rounded-xl shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 uppercase">
                      {r.category || 'General'}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 mt-1 truncate">{r.name}</h3>
                    <p className="font-extrabold text-sm text-emerald-700 mt-0.5">{currency(r.price)}</p>
                  </div>
                </div>

                {r.ingredients && r.ingredients.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs">
                    <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Ingredientes ({r.ingredients.length}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {r.ingredients.map((ing, i) => (
                        <span key={i} className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-600">
                          {ing.name || 'Insumo'} ({ing.quantity} {ing.unitMesure || ''})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  onClick={() => openEditModal(r)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDeleteClick(r)}
                  className="px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear / editar receta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <header className="flex items-center justify-between border-b p-4 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {editingRecipe ? 'Editar Receta del Menú' : 'Registrar Nueva Receta de Cocina'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
                aria-label="Cerrar modal"
              >
                <AppIcon name="close" size={16} />
              </button>
            </header>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 flex-1">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre del Platillo / Receta <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej. Hamburguesa Clásica"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Precio de Venta ($) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoría del Menú
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                  >
                    <option value="Platos Fuertes">Platos Fuertes</option>
                    <option value="Entradas">Entradas</option>
                    <option value="Bebidas">Bebidas</option>
                    <option value="Postres">Postres</option>
                    <option value="Guarniciones">Guarniciones</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    URL de Imagen (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pasos / Instrucciones de Preparación
                </label>
                <textarea
                  rows={2}
                  value={formData.steps}
                  onChange={(e) => setFormData({ ...formData, steps: e.target.value })}
                  placeholder="Detalles para el cocinero..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Insumos / Ingredientes */}
              <div className="pt-2 border-t">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      Ingredientes del Inventario ({formData.ingredients.length})
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Insumos que se descontarán automáticamente del almacén al vender este platillo
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPickerModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                    >
                      <AppIcon name="search" size={13} />
                      <span>+ Agregar Insumo</span>
                    </button>
                    <button
                      type="button"
                      onClick={addIngredientRow}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition"
                      title="Agregar fila vacía manualmente"
                    >
                      + Fila Manual
                    </button>
                  </div>
                </div>

                {formData.ingredients.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
                    <p className="text-xs text-slate-500 font-medium">
                      No has vinculado insumos a esta receta.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Haz clic en <strong>&quot;+ Agregar Insumo&quot;</strong> para buscar ingredientes del inventario y asignarles porción.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formData.ingredients.map((ing, idx) => {
                      const prod = inventory.find((p) => p.id === ing.ingredientId);
                      return (
                        <div
                          key={idx}
                          className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200"
                        >
                          <div className="flex-1 min-w-[180px]">
                            <select
                              value={ing.ingredientId}
                              onChange={(e) => handleIngredientChange(idx, 'ingredientId', e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            >
                              {inventory.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} {p.brand ? `(${p.brand})` : ''} — Stock: {p.currentQty} {p.unit || ''}
                                </option>
                              ))}
                            </select>
                            {prod && (
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                                <span>Almacén: <strong className="text-slate-600">{prod.currentQty} {prod.unit || 'pza'}</strong></span>
                                {prod.currentQty <= 0 && (
                                  <span className="text-rose-500 font-bold flex items-center gap-1">
                                    <AppIcon name="warning" size={11} className="text-rose-500" />
                                    <span>Agotado</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-500">Porción:</label>
                            <input
                              type="number"
                              step="any"
                              min="0.0001"
                              value={ing.quantity}
                              onChange={(e) => handleIngredientChange(idx, 'quantity', e.target.value)}
                              className="w-24 px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white text-right focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                              placeholder="0.00"
                            />
                          </div>

                          <div className="w-24">
                            <select
                              value={ing.unitMesure}
                              onChange={(e) => handleIngredientChange(idx, 'unitMesure', e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-bold text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            >
                              <option value="g">g (gramos)</option>
                              <option value="kg">kg (kilos)</option>
                              <option value="ml">ml (mililitros)</option>
                              <option value="l">l (litros)</option>
                              <option value="pza">pza (piezas)</option>
                              <option value="oz">oz (onzas)</option>
                              <option value="porcion">porción</option>
                              <option value="cda">cucharada</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeIngredientRow(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Eliminar insumo de la receta"
                            aria-label="Eliminar insumo"
                          >
                            <AppIcon name="delete" size={15} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-60"
                >
                  {saving ? 'Guardando…' : 'Guardar Receta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de autorización de gerencia para eliminar receta */}
      {deletingRecipe && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-rose-50 border-b border-rose-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold">
                  🔒
                </div>
                <div>
                  <h3 className="font-bold text-sm text-rose-950">Autorización Requerida</h3>
                  <p className="text-[11px] text-rose-700">Eliminación protegida de receta</p>
                </div>
              </div>
              <button
                onClick={() => setDeletingRecipe(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmDelete} className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 leading-relaxed">
                <span className="font-bold block mb-0.5">Receta: {deletingRecipe.name}</span>
                Esta acción dará de baja la receta del menú. Por seguridad y trazabilidad histórica de órdenes y ventas, se requieren credenciales válidas de gerente o administrador.
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {deleteError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Usuario Gerente / Admin</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. root o usuario gerente"
                  value={deleteAuth.username}
                  onChange={(e) => setDeleteAuth({ ...deleteAuth, username: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
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
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Motivo de la baja</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Ej. Descontinuado de la carta de temporada"
                  value={deleteAuth.reason}
                  onChange={(e) => setDeleteAuth({ ...deleteAuth, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={() => setDeletingRecipe(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-60"
                >
                  {deleteLoading ? 'Verificando...' : 'Confirmar Baja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal buscador y dosificador de insumos */}
      <RecipeIngredientPickerModal
        isOpen={showPickerModal}
        inventory={inventory}
        onClose={() => setShowPickerModal(false)}
        onAdd={handleAddFromPicker}
      />
    </div>
  );
}
