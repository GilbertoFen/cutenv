export interface Recipe {
  id: string;
  name: string;
  quantity: number;
  imageUrl: string;
  price: number;
  category: string;
  station?: 'fria' | 'caliente' | 'ninguna';
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
  tableId?: string;
  recipes: {
    id?: string;
    itemId?: string;
    name: string;
    description?: string;
    quantity: number;
    imageUrl?: string;
    category?: string;
    notes?: string;
    station?: 'fria' | 'caliente' | 'ninguna';
    status?: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
    callWaiter?: {
      requested: boolean;
      reason: 'ready' | 'unavailable' | 'issue' | 'other';
      message?: string;
      requestedAt?: string | Date;
      resolved?: boolean;
    };
  }[];
}

export interface Table {
  id: string;
  number: number;
  status: 'disponible' | 'ocupada' | 'reservada';
  capacity: number;
  occupiedAt?: string;
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
  recipeId?: string;
  category?: string;
  quantity: number;
  price: number;
  notes?: string;
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
  invoiceStatus?: 'stamped' | 'cancelled' | 'pending_cancellation';
  discountAmount?: number;
  promotionApplied?: {
    promotionId: string;
    name: string;
    code?: string;
    type: string;
    discountAmount: number;
    baseAmount?: number;
    rule?: string;
    benefitedItems?: string[];
    appliedAt?: string;
  };
}

export type UserRole = 'owner' | 'manager' | 'worker';
export type OperationalRole = 'mesero' | 'cocinero' | 'cajero' | 'recepcionista' | 'general';

export interface DaySchedule {
  dayOfWeek: number;
  dayName: string;
  enabled: boolean;
  openTime: string;
  closeTime: string;
}

export interface IndividualSchedule {
  enabled: boolean;
  weeklySchedule: DaySchedule[];
}

export interface User {
  id: string;
  username: string;
  email?: string;
  name: string;
  lastName?: string;
  role: UserRole;
  operationalRole?: OperationalRole;
  status?: 'active' | 'inactive';
  restaurantId?: string;
  restaurant?: {
    id: string;
    name: string;
    code: string;
  };
  individualSchedule?: IndividualSchedule;
  lastActivity?: string;
  createdAt?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  timezone: string;
  address?: string;
  phone?: string;
  createdBy?: string;
  createdAt?: string;
  userCount?: number;
  workerCount?: number;
  owner?: {
    id: string;
    name: string;
    email: string;
    status: string;
    lastActivity?: string;
  } | null;
  manager?: {
    id: string;
    name: string;
    email: string;
    status: string;
    lastActivity?: string;
  } | null;
  schedule?: DaySchedule[];
}

export interface EmployeeItem {
  id: string;
  name: string;
  lastName?: string;
  fullName: string;
  email: string;
  username: string;
  role: UserRole;
  operationalRole?: OperationalRole;
  status: 'active' | 'inactive';
  connectionStatus: 'online' | 'offline' | 'outside_schedule' | 'inactive';
  isOnline: boolean;
  scheduleRestricted?: boolean;
  invitationToken?: string;
  invitationUsed?: boolean;
  individualSchedule?: IndividualSchedule;
  lastActivity?: string;
  createdAt?: string;
}

export interface EmployeeStats {
  total: number;
  active: number;
  online: number;
  offline: number;
  restricted: number;
}

export interface AuditLogItem {
  id: string;
  restaurantId?: string;
  userId: string;
  userName: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

export type PromotionType =
  | 'two_for_one'
  | 'percentage_discount'
  | 'fixed_discount'
  | 'birthday'
  | 'package_gift';

export interface Promotion {
  id: string;
  _id?: string;
  name: string;
  code?: string;
  type: PromotionType;
  daysOfWeek: number[]; // 0=Sunday, 1=Monday, 2=Tuesday...
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  scope: 'all' | 'categories' | 'recipes';
  targetCategories: string[];
  applicableCategories?: string[];
  targetRecipes: (string | Recipe)[];
  excludedRecipes?: (string | Recipe)[];
  buyQuantity?: number;
  getQuantity?: number;
  triggerRecipeId?: string | Recipe;
  triggerQuantity?: number;
  rewardRecipeId?: string | Recipe;
  rewardQuantity?: number;
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  maxApplicationsPerOrder?: number;
  applyMode?: 'mix_and_match' | 'same_product';
  requiresAuth?: boolean;
  isCumulative?: boolean;
  description?: string;
  isActive: boolean;
}

export type BackendSale = {
  id?: string;
  _id?: string;
  folio?: string;
  totalAmount?: number | string;
  discountAmount?: number;
  promotionApplied?: any;
  orders?: {
    total?: number | string;
    items?: { recipe?: string; recipeId?: string; category?: string; quantity?: number | string; price?: number | string; notes?: string }[];
  }[];
  status?: string;
  date?: string;
  table?: { number?: number } | string;
  orderType?: 'local' | 'para llevar' | 'evento' | 'domicilio';
  paymentMethod?: 'efectivo' | 'tarjeta' | 'transferencia';
  isFacturada?: boolean;
  invoiceId?: string;
  invoiceStatus?: 'stamped' | 'cancelled' | 'pending_cancellation';
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
  acquisitionCost?: number;
  unitCost?: number;
  isGeneric?: boolean;
  returnableOnCancel?: boolean;
  sku?: string;
  category?: string;
  unit?: string;
  description?: string;
  currentQty: number;
  packageQty?: number;
  packageContent?: number;
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
  unitCost?: number;
  acquisitionCost?: number;
  isGeneric?: boolean;
  returnableOnCancel?: boolean;
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
  emailSentAt?: string;
  emailTo?: string;
  emailStatus?: 'sent' | 'pending' | 'failed';
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


