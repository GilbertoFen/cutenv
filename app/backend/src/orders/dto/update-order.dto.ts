import { Type } from 'class-transformer';
import { IsArray, IsMongoId, IsNumber, IsOptional, IsString, Validate } from 'class-validator';

class OrderModifierDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  station?: 'fria' | 'caliente' | 'ninguna';

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpdateOrderItemDto {
  @IsOptional()
  @IsString()
  itemId?: string;

  @IsString()
  recipe: string;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  station?: 'fria' | 'caliente' | 'ninguna';

  @IsOptional()
  @IsArray()
  @Validate(OrderModifierDto, { each: true })
  @Type(() => OrderModifierDto)
  modifiers?: OrderModifierDto[];
}

export class UpdateOrderDto{

  @IsOptional()
  @IsString()
  tableId?: string;

  @IsOptional()
  @IsArray()
  @Validate(UpdateOrderItemDto, { each: true })
  @Type(() => UpdateOrderItemDto)
  items?: UpdateOrderItemDto[];
  
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

}

