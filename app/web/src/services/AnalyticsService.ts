import { getApiUrl } from "@/lib/config";
import { apiFetch } from "@/lib/api";

export interface AnalyticsQueryParams {
  period?: 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'custom';
  startDate?: string;
  endDate?: string;
  sortBy?: 'units' | 'revenue';
  orderType?: string;
  paymentMethod?: string;
}

export interface KpiComparison {
  hasPreviousBase: boolean;
  percentageChangeRevenue: number | null;
  percentageChangeOrders: number | null;
  percentageChangeUnits: number | null;
}

export interface PeriodKpiData {
  netSales: number;
  grossSales: number;
  totalDiscounts: number;
  salesCount: number;
  averageTicket: number | null;
  unitsSold: number;
  pendingSalesAmount: number;
  pendingSalesCount: number;
  cancelledSalesAmount: number;
  cancelledSalesCount: number;
}

export interface HourlySlot {
  hour: number;
  label: string;
  revenue: number;
  averageRevenuePerHour: number;
  salesCount: number;
  unitsSold: number;
}

export interface DayOfWeekData {
  dow: number;
  dayName: string;
  shortName: string;
  totalRevenue: number;
  salesCount: number;
  occurrences: number;
  averageRevenue: number;
  averageTickets: number;
}

export interface DailyTrendPoint {
  date: string;
  revenue: number;
  salesCount: number;
  unitsSold: number;
  averageTicket: number | null;
}

export interface ProductRankingItem {
  recipeId: string;
  name: string;
  category: string;
  price: number;
  unitsSold: number;
  revenue: number;
  unitsSharePercentage: number;
  revenueSharePercentage: number;
}

export interface PromotionReportItem {
  id: string;
  name: string;
  code: string;
  type: string;
  isActive: boolean;
  discountValue: number;
  timesApplied: number;
  totalDiscount: number;
  associatedNetRevenue: number;
}

export interface IngredientConsumptionItem {
  productId: string;
  productName: string;
  theoreticalConsumption: number;
  unit: string;
  currentStock: number;
  stockStatus: 'Agotado' | 'Bajo stock' | 'Suficiente';
  estimatedCostOfConsumption: number;
}

export interface OperationalDistributionItem {
  type?: string;
  method?: string;
  revenue: number;
  ticketsCount: number;
  percentage: number;
}

export interface AnalyticsDashboardResponse {
  overview: {
    period: string;
    periodLabel: string;
    dateRange: { start: string; end: string; daysCount: number };
    comparisonDateRange: { start: string; end: string };
    current: PeriodKpiData;
    previous: PeriodKpiData;
    comparison: KpiComparison;
  };
  hourlyAndDaily: {
    periodLabel: string;
    daysCount: number;
    hourly: {
      data: HourlySlot[];
      peaks: {
        revenue: { hour: number; label: string; revenue: number };
        tickets: { hour: number; label: string; salesCount: number };
        units: { hour: number; label: string; unitsSold: number };
      };
    };
    dayOfWeek: DayOfWeekData[];
    dailyTrend: DailyTrendPoint[];
  };
  topProducts: {
    periodLabel: string;
    sortBy: 'units' | 'revenue';
    summary: {
      totalUnitsSold: number;
      totalRevenue: number;
      distinctRecipesSold: number;
      zeroSalesCount: number;
    };
    topProducts: ProductRankingItem[];
    lowRotationProducts: ProductRankingItem[];
    zeroSalesProducts: Array<{
      recipeId: string;
      name: string;
      category: string;
      price: number;
      unitsSold: number;
      revenue: number;
    }>;
  };
  promotions: {
    periodLabel: string;
    summary: {
      totalDiscountsGranted: number;
      totalPromotionalRevenue: number;
      totalTimesApplied: number;
    };
    promotions: PromotionReportItem[];
    commercialNote: string;
  };
  inventory: {
    periodLabel: string;
    ingredientsConsumption: IngredientConsumptionItem[];
    note: string;
  };
  distributions: {
    periodLabel: string;
    totalRevenue: number;
    totalTickets: number;
    byOrderType: OperationalDistributionItem[];
    byPaymentMethod: OperationalDistributionItem[];
  };
}

export async function getAnalyticsDashboard(
  params: AnalyticsQueryParams = {}
): Promise<AnalyticsDashboardResponse> {
  const query = new URLSearchParams();
  if (params.period) query.set('period', params.period);
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.orderType) query.set('orderType', params.orderType);
  if (params.paymentMethod) query.set('paymentMethod', params.paymentMethod);

  const res = await apiFetch(`/analytics/dashboard?${query.toString()}`);
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Error al obtener analíticas de ventas: ${res.status} ${errorText}`);
  }
  return res.json();
}
