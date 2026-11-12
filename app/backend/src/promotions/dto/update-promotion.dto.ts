import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PromotionType } from '../../schemasMongo/promotion.schema';

export class UpdatePromotionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsEnum([
    'two_for_one',
    'percentage_discount',
    'fixed_discount',
    'birthday',
    'package_gift',
  ])
  @IsOptional()
  type?: PromotionType;

  @IsArray()
  @IsOptional()
  daysOfWeek?: number[];

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  @IsEnum(['all', 'categories', 'recipes'])
  @IsOptional()
  scope?: 'all' | 'categories' | 'recipes';

  @IsArray()
  @IsOptional()
  targetCategories?: string[];

  @IsArray()
  @IsOptional()
  applicableCategories?: string[];

  @IsArray()
  @IsOptional()
  targetRecipes?: string[];

  @IsArray()
  @IsOptional()
  excludedRecipes?: string[];

  @IsNumber()
  @IsOptional()
  buyQuantity?: number;

  @IsNumber()
  @IsOptional()
  getQuantity?: number;

  @IsString()
  @IsOptional()
  triggerRecipeId?: string;

  @IsNumber()
  @IsOptional()
  triggerQuantity?: number;

  @IsString()
  @IsOptional()
  rewardRecipeId?: string;

  @IsNumber()
  @IsOptional()
  rewardQuantity?: number;

  @IsEnum(['mix_and_match', 'same_product'])
  @IsOptional()
  applyMode?: 'mix_and_match' | 'same_product';

  @IsOptional()
  requiresAuth?: boolean;

  @IsOptional()
  isCumulative?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxDiscountAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxApplicationsPerOrder?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discountValue?: number;

  @IsNumber()
  @IsOptional()
  minOrderAmount?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsNotEmpty({ message: 'Se requiere usuario de gerente para autorizar la actualización' })
  authUsername: string;

  @IsString()
  @IsNotEmpty({ message: 'Se requiere contraseña de gerente para autorizar la actualización' })
  authPassword: string;
}
