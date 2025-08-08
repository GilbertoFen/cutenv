import { Type } from 'class-transformer';
import { IsArray, IsMongoId, IsNumber, IsOptional, IsString, Validate } from 'class-validator';

class UpdateOrderItemDto {
  @IsString()
  recipe: string;

  @IsNumber()
  quantity: number;
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

