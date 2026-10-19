import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PromotionType } from '../../schemasMongo/promotion.schema';

export class UpdatePromotionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsEnum(['two_for_one', 'percentage_discount', 'fixed_discount'])
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

  @IsEnum(['all', 'categories', 'recipes'])
  @IsOptional()
  scope?: 'all' | 'categories' | 'recipes';

  @IsArray()
  @IsOptional()
  targetCategories?: string[];

  @IsArray()
  @IsOptional()
  targetRecipes?: string[];

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
