import { IsMongoId, IsArray, IsNumber, IsString } from 'class-validator';

export class CreateSaleDto {
  @IsMongoId()
  table: string;

  @IsArray()
  @IsMongoId({ each: true })
  orders: string[];

  @IsNumber()
  totalAmount: number;

  @IsString()
  status: string;

  @IsString()
  folio: string;
}
