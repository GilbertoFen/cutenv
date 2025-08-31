import { IsString, IsIn } from 'class-validator';

export class PaySaleDto {
  @IsString()
  @IsIn(['local', 'para llevar', 'evento', 'domicilio'])
  orderType: string;

  @IsString()
  @IsIn(['efectivo', 'tarjeta', 'transferencia'])
  paymentMethod: string;
}
