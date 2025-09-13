export interface Recipe {
  id: string;
  name: string;
  quantity: number;
  imageUrl: string;
  price: number;
  category:string;
}

export interface UpdateOrderItem{
  recipe: string;
  quantity: number; 
  notes? : string;
}

export interface Order {
  id: string;
  status: string;
  total: number;
  table?: string;
  notes?: string;
  tableNumber?: number;
  recipes: {
    id?: string;
    name: string;
    quantity: number;
    imageUrl?: string;
    category?: string;
    notes?: string;
  }[];
}


export interface Table {
  id: string;
  number: number;
  status: 'disponible' | 'ocupada' | 'reservada';
  capacity: number;
}

export interface AddOrderModalProps {
  tableId: string;
  onClose: () => void;
  onRefresh: () => void;
}

export interface SelectedItem {
  recipe: Recipe;
  quantity: number;
  notes?:string;
}


export interface SaleItem {
  recipe: string;
  quantity: number;
  price: number;
}

export interface SaleOrder {
  orderType?:'local' | 'para llevar' | 'evento' | 'domicilio';
  total: number;
  items: SaleItem[];
  notes?: string;
}
export interface SaleData {
  id: string;
  folio: string;
  table: { number?: number } | string;
  totalAmount: number;
  date?: string;
  orders: SaleOrder[];
  orderType?:'local' | 'para llevar' | 'evento' | 'domicilio';
  paymentMethod?: 'efectivo' | 'tarjeta' | 'transferencia';
  status: string;
}

export type BackendSale = {
  id?: string;
  _id?: string;
  folio?: string;
  totalAmount?: number | string;
  orders?: {
    total?: number | string;
    items?: { recipe?: string; quantity?: number | string; price?: number | string }[];
  }[];
  status?: string;
  date?: string;
  table?: { number?: number } | string; 
   orderType?:'local' | 'para llevar' | 'evento' | 'domicilio';
  paymentMethod?: 'efectivo' | 'tarjeta' | 'transferencia';
};

export interface Props {
  tableId: string;
  onClose: () => void;
  onPaid: () => void;
}

export interface SaleProps {
  order: Order;
  onClose: () => void;
  onUpdate: () => void;
}

export interface Reservation {
  id: string;
  table?: Table | string | null;
  customerName?: string;
  phone?: string;
  partySize?: number;
  startTime: string;  
  endTime?: string;  
  status: 'programada' | 'sentada' | 'cancelada' | 'no_asistencia'| 'expirada';
  notes?: string;
}


export type ReservationInfoForTable = {
  reservation: Reservation | null;
  inLeadWindow: boolean;
  minutesToStart: number | null;
};

export interface InventoryItem {
  id: string;
  name: string;
  brand?: string;
  price?: number;
  sku?: string;        
  category?: string;
  unit?: string;       
  description?: string;
  currentQty: number;  
  packageQty?: number; 
  lastUpdate?: string; 
  minQty?: number;    
}
