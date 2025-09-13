export type Props = { tableId: string; onClose: () => void; onPaid: () => void; };
export type OrderType = 'local' | 'para llevar' | 'evento' | 'domicilio';
export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';
export type TableStatus = "disponible" | "ocupada" | "reservada";
export type TableStatusLoad = {
  tableId: string;
  number: number;
  prevStatus: TableStatus;
  status: TableStatus;
  at: number;
};