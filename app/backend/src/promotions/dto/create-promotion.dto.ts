import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PromotionType } from '../../schemasMongo/promotion.schema';

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la promoción es obligatorio' })
  name: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsEnum(['two_for_one', 'percentage_discount', 'fixed_discount'], {
    message: 'El tipo debe ser two_for_one, percentage_discount o fixed_discount',
  })
  type: PromotionType;

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
  discountValue: number;

  @IsNumber()
  @IsOptional()
  minOrderAmount?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty({ message: 'Se requiere usuario de gerente para autorizar la promoción' })
  authUsername: string;

  @IsString()
  @IsNotEmpty({ message: 'Se requiere contraseña de gerente para autorizar la promoción' })
  authPassword: string;
}
