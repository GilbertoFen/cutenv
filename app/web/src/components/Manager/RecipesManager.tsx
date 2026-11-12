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
  station?: 'fria' | 'caliente' | 'ninguna';
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

  // Edición explícita de insumo en receta
  const [editingIngredientIdx, setEditingIngredientIdx] = useState<number | null>(null);
  const [editQty, setEditQty] = useState<string>('1');
  const [editUnit, setEditUnit] = useState<string>('g');

  const getIngredientCost = (ing: { ingredientId: string; quantity: number; unitMesure: string }) => {
    const prod = inventory.find((p) => p.id === ing.ingredientId);
    if (!prod) return { cost: 0, hasCost: false, unitCost: 0, prodName: 'Insumo', prod: undefined };

    const unitCost =
      prod.unitCost ??
      (prod.acquisitionCost && (prod.packageContent || 1) > 0
        ? prod.acquisitionCost / (prod.packageContent || 1)
        : 0);

    if (!unitCost || unitCost <= 0) {
      return { cost: 0, hasCost: false, unitCost: 0, prodName: prod.name, prod };
    }

    const prodUnit = (prod.unit || 'pza').toLowerCase().trim();
    const ingUnit = (ing.unitMesure || prodUnit).toLowerCase().trim();
    const qty = Number(ing.quantity) || 0;

    let factor = 1;
    if (prodUnit === ingUnit) {
      factor = 1;
    } else if (
      (prodUnit === 'kg' || prodUnit === 'kilo' || prodUnit === 'kilogramo') &&
      (ingUnit === 'g' || ingUnit === 'gramo' || ingUnit === 'gramos')
    ) {
      factor = 1 / 1000;
    } else if (
      (prodUnit === 'g' || prodUnit === 'gramo' || prodUnit === 'gramos') &&
      (ingUnit === 'kg' || ingUnit === 'kilo' || ingUnit === 'kilogramo')
    ) {
      factor = 1000;
    } else if (
      (prodUnit === 'l' || prodUnit === 'lt' || prodUnit === 'litro' || prodUnit === 'litros') &&
      (ingUnit === 'ml' || ingUnit === 'mililitro' || ingUnit === 'mililitros')
    ) {
      factor = 1 / 1000;
    } else if (
      (prodUnit === 'ml' || prodUnit === 'mililitro' || prodUnit === 'mililitros') &&
      (ingUnit === 'l' || ingUnit === 'lt' || ingUnit === 'litro' || ingUnit === 'litros')
    ) {
      factor = 1000;
    } else if ((prodUnit === 'kg' || prodUnit === 'kilo') && (ingUnit === 'oz' || ingUnit === 'onza')) {
      factor = 0.0283495;
    } else if ((prodUnit === 'l' || prodUnit === 'lt') && (ingUnit === 'oz' || ingUnit === 'onza')) {
      factor = 0.0295735;
    }

    const cost = qty * factor * unitCost;
    return { cost, hasCost: true, unitCost, prodName: prod.name, prod };
  };

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: 'Platos Fuertes',
    station: 'caliente' as 'fria' | 'caliente' | 'ninguna',
    steps: '',
    imageUrl: '',
    ingredients: [] as { ingredientId: string; quantity: number; unitMesure: string }[],
  });

  const recipeCostInfo = React.useMemo(() => {
    let totalCost = 0;
    let hasMissingCosts = false;

    for (const ing of formData.ingredients) {
      const info = getIngredientCost(ing);
      if (info.hasCost) {
        totalCost += info.cost;
      } else {
        hasMissingCosts = true;
      }
    }

    return { totalCost, hasMissingCosts };
  }, [formData.ingredients, inventory]);

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
      station: 'caliente',
      steps: '',
      imageUrl: '',
      ingredients: [],
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (r: RecipeItem) => {
    setEditingRecipe(r);
    const defaultStation = r.station || (r.category?.toLowerCase() === 'bebidas' ? 'ninguna' : 'caliente');
    setFormData({
      name: r.name,
      price: String(r.price ?? 0),
      category: r.category || 'Platos Fuertes',
      station: defaultStation,
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
        station: formData.station,
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
          station: payload.station,
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
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 uppercase">
                        {r.category || 'General'}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${r.station === 'fria'
                        ? 'bg-sky-100 text-sky-800 border border-sky-200'
                        : r.station === 'caliente'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                        {r.station === 'fria' && (
                          <>
                            <AppIcon name="frozen" size={12} />
                            <span>Cocina Fría</span>
                          </>
                        )}
                        {r.station === 'caliente' && (
                          <>
                            <AppIcon name="flame" size={12} />
                            <span>Cocina Caliente</span>
                          </>
                        )}
                        {(!r.station || r.station === 'ninguna') && (
                          <>
                            <AppIcon name="coffee" size={12} />
                            <span>Sin estación</span>
                          </>
                        )}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 truncate">{r.name}</h3>
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
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        category: newCat,
                        station: newCat.toLowerCase() === 'bebidas' ? 'ninguna' : (prev.station === 'ninguna' ? 'caliente' : prev.station),
                      }));
                    }}
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
                    Estación de Cocina <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, station: 'fria' })}
                      className={`py-2 px-2 rounded-lg border text-[11px] font-black transition flex items-center justify-center gap-1 ${formData.station === 'fria'
                        ? 'bg-sky-600 text-white border-sky-700 shadow-sm ring-2 ring-sky-300'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      title="Barra fría (sushi, sashimi, ensaladas)"
                    >
                      <AppIcon name="frozen" size={13} />
                      <span>Fría</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, station: 'caliente' })}
                      className={`py-2 px-2 rounded-lg border text-[11px] font-black transition flex items-center justify-center gap-1 ${formData.station === 'caliente'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-sm ring-2 ring-amber-300'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      title="Cocina caliente (ramen, wok, tempura)"
                    >
                      <AppIcon name="flame" size={13} />
                      <span>Caliente</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, station: 'ninguna' })}
                      className={`py-2 px-2 rounded-lg border text-[11px] font-black transition flex items-center justify-center gap-1 ${formData.station === 'ninguna'
                        ? 'bg-slate-700 text-white border-slate-800 shadow-sm ring-2 ring-slate-400'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      title="Sin preparación en cocina (bebidas, licores, productos directos)"
                    >
                      <AppIcon name="coffee" size={13} />
                      <span>Ninguna</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pasos / Instrucciones de Preparación <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.steps}
                  onChange={(e) => setFormData({ ...formData, steps: e.target.value })}
                  placeholder="Detalles para el cocinero (opcional)..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Costo estimado de preparación */}
              <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wide">
                      Costo Estimado de Preparación
                    </span>
                    <p className="text-lg font-black text-indigo-950">
                      {currency(recipeCostInfo.totalCost)}{' '}
                      <span className="text-xs font-normal text-indigo-700">MXN</span>
                    </p>
                  </div>
                  {Number(formData.price) > 0 && recipeCostInfo.totalCost > 0 && (
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        Margen Bruto Estimado
                      </span>
                      <p
                        className={`text-sm font-black ${Number(formData.price) >= recipeCostInfo.totalCost
                          ? 'text-emerald-700'
                          : 'text-rose-600'
                          }`}
                      >
                        {currency(Number(formData.price) - recipeCostInfo.totalCost)} (
                        {Math.round(
                          ((Number(formData.price) - recipeCostInfo.totalCost) /
                            Number(formData.price)) *
                          100
                        )}
                        %)
                      </p>
                    </div>
                  )}
                </div>

                {recipeCostInfo.hasMissingCosts && (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                    <AppIcon name="warning" size={13} className="text-amber-600 shrink-0" />
                    <span>
                      Uno o más insumos no tienen costo unitario en almacén. El costo calculado es parcial.
                    </span>
                  </div>
                )}
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
                      const costInfo = getIngredientCost(ing);
                      const prod = costInfo.prod || inventory.find((p) => p.id === ing.ingredientId);
                      const isEditing = editingIngredientIdx === idx;

                      if (isEditing) {
                        return (
                          <div
                            key={idx}
                            className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-xs text-indigo-950">
                                Modificar dosis de: <span className="font-bold">{prod?.name || 'Insumo'}</span>
                              </div>
                              <span className="text-[10px] text-indigo-700">
                                Stock actual: {prod?.currentQty ?? 0} {prod?.unit || 'pza'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                                  Cantidad / Porción
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  min="0.0001"
                                  value={editQty}
                                  onChange={(e) => setEditQty(e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                  placeholder="Ej. 150"
                                />
                              </div>
                              <div className="w-28">
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                                  Unidad
                                </label>
                                <select
                                  value={editUnit}
                                  onChange={(e) => setEditUnit(e.target.value)}
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
                              <div className="flex items-end gap-1 pt-4">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const num = parseFloat(editQty);
                                    if (Number.isFinite(num) && num > 0) {
                                      handleIngredientChange(idx, 'quantity', num);
                                      handleIngredientChange(idx, 'unitMesure', editUnit);
                                      setEditingIngredientIdx(null);
                                    }
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
                                  title="Guardar cambios de porción"
                                >
                                  <AppIcon name="check" size={13} />
                                  <span>Guardar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingIngredientIdx(null)}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 transition"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 truncate">
                                {prod?.name || 'Insumo'}
                              </span>
                              {prod?.brand && (
                                <span className="text-[10px] text-slate-400 truncate">({prod.brand})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-500">
                              <span>
                                Porción:{' '}
                                <strong className="text-slate-800">
                                  {ing.quantity} {ing.unitMesure || prod?.unit || 'pza'}
                                </strong>
                              </span>
                              <span className="text-slate-300">•</span>
                              <span>
                                Stock:{' '}
                                <strong
                                  className={
                                    prod && prod.currentQty <= 0
                                      ? 'text-rose-600'
                                      : 'text-slate-600'
                                  }
                                >
                                  {prod?.currentQty ?? 0} {prod?.unit || 'pza'}
                                </strong>
                              </span>
                              {costInfo.hasCost ? (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-emerald-700 font-semibold">
                                    Costo: {currency(costInfo.cost)}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-amber-600 text-[10px]">Sin costo reg.</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingIngredientIdx(idx);
                                setEditQty(String(ing.quantity));
                                setEditUnit(ing.unitMesure || prod?.unit || 'pza');
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              title="Editar porción del insumo"
                              aria-label="Editar insumo"
                            >
                              <AppIcon name="edit" size={15} />
                            </button>
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
                  <AppIcon name="shield" size={18} className="text-white" />
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
