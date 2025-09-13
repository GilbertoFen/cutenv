import type { Table } from "../../types";
import type { Reservation } from "../../types";
export type Props = {
  table?: Table | null;
  tables: Table[];
  onClose: () => void;
  onCreated: () => void;
};


export type CardProps = {
  table: Table;
  onChanged: () => void;
  onReserve: (table: Table) => void;
  onViewReservation: (reservation: Reservation, table: Table) => void;
  resvVersion?: number;
};


export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidthClass?: string; // e.g. "max-w-6xl"
};

export type TableStatusLoad = {
  tableId: string;
  number: number;
  prevStatus: 'disponible' | 'ocupada' | 'reservada';
  status: 'disponible' | 'ocupada' | 'reservada';
  at: number;
};

 
export type Mode = "hoy" | "proximas";
export type StatusFilter = "todas" | "programada" | "sentada";
