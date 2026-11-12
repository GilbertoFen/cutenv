import { IsString, IsIn, IsOptional, IsNumber, IsObject } from 'class-validator';

export class PaySaleDto {
  @IsString()
  @IsIn(['local', 'para llevar', 'evento', 'domicilio'])
  orderType: string;

  @IsString()
  @IsIn(['efectivo', 'tarjeta', 'transferencia'])
  paymentMethod: string;

  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @IsOptional()
  @IsString()
  promotionId?: string;

  @IsOptional()
  @IsString()
  authorizedBy?: string;

  @IsOptional()
  @IsString()
  authReason?: string;

  @IsOptional()
  @IsObject()
  promotionApplied?: {
    promotionId: string;
    name?: string;
    code?: string;
    type?: string;
    discountAmount?: number;
    benefitedItems?: string[];
    authorizedBy?: string;
    authReason?: string;
  };
}
