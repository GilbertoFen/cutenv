import { apiFetch } from "@/lib/api";

export const getAllTables = async () => {
  const res = await apiFetch("/tables");
  if (!res.ok) throw new Error("Error al obtener las mesas");
  return await res.json();
};

export const getTableById = async (id: string) => {
  const res = await apiFetch(`/tables/${id}`);
  if (!res.ok) throw new Error("Error al obtener la mesa");
  return res.json();
};

export const updateTableStatus = async (id: string, status: string) => {
  const res = await apiFetch(`/tables/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("No se pudo actualizar el estado de la mesa");
  return res.json();
};
