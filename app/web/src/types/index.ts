export interface Recipe {
  id: string;
  name: string;
  quantity: number;
  imageUrl: string;
  price: number;
  category: string;
}

export interface UpdateOrderItem {
  recipe: string;
  quantity: number;
  notes?: string;
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
    itemId?: string;
    name: string;
    quantity: number;
    imageUrl?: string;
    category?: string;
    notes?: string;
    status?: 'preparing' | 'ready' | 'delivered' | 'cancelled';
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
  notes?: string;
}

export interface SaleItem {
  recipe: string;
  quantity: number;
  price: number;
}

export interface SaleOrder {
  orderType?: 'local' | 'para llevar' | 'evento' | 'domicilio';
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
  orderType?: 'local' | 'para llevar' | 'evento' | 'domicilio';
  paymentMethod?: 'efectivo' | 'tarjeta' | 'transferencia';
  status: string;
  cancelReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  isFacturada?: boolean;
  invoiceId?: string;
}

export type UserRole = 'owner' | 'manager' | 'worker';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  status?: 'active' | 'inactive';
  createdAt?: string;
}

export type PromotionType = 'two_for_one' | 'percentage_discount' | 'fixed_discount';

export interface Promotion {
  id: string;
  _id?: string;
  name: string;
  code?: string;
  type: PromotionType;
  daysOfWeek: number[]; // 0=Sunday, 1=Monday, 2=Tuesday...
  startDate?: string;
  endDate?: string;
  scope: 'all' | 'categories' | 'recipes';
  targetCategories: string[];
  targetRecipes: string[];
  discountValue: number;
  minOrderAmount?: number;
  description?: string;
  isActive: boolean;
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
  orderType?: 'local' | 'para llevar' | 'evento' | 'domicilio';
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
  status: 'programada' | 'sentada' | 'cancelada' | 'no_asistencia' | 'expirada';
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
  imageUrl?: string;
}

export interface BarcodeLookupProduct {
  id?: string;
  barCode: string;
  name: string;
  brand: string;
  price?: number;
  stock?: number;
  quantity: number;
  unitMesure: string;
  category: string;
  description: string;
  imageUrl?: string;
  servingSize?: string;
  nutriments?: {
    energyKcal?: number;
    proteins?: number;
    fat?: number;
    sugars?: number;
    sodium?: number;
  };
}

export interface BarcodeLookupResponse {
  found: boolean;
  source: 'local' | 'openfoodfacts' | 'none';
  code: string;
  product?: BarcodeLookupProduct;
  data?: BarcodeLookupProduct;
  message?: string;
}

export interface FiscalConfigData {
  configured: boolean;
  id?: string;
  restaurantId: string;
  rfc: string;
  legalName: string;
  taxRegime: string;
  postalCode: string;
  pacProvider: 'facturama' | 'finkok' | 'mock_sandbox';
  pacUsername?: string;
  pacPassword?: string;
  hasPassword?: boolean;
  environment: 'sandbox' | 'production';
  defaultClaveProdServ: string;
  defaultClaveUnidad: string;
  defaultIvaRate: number;
  series: string;
  nextFolio: number;
  isValidated: boolean;
  certificateNumber?: string;
}

export interface FiscalCustomerData {
  _id?: string;
  id?: string;
  rfc: string;
  legalName: string;
  postalCode: string;
  taxRegime: string;
  cfdiUse: string;
  email?: string;
  phone?: string;
}

export interface InvoiceItemData {
  noIdentificacion?: string;
  claveProdServ: string;
  claveUnidad: string;
  unidad: string;
  cantidad: number;
  descripcion: string;
  valorUnitario: number;
  importe: number;
  objetoImp: string;
  baseIva: number;
  tasaIva: number;
  importeIva: number;
}

export interface InvoiceData {
  _id: string;
  id?: string;
  restaurantId: string;
  type: 'individual' | 'global';
  saleId?: string | { folio?: string; totalAmount?: number; paymentMethod?: string; createdAt?: string };
  salesIds?: string[];
  serie: string;
  folio: string;
  uuid: string;
  status: 'draft' | 'stamped' | 'cancelled' | 'pending_cancellation' | 'error';
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  paymentMethod: string;
  paymentType: 'PUE' | 'PPD';
  emisor: {
    rfc: string;
    legalName: string;
    taxRegime: string;
    postalCode: string;
  };
  receptor: {
    rfc: string;
    legalName: string;
    taxRegime: string;
    postalCode: string;
    cfdiUse: string;
    email?: string;
  };
  items: InvoiceItemData[];
  globalPeriodicity?: {
    periodicity: '01' | '02' | '03' | '04';
    months: string;
    year: number;
  };
  pacProvider: string;
  stampedAt: string;
  cancellationReason?: '01' | '02' | '03' | '04';
  cancellationReplacementUuid?: string;
  cancelledAt?: string;
}

export interface GlobalInvoicePreview {
  eligibleCount: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  tickets: Array<{
    id: string;
    folio: string;
    date: string;
    total: number;
    subtotal: number;
    iva: number;
    paymentMethod: string;
  }>;
}

export interface SatCatalogItem {
  code: string;
  description: string;
}

export interface SatCatalogsData {
  regimenes: SatCatalogItem[];
  usosCfdi: SatCatalogItem[];
  formasPago: SatCatalogItem[];
  metodosPago: SatCatalogItem[];
  periodicidades: SatCatalogItem[];
  meses: SatCatalogItem[];
  motivosCancelacion: SatCatalogItem[];
}


