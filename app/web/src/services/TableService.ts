import { apiFetch } from "@/lib/api";

export const getAllTables = async (includeCompleted = false) => {
  const url = includeCompleted ? "/tables?includeCompleted=true" : "/tables";
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("Error al obtener las mesas");
  return await res.json();
};

export const getTableById = async (id: string) => {
  const res = await apiFetch(`/tables/${id}`);
  if (!res.ok) throw new Error("Error al obtener la mesa");
  return res.json();
};

export interface CreateVirtualTableDto {
  tableType: 'para_llevar' | 'domicilio' | 'telefonico';
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryNotes?: string;
}

export const createVirtualTable = async (dto: CreateVirtualTableDto) => {
  const res = await apiFetch("/tables/virtual", {
    method: "POST",
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "No se pudo crear el pedido virtual");
  }
  return res.json();
};

export const updateTableStatus = async (id: string, status: string) => {
  const res = await apiFetch(`/tables/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "No se pudo actualizar el estado de la mesa");
  }
  return res.json();
};
