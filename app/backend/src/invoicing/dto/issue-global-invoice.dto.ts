import { IsString, IsNotEmpty, IsEnum, IsNumber, Min, Max, IsDateString, IsOptional } from 'class-validator';

export class IssueGlobalInvoiceDto {
  @IsEnum(['01', '02', '03', '04'], { message: 'Periodicidad inválida (01: Diario, 02: Semanal, 03: Quincenal, 04: Mensual)' })
  periodicity: '01' | '02' | '03' | '04';

  @IsString()
  @IsNotEmpty({ message: 'El mes es obligatorio' })
  months: string; // '01' a '12'

  @IsNumber()
  @Min(2020)
  @Max(2050)
  year: number;

  @IsDateString({}, { message: 'Fecha de inicio inválida' })
  startDate: string;

  @IsDateString({}, { message: 'Fecha de fin inválida' })
  endDate: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string; // SAT FormaPago (por default '01' Efectivo)

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
