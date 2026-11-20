export type TicketRequestedLoad = {
    saleId: string;
    tableId?: string;
    tableNumber?: number;
    requestedAt?: number;
};
export type TicketPrintedLoad = {
    saleId: string
};

export type TableStatusChangeLoad = {
  tableId: string;
  number: number;
  prevStatus: 'disponible' | 'ocupada' | 'reservada' | 'completada';
  status: 'disponible' | 'ocupada' | 'reservada' | 'completada';
  at: number;
  isVirtual?: boolean;
  virtualCode?: string;
  tableType?: string;
}

export type SalePaidLoad = {
    saleId: string
};

export type KitchenOrderLoad = {
    id: string;
    tableNumber?: number;
    status: string;
    total: number;
    notes?: string;
    recipes: {
        id?: string;
        name: string;
        quantity: number;
        imageUrl?: string
    }[];
};

