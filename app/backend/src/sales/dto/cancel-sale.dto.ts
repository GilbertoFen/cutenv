import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CancelSaleDto {
  @IsString()
  @IsNotEmpty({ message: 'El usuario de gerente es obligatorio' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña de gerente es obligatoria' })
  password: string;

  @IsString()
  @MinLength(5, { message: 'Debe ingresar una nota o motivo detallado de cancelación' })
  reason: string;
}
