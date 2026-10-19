import { getApiUrl } from "@/lib/config";

export const getAllTables = async () => {
  const res = await fetch(getApiUrl("/tables"));
  if (!res.ok) throw new Error("Error al obtener las mesas");
  return await res.json();
};

export const getTableById = async (id: string) => {
  const res = await fetch(getApiUrl(`/tables/${id}`));
  if (!res.ok) throw new Error("Error al obtener la mesa");
  return res.json();
};

export const updateTableStatus = async (id: string, status: string) => {
  const res = await fetch(getApiUrl(`/tables/${id}/status`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("No se pudo actualizar el estado de la mesa");
  return res.json();
};
