export const getAllTables = async () => {
  const res = await fetch('/api/tables');
  if (!res.ok) throw new Error('Error al obtener las mesas');
  //console.log(res.json());
  return await res.json();
};

export const getTableById = async (id: string) => {
  const res = await fetch(`/api/tables/${id}`);
  return res.json();
};

export const updateTableStatus = async (id: string, status: string) => {
  const res = await fetch(`/api/tables/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('No se pudo actualizar el estado de la mesa');
  return res.json();
};