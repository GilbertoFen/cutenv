import { IsString, IsNotEmpty, Matches, Length, IsOptional, IsEmail } from 'class-validator';

export class SaveFiscalCustomerDto {
  @IsString()
  @IsNotEmpty({ message: 'El RFC es obligatorio' })
  @Matches(/^([A-ZÑ&]{3,4}) ?(?:0[1-9]|[1-9][0-9])(?:0[1-9]|1[0-2])(?:0[1-9]|[12][0-9]|3[01])[A-Z0-9]{2}[0-9A]$|^XAXX010101000$|^XEXX010101000$/, {
    message: 'El RFC no tiene un formato válido',
  })
  rfc: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre o razón social es obligatorio' })
  legalName: string;

  @IsString()
  @Length(5, 5, { message: 'El código postal debe tener 5 dígitos' })
  @Matches(/^[0-9]{5}$/, { message: 'El código postal debe ser numérico' })
  postalCode: string;

  @IsString()
  @IsNotEmpty({ message: 'El régimen fiscal es obligatorio' })
  taxRegime: string;

  @IsString()
  @IsNotEmpty({ message: 'El uso del CFDI es obligatorio' })
  cfdiUse: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
