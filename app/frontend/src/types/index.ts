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
}

export interface SaleData {
  id: string;
  folio: string;
  totalAmount: number;
  orders: {
    total: number;
    items: {
      recipe: string;
      quantity: number;
      price: number;
    }[];
  }[];
}

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