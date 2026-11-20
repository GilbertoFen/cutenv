import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateVirtualTableDto {
  @IsEnum(['para_llevar', 'domicilio', 'telefonico'], {
    message: 'tableType debe ser para_llevar, domicilio o telefonico',
  })
  tableType: 'para_llevar' | 'domicilio' | 'telefonico';

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @IsOptional()
  @IsString()
  deliveryNotes?: string;
}
