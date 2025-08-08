import { useEffect, useState } from "react";
import type { SaleData } from "../../types";
import type { Props } from "../../types";
import { getUnpaidSaleByTable, printSale, paySale } from "../../services/SaleService";
export default function ChargeModal({ tableId, onClose, onPaid }: Props) {
  const [sale, setSale] = useState<SaleData | null>(null);
  const [printed, setPrinted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    getUnpaidSaleByTable(tableId).then(setSale)
  }, [tableId]);

  const print = async () => {
    if (!sale?.id) return;

    try {
    await printSale(sale.id)
     setPrinted(true);
    } catch (error) {
      console.error("Error al imprimir el ticket:", error);
    }
  };

  const confirmPayment = async () => {
    if (!sale) return;

    try {
      await paySale(sale.id);

      onPaid();
    } catch (err) {
      console.error("Error al pagar la cuenta:", err);
      alert("Hubo un error al pagar la cuenta. Intenta nuevamente.");
    }
  };

  if (!sale) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
      <div className="bg-white text-black p-4 rounded w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">Resumen de cuenta</h2>
          <button onClick={onClose} className="text-xl font-bold">
            &times;
          </button>
        </div>

        <p>
          <strong>Folio:</strong> {sale.folio}
        </p>

        <ul className="my-2 space-y-2">
          {Object.entries(
            sale.orders
              .flatMap((order) => order.items)
              .reduce(
                (acc, item) => {
                  const name = item.recipe;
                  if (!acc[name]) {
                    acc[name] = { quantity: 0, price: item.price };
                  }
                  acc[name].quantity += item.quantity;
                  return acc;
                },
                {} as Record<string, { quantity: number; price: number }>
              )
          ).map(([name, data], index) => (
            <li key={index}>
              {data.quantity} x {name} $
              {(data.price * data.quantity).toFixed(2)}
            </li>
          ))}
        </ul>

        <p className="text-right font-bold text-lg">
          Total: ${sale.totalAmount.toFixed(2)}
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={print}
            className="bg-blue-600 text-white px-4 py-1 rounded"
          >
            Imprimir ticket
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!printed}
            className={`px-4 py-1 rounded ${printed ? "bg-green-600 text-white" : "bg-gray-400 text-gray-700 cursor-not-allowed"}`}
          >
            Pagar cuenta
          </button>
        </div>

        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white text-black p-4 rounded shadow max-w-sm w-full">
              <h3 className="text-lg font-bold mb-2">¿Confirmar pago?</h3>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-3 py-1 bg-gray-400 rounded"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmPayment}
                  className="px-3 py-1 bg-green-600 text-white rounded"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
