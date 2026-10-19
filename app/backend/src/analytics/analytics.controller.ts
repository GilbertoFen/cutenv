import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  getDashboard(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getFullDashboard(query);
  }

  @Get('overview')
  getOverview(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getOverviewKpis(query);
  }

  @Get('hourly-daily')
  getHourlyAndDaily(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getHourlyAndDailyAnalytics(query);
  }

  @Get('top-products')
  getTopProducts(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getTopProducts(query);
  }

  @Get('promotions')
  getPromotions(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getPromotionsAnalytics(query);
  }

  @Get('inventory')
  getInventoryConsumption(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getInventoryConsumption(query);
  }

  @Get('distributions')
  getDistributions(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getOperationalDistributions(query);
  }
}
