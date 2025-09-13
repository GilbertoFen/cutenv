import { IsMongoId, IsArray, IsNumber, IsString , IsOptional, IsIn} from 'class-validator';

export class CreateSaleDto {
  @IsMongoId()
  @IsOptional()
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

  @IsOptional()
  @IsString()
  @IsIn(['local', 'para llevar', 'evento', 'domicilio'])
  orderType?: string;
  
  @IsOptional()
  @IsString()
  @IsIn(['efectivo', 'tarjeta', 'transferencia'])
  paymentMethod?: string;
}
