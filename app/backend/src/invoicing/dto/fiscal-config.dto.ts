import { IsString, IsNotEmpty, Matches, Length, IsEnum, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class SaveFiscalConfigDto {
  @IsString()
  @IsNotEmpty({ message: 'El RFC del restaurante es obligatorio' })
  @Matches(/^([A-ZÑ&]{3,4}) ?(?:0[1-9]|[1-9][0-9])(?:0[1-9]|1[0-2])(?:0[1-9]|[12][0-9]|3[01])[A-Z0-9]{2}[0-9A]$/, {
    message: 'El RFC del emisor no tiene un formato válido',
  })
  rfc: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre o razón social del emisor es obligatorio' })
  legalName: string;

  @IsString()
  @IsNotEmpty({ message: 'El régimen fiscal es obligatorio' })
  taxRegime: string;

  @IsString()
  @Length(5, 5, { message: 'El código postal debe tener exactamente 5 dígitos' })
  @Matches(/^[0-9]{5}$/, { message: 'El código postal debe contener sólo números' })
  postalCode: string;

  @IsEnum(['facturama', 'finkok', 'mock_sandbox'], { message: 'Proveedor PAC no válido' })
  pacProvider: 'facturama' | 'finkok' | 'mock_sandbox';

  @IsOptional()
  @IsString()
  pacUsername?: string;

  @IsOptional()
  @IsString()
  pacPassword?: string; // O token API del PAC

  @IsEnum(['sandbox', 'production'], { message: 'El ambiente debe ser sandbox o production' })
  environment: 'sandbox' | 'production';

  @IsOptional()
  @IsString()
  defaultClaveProdServ?: string;

  @IsOptional()
  @IsString()
  defaultClaveUnidad?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  defaultIvaRate?: number;

  @IsOptional()
  @IsString()
  series?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  nextFolio?: number;
}
