import type {Recipe} from '../types/index'
export const getAllRecipes = async () : Promise <Recipe[]>=> {
  const res = await fetch('/api/recipes');
  if (!res.ok) throw new Error("Error al cargar el menú");
  return res.json();
};
