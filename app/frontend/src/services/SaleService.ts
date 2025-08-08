export async function getUnpaidSaleByTable(tableId: string) {
  const res = await fetch(`/api/sales/search?table=${tableId}&&status=unpaid`);
  const data = await res.json();
  return data[0]; 
}

export async function getSaleById(saleId: string) {
  const res = await fetch(`/api/sales/search?_id=${saleId}`);
  const data = await res.json();
  return data[0];
}

// En servidor local de Flask
export async function printSale(saleId: string) {
  const saleData = await getSaleById(saleId);

  if (!saleData) throw new Error("Venta no encontrada");

  await fetch("http://localhost:5000/print", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ venta: saleData }),
  });
}

export async function paySale(saleId: string) {
  await fetch(`/api/sales/${saleId}/pay`, {
    method: "PATCH",
  });
}
