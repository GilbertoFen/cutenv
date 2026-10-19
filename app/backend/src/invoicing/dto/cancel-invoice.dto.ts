import { IsString, IsNotEmpty, IsEnum, IsOptional, Matches } from 'class-validator';

export class CancelInvoiceDto {
  @IsEnum(['01', '02', '03', '04'], {
    message: 'El motivo de cancelación debe ser 01, 02, 03 o 04 según el catálogo del SAT',
  })
  @IsNotEmpty({ message: 'El motivo de cancelación es obligatorio' })
  reason: '01' | '02' | '03' | '04';

  @IsOptional()
  @IsString()
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, {
    message: 'El UUID de sustitución debe ser un folio fiscal válido (formato UUID)',
  })
  replacementUuid?: string;
}
