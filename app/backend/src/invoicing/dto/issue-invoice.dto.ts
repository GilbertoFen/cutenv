import { IsString, IsNotEmpty, Matches, Length, IsOptional, IsEmail, IsEnum } from 'class-validator';

export class ReceptorDto {
  @IsString()
  @IsNotEmpty({ message: 'El RFC del receptor es obligatorio' })
  @Matches(/^([A-ZÑ&]{3,4}) ?(?:0[1-9]|[1-9][0-9])(?:0[1-9]|1[0-2])(?:0[1-9]|[12][0-9]|3[01])[A-Z0-9]{2}[0-9A]$|^XAXX010101000$|^XEXX010101000$/, {
    message: 'El RFC del receptor no tiene un formato válido ante el SAT',
  })
  rfc: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre o razón social del receptor es obligatorio' })
  legalName: string;

  @IsString()
  @Length(5, 5, { message: 'El código postal del domicilio fiscal debe tener 5 dígitos' })
  @Matches(/^[0-9]{5}$/, { message: 'El código postal debe ser numérico' })
  postalCode: string;

  @IsString()
  @IsNotEmpty({ message: 'El régimen fiscal del receptor es obligatorio' })
  taxRegime: string;

  @IsString()
  @IsNotEmpty({ message: 'El uso del CFDI es obligatorio' })
  cfdiUse: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email?: string;
}

export class IssueIndividualInvoiceDto {
  @IsNotEmpty()
  receptor: ReceptorDto;

  @IsOptional()
  @IsString()
  paymentMethod?: string; // Forma de pago SAT ('01', '03', '04', '28')

  @IsOptional()
  @IsEnum(['PUE', 'PPD'])
  paymentType?: 'PUE' | 'PPD';

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  saveCustomer?: boolean; // Guardar cliente para futuras facturas

  @IsOptional()
  sendEmail?: boolean;
}
