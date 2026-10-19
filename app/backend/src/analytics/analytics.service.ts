import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sale, SaleDocument } from '../schemasMongo/sale.schema';
import { Order, OrderDocument } from '../schemasMongo/order.schema';
import { Recipe, RecipeDocument } from '../schemasMongo/recipe.schema';
import { Product } from '../schemasMongo/product.schema';
import { Promotion } from '../schemasMongo/promotion.schema';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

export interface DateRange {
  start: Date;
  end: Date;
  periodLabel: string;
  prevStart: Date;
  prevEnd: Date;
  daysCount: number;
}

@Injectable()
export class AnalyticsService {
  private readonly TIMEZONE = 'America/Mexico_City';

  constructor(
    @InjectModel(Sale.name) private readonly saleModel: Model<SaleDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Recipe.name) private readonly recipeModel: Model<RecipeDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<any>,
    @InjectModel(Promotion.name) private readonly promotionModel: Model<any>,
  ) {}

  /**
   * Resuelve el rango de fechas con exactitud respetando la zona horaria del restaurante (America/Mexico_City).
   */
  public getDateRange(query: AnalyticsQueryDto): DateRange {
    const period = query.period || 'last_7_days';
    const now = new Date();

    // Obtener la fecha local en formato YYYY-MM-DD para la zona horaria del restaurante
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const todayStr = formatter.format(now); // e.g. "2026-10-19"
    const [currYear, currMonth, currDay] = todayStr.split('-').map(Number);

    let startStr = todayStr;
    let endStr = todayStr;
    let periodLabel = 'Hoy';
    const addDays = (baseStr: string, days: number): string => {
      const [y, m, d] = baseStr.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
      return dt.toISOString().slice(0, 10);
    };

    switch (period) {
      case 'today': {
        startStr = todayStr;
        endStr = todayStr;
        periodLabel = 'Hoy';
        break;
      }
      case 'yesterday': {
        startStr = addDays(todayStr, -1);
        endStr = startStr;
        periodLabel = 'Ayer';
        break;
      }
      case 'last_7_days': {
        startStr = addDays(todayStr, -6);
        endStr = todayStr;
        periodLabel = 'Últimos 7 días';
        break;
      }
      case 'last_30_days': {
        startStr = addDays(todayStr, -29);
        endStr = todayStr;
        periodLabel = 'Últimos 30 días';
        break;
      }
      case 'this_month': {
        startStr = `${todayStr.slice(0, 7)}-01`;
        endStr = todayStr;
        periodLabel = 'Este mes';
        break;
      }
      case 'last_month': {
        const lastMonthDate = new Date(Date.UTC(currYear, currMonth - 2, 1, 12, 0, 0));
        const lmYear = lastMonthDate.getUTCFullYear();
        const lmMonth = String(lastMonthDate.getUTCMonth() + 1).padStart(2, '0');
        const daysInLastMonth = new Date(Date.UTC(currYear, currMonth - 1, 0, 12, 0, 0)).getUTCDate();
        startStr = `${lmYear}-${lmMonth}-01`;
        endStr = `${lmYear}-${lmMonth}-${String(daysInLastMonth).padStart(2, '0')}`;
        periodLabel = 'Mes anterior';
        break;
      }
      case 'custom': {
        if (!query.startDate || !query.endDate) {
          throw new BadRequestException('Para period="custom" se requieren startDate y endDate (YYYY-MM-DD)');
        }
        if (query.startDate > query.endDate) {
          throw new BadRequestException('startDate no puede ser posterior a endDate');
        }
        startStr = query.startDate;
        endStr = query.endDate;
        periodLabel = `${startStr} a ${endStr}`;
        break;
      }
    }

    // Convertir a instantes UTC exactos con offset de México (-06:00)
    const start = new Date(`${startStr}T00:00:00.000-06:00`);
    const end = new Date(`${endStr}T23:59:59.999-06:00`);

    const durationMs = end.getTime() - start.getTime() + 1;
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - durationMs + 1);

    const [y1, m1, d1] = startStr.split('-').map(Number);
    const [y2, m2, d2] = endStr.split('-').map(Number);
    const daysCount = Math.max(1, Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / (24 * 3600 * 1000)) + 1);

    return {
      start,
      end,
      periodLabel,
      prevStart,
      prevEnd,
      daysCount,
    };
  }

  /**
   * 1. INDICADORES PRINCIPALES (KPIS) Y COMPARACIÓN CON PERIODO ANTERIOR
   */
  async getOverviewKpis(query: AnalyticsQueryDto) {
    const range = this.getDateRange(query);

    const [currentPeriodData, prevPeriodData] = await Promise.all([
      this.computePeriodSalesKpis(range.start, range.end),
      this.computePeriodSalesKpis(range.prevStart, range.prevEnd),
    ]);

    const hasPreviousBase = prevPeriodData.netSales > 0;
    const percentageChangeRevenue = hasPreviousBase
      ? Number((((currentPeriodData.netSales - prevPeriodData.netSales) / prevPeriodData.netSales) * 100).toFixed(1))
      : null;

    const hasPreviousOrdersBase = prevPeriodData.salesCount > 0;
    const percentageChangeOrders = hasPreviousOrdersBase
      ? Number((((currentPeriodData.salesCount - prevPeriodData.salesCount) / prevPeriodData.salesCount) * 100).toFixed(1))
      : null;

    const hasPreviousUnitsBase = prevPeriodData.unitsSold > 0;
    const percentageChangeUnits = hasPreviousUnitsBase
      ? Number((((currentPeriodData.unitsSold - prevPeriodData.unitsSold) / prevPeriodData.unitsSold) * 100).toFixed(1))
      : null;

    return {
      period: query.period || 'last_7_days',
      periodLabel: range.periodLabel,
      dateRange: {
        start: range.start.toISOString(),
        end: range.end.toISOString(),
        daysCount: range.daysCount,
      },
      comparisonDateRange: {
        start: range.prevStart.toISOString(),
        end: range.prevEnd.toISOString(),
      },
      current: currentPeriodData,
      previous: prevPeriodData,
      comparison: {
        hasPreviousBase,
        percentageChangeRevenue,
        percentageChangeOrders,
        percentageChangeUnits,
      },
    };
  }

  private async computePeriodSalesKpis(start: Date, end: Date) {
    // 1. Agregación de ventas por estado
    const salesKpis = await this.saleModel.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalDiscounts: { $sum: '$discountAmount' },
        },
      },
    ]);

    let netSales = 0;
    let salesCount = 0;
    let totalDiscounts = 0;
    let pendingSalesAmount = 0;
    let pendingSalesCount = 0;
    let cancelledSalesAmount = 0;
    let cancelledSalesCount = 0;

    for (const group of salesKpis) {
      if (group._id === 'paid') {
        netSales += group.totalAmount;
        salesCount += group.count;
        totalDiscounts += group.totalDiscounts || 0;
      } else if (group._id === 'unpaid' || group._id === 'partial') {
        pendingSalesAmount += group.totalAmount;
        pendingSalesCount += group.count;
      } else if (group._id === 'cancelled') {
        cancelledSalesAmount += group.totalAmount;
        cancelledSalesCount += group.count;
      }
    }

    netSales = Number(netSales.toFixed(2));
    totalDiscounts = Number(totalDiscounts.toFixed(2));
    const grossSales = Number((netSales + totalDiscounts).toFixed(2));
    const averageTicket = salesCount > 0 ? Number((netSales / salesCount).toFixed(2)) : null;

    // 2. Conteo de unidades vendidas en ventas válidas (status: 'paid')
    const unitsResult = await this.saleModel.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end },
          status: 'paid',
        },
      },
      {
        $lookup: {
          from: 'orders',
          localField: 'orders',
          foreignField: '_id',
          as: 'orderDocs',
        },
      },
      { $unwind: '$orderDocs' },
      { $unwind: '$orderDocs.items' },
      {
        $group: {
          _id: null,
          totalUnits: { $sum: '$orderDocs.items.quantity' },
        },
      },
    ]);

    const unitsSold = unitsResult[0]?.totalUnits || 0;

    return {
      netSales,
      grossSales,
      totalDiscounts,
      salesCount,
      averageTicket,
      unitsSold,
      pendingSalesAmount: Number(pendingSalesAmount.toFixed(2)),
      pendingSalesCount,
      cancelledSalesAmount: Number(cancelledSalesAmount.toFixed(2)),
      cancelledSalesCount,
    };
  }

  /**
   * 2. ANALÍTICA DE VENTAS POR HORA, DÍA DE LA SEMANA Y TENDENCIA TEMPORAL
   */
  async getHourlyAndDailyAnalytics(query: AnalyticsQueryDto) {
    const range = this.getDateRange(query);

    // 2.1 Picos por Hora (00 a 23 en America/Mexico_City)
    const hourlyAggregation = await this.saleModel.aggregate([
      {
        $match: {
          date: { $gte: range.start, $lte: range.end },
          status: 'paid',
        },
      },
      {
        $project: {
          hour: { $hour: { date: '$date', timezone: this.TIMEZONE } },
          totalAmount: 1,
          orders: 1,
        },
      },
      {
        $lookup: {
          from: 'orders',
          localField: 'orders',
          foreignField: '_id',
          as: 'orderDocs',
        },
      },
      {
        $addFields: {
          saleUnits: {
            $reduce: {
              input: '$orderDocs',
              initialValue: 0,
              in: {
                $add: [
                  '$$value',
                  {
                    $reduce: {
                      input: '$$this.items',
                      initialValue: 0,
                      in: { $add: ['$$value', '$$this.quantity'] },
                    },
                  },
                ],
              },
            },
          },
        },
      },
      {
        $group: {
          _id: '$hour',
          revenue: { $sum: '$totalAmount' },
          salesCount: { $sum: 1 },
          unitsSold: { $sum: '$saleUnits' },
        },
      },
    ]);

    const hourlyMap = new Map<number, { revenue: number; salesCount: number; unitsSold: number }>();
    for (const h of hourlyAggregation) {
      hourlyMap.set(h._id, {
        revenue: Number(h.revenue.toFixed(2)),
        salesCount: h.salesCount,
        unitsSold: h.unitsSold,
      });
    }

    const hourlyData: Array<{
      hour: number;
      label: string;
      revenue: number;
      averageRevenuePerHour: number;
      salesCount: number;
      unitsSold: number;
    }> = [];
    let peakHourRevenue = { hour: 0, label: '00:00', revenue: 0 };
    let peakHourTickets = { hour: 0, label: '00:00', salesCount: 0 };
    let peakHourUnits = { hour: 0, label: '00:00', unitsSold: 0 };

    for (let h = 0; h < 24; h++) {
      const data = hourlyMap.get(h) || { revenue: 0, salesCount: 0, unitsSold: 0 };
      const label = `${String(h).padStart(2, '0')}:00`;
      const avgRevenue = Number((data.revenue / range.daysCount).toFixed(2));

      hourlyData.push({
        hour: h,
        label,
        revenue: data.revenue,
        averageRevenuePerHour: avgRevenue,
        salesCount: data.salesCount,
        unitsSold: data.unitsSold,
      });

      if (data.revenue > peakHourRevenue.revenue) {
        peakHourRevenue = { hour: h, label, revenue: data.revenue };
      }
      if (data.salesCount > peakHourTickets.salesCount) {
        peakHourTickets = { hour: h, label, salesCount: data.salesCount };
      }
      if (data.unitsSold > peakHourUnits.unitsSold) {
        peakHourUnits = { hour: h, label, unitsSold: data.unitsSold };
      }
    }

    // 2.2 Ventas por Día de la Semana (Lunes a Domingo)
    // $dayOfWeek: 1=Domingo, 2=Lunes, 3=Martes, 4=Miércoles, 5=Jueves, 6=Viernes, 7=Sábado
    const dowAggregation = await this.saleModel.aggregate([
      {
        $match: {
          date: { $gte: range.start, $lte: range.end },
          status: 'paid',
        },
      },
      {
        $project: {
          dow: { $dayOfWeek: { date: '$date', timezone: this.TIMEZONE } },
          totalAmount: 1,
        },
      },
      {
        $group: {
          _id: '$dow',
          revenue: { $sum: '$totalAmount' },
          salesCount: { $sum: 1 },
        },
      },
    ]);

    const dowMap = new Map<number, { revenue: number; salesCount: number }>();
    for (const d of dowAggregation) {
      dowMap.set(d._id, { revenue: Number(d.revenue.toFixed(2)), salesCount: d.salesCount });
    }

    // Contar cuántas veces ocurre cada día de la semana en el rango seleccionado para promedios justos
    const dowOccurrences = new Map<number, number>();
    const iterDate = new Date(range.start);
    while (iterDate <= range.end) {
      // Día de la semana en formato 1=Dom, ..., 7=Sab
      const dow = iterDate.getUTCDay() + 1;
      dowOccurrences.set(dow, (dowOccurrences.get(dow) || 0) + 1);
      iterDate.setUTCDate(iterDate.getUTCDate() + 1);
    }

    const dayDefinitions = [
      { dow: 2, name: 'Lunes', short: 'Lun' },
      { dow: 3, name: 'Martes', short: 'Mar' },
      { dow: 4, name: 'Miércoles', short: 'Mié' },
      { dow: 5, name: 'Jueves', short: 'Jue' },
      { dow: 6, name: 'Viernes', short: 'Vie' },
      { dow: 7, name: 'Sábado', short: 'Sáb' },
      { dow: 1, name: 'Domingo', short: 'Dom' },
    ];

    const dayOfWeekData = dayDefinitions.map((d) => {
      const data = dowMap.get(d.dow) || { revenue: 0, salesCount: 0 };
      const occurrences = dowOccurrences.get(d.dow) || 1;
      const averageRevenue = Number((data.revenue / occurrences).toFixed(2));
      const averageTickets = Number((data.salesCount / occurrences).toFixed(1));

      return {
        dow: d.dow,
        dayName: d.name,
        shortName: d.short,
        totalRevenue: data.revenue,
        salesCount: data.salesCount,
        occurrences,
        averageRevenue,
        averageTickets,
      };
    });

    // 2.3 Tendencia Temporal Diaria
    const dailyAggregation = await this.saleModel.aggregate([
      {
        $match: {
          date: { $gte: range.start, $lte: range.end },
          status: 'paid',
        },
      },
      {
        $project: {
          dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: this.TIMEZONE } },
          totalAmount: 1,
          orders: 1,
        },
      },
      {
        $lookup: {
          from: 'orders',
          localField: 'orders',
          foreignField: '_id',
          as: 'orderDocs',
        },
      },
      {
        $addFields: {
          units: {
            $reduce: {
              input: '$orderDocs',
              initialValue: 0,
              in: {
                $add: [
                  '$$value',
                  {
                    $reduce: {
                      input: '$$this.items',
                      initialValue: 0,
                      in: { $add: ['$$value', '$$this.quantity'] },
                    },
                  },
                ],
              },
            },
          },
        },
      },
      {
        $group: {
          _id: '$dateStr',
          revenue: { $sum: '$totalAmount' },
          salesCount: { $sum: 1 },
          unitsSold: { $sum: '$units' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dailyMap = new Map<string, { revenue: number; salesCount: number; unitsSold: number }>();
    for (const d of dailyAggregation) {
      dailyMap.set(d._id, {
        revenue: Number(d.revenue.toFixed(2)),
        salesCount: d.salesCount,
        unitsSold: d.unitsSold,
      });
    }

      const dailyTrend: Array<{
        date: string;
        revenue: number;
        salesCount: number;
        unitsSold: number;
        averageTicket: number | null;
      }> = [];
    const loopDate = new Date(range.start);
    const endMs = range.end.getTime();

    while (loopDate.getTime() <= endMs) {
      const dStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: this.TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(loopDate);

      const data = dailyMap.get(dStr) || { revenue: 0, salesCount: 0, unitsSold: 0 };
      const avg = data.salesCount > 0 ? Number((data.revenue / data.salesCount).toFixed(2)) : null;

      dailyTrend.push({
        date: dStr,
        revenue: data.revenue,
        salesCount: data.salesCount,
        unitsSold: data.unitsSold,
        averageTicket: avg,
      });

      // Avanzar 1 día
      loopDate.setDate(loopDate.getDate() + 1);
    }

    return {
      periodLabel: range.periodLabel,
      daysCount: range.daysCount,
      hourly: {
        data: hourlyData,
        peaks: {
          revenue: peakHourRevenue,
          tickets: peakHourTickets,
          units: peakHourUnits,
        },
      },
      dayOfWeek: dayOfWeekData,
      dailyTrend,
    };
  }

  /**
   * 3. RANKING DE PRODUCTOS Y RECETAS MÁS VENDIDOS, BAJA ROTACIÓN Y PARTICIPACIÓN
   */
  async getTopProducts(query: AnalyticsQueryDto) {
    const range = this.getDateRange(query);
    const sortBy = query.sortBy || 'units';

    // 1. Agregación de platillos vendidos en ventas pagadas
    const recipeSalesAggregation = await this.saleModel.aggregate([
      {
        $match: {
          date: { $gte: range.start, $lte: range.end },
          status: 'paid',
        },
      },
      {
        $lookup: {
          from: 'orders',
          localField: 'orders',
          foreignField: '_id',
          as: 'orderDocs',
        },
      },
      { $unwind: '$orderDocs' },
      { $unwind: '$orderDocs.items' },
      {
        $group: {
          _id: '$orderDocs.items.recipe',
          unitsSold: { $sum: '$orderDocs.items.quantity' },
          timesOrdered: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'recipes',
          localField: '_id',
          foreignField: '_id',
          as: 'recipeDoc',
        },
      },
      { $unwind: { path: '$recipeDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          recipeId: '$_id',
          name: { $ifNull: ['$recipeDoc.name', 'Platillo Desconocido'] },
          category: { $ifNull: ['$recipeDoc.category', 'General'] },
          price: { $ifNull: ['$recipeDoc.price', 0] },
          unitsSold: 1,
          timesOrdered: 1,
          revenue: { $multiply: ['$unitsSold', { $ifNull: ['$recipeDoc.price', 0] }] },
        },
      },
    ]);

    const totalUnitsSold = recipeSalesAggregation.reduce((acc, r) => acc + r.unitsSold, 0);
    const totalRevenue = recipeSalesAggregation.reduce((acc, r) => acc + r.revenue, 0);

    // Calcular participación porcentual
    const enrichedRecipes = recipeSalesAggregation.map((r) => ({
      recipeId: r.recipeId?.toString() || '',
      name: r.name,
      category: r.category,
      price: r.price,
      unitsSold: r.unitsSold,
      revenue: Number(r.revenue.toFixed(2)),
      unitsSharePercentage: totalUnitsSold > 0 ? Number(((r.unitsSold / totalUnitsSold) * 100).toFixed(1)) : 0,
      revenueSharePercentage: totalRevenue > 0 ? Number(((r.revenue / totalRevenue) * 100).toFixed(1)) : 0,
    }));

    // Ordenamiento dinámico
    enrichedRecipes.sort((a, b) => {
      if (sortBy === 'revenue') {
        return b.revenue - a.revenue;
      }
      return b.unitsSold - a.unitsSold;
    });

    const top10 = enrichedRecipes.slice(0, 10);

    // 2. Análisis de catálogo: Identificar recetas sin ventas o de baja rotación
    const allActiveRecipes = await this.recipeModel.find({ isActive: true });
    const soldRecipeIds = new Set(enrichedRecipes.map((r) => r.recipeId));

    const zeroSalesRecipes: Array<{
      recipeId: string;
      name: string;
      category: string;
      price: number;
      unitsSold: number;
      revenue: number;
    }> = [];
    for (const r of allActiveRecipes) {
      const idStr = (r as any)._id?.toString?.() || '';
      if (!soldRecipeIds.has(idStr)) {
        zeroSalesRecipes.push({
          recipeId: idStr,
          name: r.name,
          category: r.category || 'General',
          price: r.price,
          unitsSold: 0,
          revenue: 0,
        });
      }
    }

    // Baja rotación: las 5 con menor volumen de venta > 0
    const lowRotationRecipes = [...enrichedRecipes].reverse().slice(0, 5);

    return {
      periodLabel: range.periodLabel,
      sortBy,
      summary: {
        totalUnitsSold,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        distinctRecipesSold: enrichedRecipes.length,
        zeroSalesCount: zeroSalesRecipes.length,
      },
      topProducts: top10,
      lowRotationProducts: lowRotationRecipes,
      zeroSalesProducts: zeroSalesRecipes,
    };
  }

  /**
   * 4. ANALÍTICA DE PROMOCIONES Y DESCUENTOS
   */
  async getPromotionsAnalytics(query: AnalyticsQueryDto) {
    const range = this.getDateRange(query);

    const promosAggregation = await this.saleModel.aggregate([
      {
        $match: {
          date: { $gte: range.start, $lte: range.end },
          status: 'paid',
          $or: [
            { promotionApplied: { $exists: true, $ne: null } },
            { discountAmount: { $gt: 0 } },
          ],
        },
      },
      {
        $group: {
          _id: {
            name: { $ifNull: ['$promotionApplied.name', 'Descuento General'] },
            type: { $ifNull: ['$promotionApplied.type', 'manual_discount'] },
          },
          timesApplied: { $sum: 1 },
          totalDiscount: { $sum: '$discountAmount' },
          associatedNetRevenue: { $sum: '$totalAmount' },
        },
      },
    ]);

    const allPromotions = await this.promotionModel.find();
    const promoUsageMap = new Map<string, any>();

    for (const p of promosAggregation) {
      promoUsageMap.set(p._id.name, {
        name: p._id.name,
        type: p._id.type,
        timesApplied: p.timesApplied,
        totalDiscount: Number(p.totalDiscount.toFixed(2)),
        associatedNetRevenue: Number(p.associatedNetRevenue.toFixed(2)),
      });
    }

    const promotionsReport = allPromotions.map((p) => {
      const usage = promoUsageMap.get(p.name) || {
        timesApplied: 0,
        totalDiscount: 0,
        associatedNetRevenue: 0,
      };
      return {
        id: p._id.toString(),
        name: p.name,
        code: p.code || '—',
        type: p.type,
        isActive: p.isActive,
        discountValue: p.discountValue,
        timesApplied: usage.timesApplied,
        totalDiscount: usage.totalDiscount,
        associatedNetRevenue: usage.associatedNetRevenue,
      };
    });

    // Agregar descuentos manuales que no estén vinculados a un documento formal de promoción
    for (const [name, usage] of promoUsageMap.entries()) {
      if (!allPromotions.some((p) => p.name === name)) {
        promotionsReport.push({
          id: 'manual',
          name,
          code: 'MANUAL',
          type: usage.type,
          isActive: false,
          discountValue: 0,
          timesApplied: usage.timesApplied,
          totalDiscount: usage.totalDiscount,
          associatedNetRevenue: usage.associatedNetRevenue,
        });
      }
    }

    const totalDiscountsGranted = promotionsReport.reduce((acc, p) => acc + p.totalDiscount, 0);
    const totalPromotionalRevenue = promotionsReport.reduce((acc, p) => acc + p.associatedNetRevenue, 0);

    return {
      periodLabel: range.periodLabel,
      summary: {
        totalDiscountsGranted: Number(totalDiscountsGranted.toFixed(2)),
        totalPromotionalRevenue: Number(totalPromotionalRevenue.toFixed(2)),
        totalTimesApplied: promotionsReport.reduce((acc, p) => acc + p.timesApplied, 0),
      },
      promotions: promotionsReport.sort((a, b) => b.timesApplied - a.timesApplied),
      commercialNote:
        'Nota comercial: Un volumen elevado de ventas o uso frecuente de una promoción no implica necesariamente rentabilidad positiva sin considerar los costos de los insumos y el margen de contribución.',
    };
  }

  /**
   * 5. INVENTARIO Y CONSUMO TEÓRICO DE INSUMOS
   */
  async getInventoryConsumption(query: AnalyticsQueryDto) {
    const range = this.getDateRange(query);

    // 1. Obtener todas las recetas vendidas con sus cantidades
    const recipeSales = await this.saleModel.aggregate([
      {
        $match: {
          date: { $gte: range.start, $lte: range.end },
          status: 'paid',
        },
      },
      {
        $lookup: {
          from: 'orders',
          localField: 'orders',
          foreignField: '_id',
          as: 'orderDocs',
        },
      },
      { $unwind: '$orderDocs' },
      { $unwind: '$orderDocs.items' },
      {
        $group: {
          _id: '$orderDocs.items.recipe',
          unitsSold: { $sum: '$orderDocs.items.quantity' },
        },
      },
    ]);

    const recipeIds = recipeSales.map((r) => r._id).filter(Boolean);
    const recipes = await this.recipeModel.find({ _id: { $in: recipeIds } }).lean();

    const productIds = new Set<string>();
    for (const r of recipes) {
      for (const ing of (r as any).ingredients || []) {
        const rawId = (ing.ingredientId || ing.product)?.toString();
        if (rawId) productIds.add(rawId);
      }
    }

    const products = await this.productModel
      .find({ _id: { $in: Array.from(productIds).map((id) => new Types.ObjectId(id)) } })
      .lean();
    const productMap = new Map(products.map((p: any) => [p._id.toString(), p]));

    const consumptionMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        theoreticalConsumption: number;
        unit: string;
        currentStock: number;
        estimatedUnitCost: number;
      }
    >();

    for (const rSale of recipeSales) {
      const recipeDoc = recipes.find((r: any) => r._id?.toString?.() === rSale._id?.toString?.());
      if (!recipeDoc || !recipeDoc.ingredients) continue;

      for (const ing of (recipeDoc as any).ingredients) {
        const rawId = (ing.ingredientId || ing.product)?.toString();
        if (!rawId) continue;
        const p = productMap.get(rawId);
        const pName = p?.name || 'Insumo';
        const pStock = p?.stock ?? 0;
        const pUnit = p?.baseUnit || ing.unitMesure || 'pza';
        const pCost = p?.price ?? 0;

        const consumed = (ing.quantity || 0) * rSale.unitsSold;

        const existing = consumptionMap.get(rawId);
        if (existing) {
          existing.theoreticalConsumption += consumed;
        } else {
          consumptionMap.set(rawId, {
            productId: rawId,
            productName: pName,
            theoreticalConsumption: consumed,
            unit: pUnit,
            currentStock: pStock,
            estimatedUnitCost: pCost,
          });
        }
      }
    }

    const consumptionReport = Array.from(consumptionMap.values()).map((c) => ({
      productId: c.productId,
      productName: c.productName,
      theoreticalConsumption: Number(c.theoreticalConsumption.toFixed(2)),
      unit: c.unit,
      currentStock: c.currentStock,
      stockStatus: c.currentStock <= 0 ? 'Agotado' : c.currentStock < c.theoreticalConsumption ? 'Bajo stock' : 'Suficiente',
      estimatedCostOfConsumption: Number((c.theoreticalConsumption * c.estimatedUnitCost).toFixed(2)),
    }));

    consumptionReport.sort((a, b) => b.theoreticalConsumption - a.theoreticalConsumption);

    return {
      periodLabel: range.periodLabel,
      ingredientsConsumption: consumptionReport,
      note: 'El consumo teórico se calcula a partir de las recetas del menú y las órdenes efectivamente pagadas. No incluye mermas, degustaciones ni pérdidas físicas de cocina.',
    };
  }

  /**
   * 6. DISTRIBUCIÓN POR TIPO DE PEDIDO, MÉTODO DE PAGO Y MARGEN ESTIMADO
   */
  async getOperationalDistributions(query: AnalyticsQueryDto) {
    const range = this.getDateRange(query);

    const [orderTypeAgg, paymentMethodAgg] = await Promise.all([
      // Por Tipo de Pedido (local, para llevar, domicilio, evento)
      this.saleModel.aggregate([
        {
          $match: {
            date: { $gte: range.start, $lte: range.end },
            status: 'paid',
          },
        },
        {
          $group: {
            _id: { $ifNull: ['$orderType', 'local'] },
            revenue: { $sum: '$totalAmount' },
            ticketsCount: { $sum: 1 },
          },
        },
      ]),

      // Por Método de Pago (efectivo, tarjeta, transferencia)
      this.saleModel.aggregate([
        {
          $match: {
            date: { $gte: range.start, $lte: range.end },
            status: 'paid',
          },
        },
        {
          $group: {
            _id: { $ifNull: ['$paymentMethod', 'efectivo'] },
            revenue: { $sum: '$totalAmount' },
            ticketsCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const totalRevenue = orderTypeAgg.reduce((acc, o) => acc + o.revenue, 0);
    const totalTickets = orderTypeAgg.reduce((acc, o) => acc + o.ticketsCount, 0);

    const orderTypes = orderTypeAgg.map((o) => ({
      type: o._id,
      revenue: Number(o.revenue.toFixed(2)),
      ticketsCount: o.ticketsCount,
      percentage: totalRevenue > 0 ? Number(((o.revenue / totalRevenue) * 100).toFixed(1)) : 0,
    }));

    const paymentMethods = paymentMethodAgg.map((p) => ({
      method: p._id,
      revenue: Number(p.revenue.toFixed(2)),
      ticketsCount: p.ticketsCount,
      percentage: totalRevenue > 0 ? Number(((p.revenue / totalRevenue) * 100).toFixed(1)) : 0,
    }));

    return {
      periodLabel: range.periodLabel,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalTickets,
      byOrderType: orderTypes,
      byPaymentMethod: paymentMethods,
    };
  }

  /**
   * 7. DASHBOARD INTEGRAL CONSOLIDADO
   * Devuelve todos los módulos en una sola petición optimizada para el panel de Monitoreo.
   */
  async getFullDashboard(query: AnalyticsQueryDto) {
    const [overview, hourlyAndDaily, topProducts, promotions, inventory, distributions] =
      await Promise.all([
        this.getOverviewKpis(query),
        this.getHourlyAndDailyAnalytics(query),
        this.getTopProducts(query),
        this.getPromotionsAnalytics(query),
        this.getInventoryConsumption(query),
        this.getOperationalDistributions(query),
      ]);

    return {
      overview,
      hourlyAndDaily,
      topProducts,
      promotions,
      inventory,
      distributions,
    };
  }
}
