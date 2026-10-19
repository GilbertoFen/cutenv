import React from 'react';
import {
  Home,
  Boxes,
  Package,
  BookOpen,
  ChefHat,
  UtensilsCrossed,
  Utensils,
  CookingPot,
  ShoppingBag,
  Layers,
  Receipt,
  ReceiptText,
  ClipboardList,
  LayoutGrid,
  Users,
  User,
  Building2,
  BarChart3,
  PieChart,
  TrendingUp,
  LineChart,
  Settings,
  ShieldCheck,
  Shield,
  Crown,
  Briefcase,
  Search,
  ScanBarcode,
  Barcode,
  Camera,
  QrCode,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Lock,
  Unlock,
  CreditCard,
  Banknote,
  ArrowLeftRight,
  ArrowLeft,
  Download,
  Save,
  RefreshCw,
  X,
  Check,
  Sparkles,
  Zap,
  Coffee,
  Wine,
  Pizza,
  Soup,
  Salad,
  Sandwich,
  Cake,
  Croissant,
  Apple,
  Carrot,
  Egg,
  Milk,
  Wheat,
  Fish,
  Beef,
  Drumstick,
  Flame,
  Droplets,
  Box,
  Snowflake,
  Sun,
  Cookie,
  Calendar,
  Eye,
  Printer,
  FileCode,
  FileText,
  Globe,
  HelpCircle,
  Filter,
  CheckCheck,
  Tag,
  Clock,
  LogOut,
  LucideIcon,
  LucideProps,
} from 'lucide-react';

export type IconName =
  // Navegación y módulos
  | 'home'
  | 'inventory'
  | 'recipes'
  | 'ingredients'
  | 'products'
  | 'categories'
  | 'sales'
  | 'orders'
  | 'tables'
  | 'customers'
  | 'suppliers'
  | 'invoicing'
  | 'reports'
  | 'kpis'
  | 'settings'
  | 'users'
  | 'calendar'
  | 'clock'
  | 'logout'

  // Roles y permisos
  | 'owner'
  | 'manager'
  | 'waiter'
  | 'cook'
  | 'kitchen'
  | 'cashier'
  | 'reception'
  | 'root'
  | 'lock'
  | 'unlock'
  | 'shield'

  // Acciones
  | 'add'
  | 'edit'
  | 'delete'
  | 'save'
  | 'download'
  | 'search'
  | 'scan'
  | 'barcode'
  | 'qrcode'
  | 'camera'
  | 'refresh'
  | 'close'
  | 'check'
  | 'check-double'
  | 'arrow-left'
  | 'filter'
  | 'view'
  | 'print'

  // Estados y alertas
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'sparkles'
  | 'zap'

  // Cocina y preparación
  | 'cooking'
  | 'chef'
  | 'pot'
  | 'flame'
  | 'utensils'
  | 'dish'

  // Pagos y facturación
  | 'cash'
  | 'card'
  | 'transfer'
  | 'receipt'
  | 'receipt-text'
  | 'xml'
  | 'pdf'
  | 'global'
  | 'building'

  // Alimentos e insumos frecuentes
  | 'apple'
  | 'carrot'
  | 'egg'
  | 'milk'
  | 'wheat'
  | 'fish'
  | 'meat'
  | 'chicken'
  | 'coffee'
  | 'wine'
  | 'pizza'
  | 'soup'
  | 'salad'
  | 'sandwich'
  | 'dessert'
  | 'bread'
  | 'oil'
  | 'frozen'
  | 'clean'
  | 'box';

export const ICON_REGISTRY: Record<IconName, LucideIcon> = {
  // Navegación y módulos
  home: Home,
  inventory: Boxes,
  recipes: BookOpen,
  ingredients: Carrot,
  products: ShoppingBag,
  categories: Layers,
  sales: Receipt,
  orders: ClipboardList,
  tables: LayoutGrid,
  customers: Users,
  suppliers: Building2,
  invoicing: ReceiptText,
  reports: BarChart3,
  kpis: TrendingUp,
  settings: Settings,
  users: User,
  calendar: Calendar,
  clock: Clock,
  logout: LogOut,

  // Roles y permisos
  owner: Crown,
  manager: Briefcase,
  waiter: Utensils,
  cook: ChefHat,
  kitchen: CookingPot,
  cashier: Banknote,
  reception: ClipboardList,
  root: ShieldCheck,
  lock: Lock,
  unlock: Unlock,
  shield: Shield,

  // Acciones
  add: Plus,
  edit: Edit2,
  delete: Trash2,
  save: Save,
  download: Download,
  search: Search,
  scan: ScanBarcode,
  barcode: Barcode,
  qrcode: QrCode,
  camera: Camera,
  refresh: RefreshCw,
  close: X,
  check: Check,
  'check-double': CheckCheck,
  'arrow-left': ArrowLeft,
  filter: Filter,
  view: Eye,
  print: Printer,

  // Estados y alertas
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
  sparkles: Sparkles,
  zap: Zap,

  // Cocina y preparación
  cooking: CookingPot,
  chef: ChefHat,
  pot: CookingPot,
  flame: Flame,
  utensils: UtensilsCrossed,
  dish: Utensils,

  // Pagos y facturación
  cash: Banknote,
  card: CreditCard,
  transfer: ArrowLeftRight,
  receipt: Receipt,
  'receipt-text': ReceiptText,
  xml: FileCode,
  pdf: FileText,
  global: Globe,
  building: Building2,

  // Alimentos e insumos frecuentes
  apple: Apple,
  carrot: Carrot,
  egg: Egg,
  milk: Milk,
  wheat: Wheat,
  fish: Fish,
  meat: Beef,
  chicken: Drumstick,
  coffee: Coffee,
  wine: Wine,
  pizza: Pizza,
  soup: Soup,
  salad: Salad,
  sandwich: Sandwich,
  dessert: Cake,
  bread: Croissant,
  oil: Droplets,
  frozen: Snowflake,
  clean: Sparkles,
  box: Box,
};

export function getIcon(name: IconName): LucideIcon {
  return ICON_REGISTRY[name] || Package;
}
