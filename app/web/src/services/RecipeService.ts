import type { Recipe } from "@/types";
import { getApiUrl } from "@/lib/config";

export const getAllRecipes = async (): Promise<Recipe[]> => {
  const res = await fetch(getApiUrl("/recipes"));
  if (!res.ok) throw new Error("Error al cargar las recetas");
  return res.json();
};

export const getRecipeById = async (id: string): Promise<Recipe> => {
  const res = await fetch(getApiUrl(`/recipes/${id}`));
  if (!res.ok) throw new Error("Error al obtener la receta");
  return res.json();
};

export const createRecipe = async (data: {
  name: string;
  price: number;
  category?: string;
  steps?: string;
  imageUrl?: string;
  ingredients: { ingredientId: string; quantity: number; unitMesure: string }[];
}): Promise<any> => {
  const res = await fetch(getApiUrl("/recipes"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Error al crear la receta");
  }
  return res.json();
};

export const updateRecipe = async (id: string, data: Partial<{
  name: string;
  price: number;
  category?: string;
  steps?: string;
  imageUrl?: string;
  ingredients: { ingredientId: string; quantity: number; unit: string }[];
}>): Promise<any> => {
  const res = await fetch(getApiUrl(`/recipes/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Error al actualizar la receta");
  }
  return res.json();
};

export const deleteRecipe = async (
  id: string,
  authData: { username: string; password: string; reason: string }
): Promise<any> => {
  const res = await fetch(getApiUrl(`/recipes/${id}`), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(authData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Error al eliminar la receta. Verifique las credenciales.");
  }
  return res.json();
};

