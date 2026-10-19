import { IsOptional, IsString, IsIn, Matches } from 'class-validator';

export class AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month', 'custom'])
  period?: 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'custom';

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate debe tener formato YYYY-MM-DD' })
  startDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate debe tener formato YYYY-MM-DD' })
  endDate?: string;

  @IsOptional()
  @IsString()
  @IsIn(['units', 'revenue'])
  sortBy?: 'units' | 'revenue';

  @IsOptional()
  @IsString()
  orderType?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
