import { IsString, IsNumber, IsArray, IsOptional, IsDate } from 'class-validator';

class SaleOrderDto {
  @IsNumber()
  tableNumber: number;

  @IsNumber()
  total: number;
}

export class SaleResponseDto {
  id: string;
  @IsNumber()
  totalAmount: number;

  @IsArray()
  orders: SaleOrderDto[];

  @IsOptional()
  @IsDate()
  date?: Date;

  @IsString()
  folio: string;

  @IsOptional()
  @IsString()
  orderType?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  tableId?: string;
  table: { number: number } | null;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  cancelReason?: string;

  @IsOptional()
  @IsString()
  cancelledBy?: string;

  @IsOptional()
  @IsDate()
  cancelledAt?: Date;

  @IsOptional()
  isFacturada?: boolean;

  @IsOptional()
  @IsString()
  invoiceId?: string;
}
