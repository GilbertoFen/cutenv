import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class DeleteRecipeDto {
  @IsString()
  @IsNotEmpty({ message: 'El usuario de gerente o administrador es obligatorio' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;

  @IsString()
  @MinLength(5, { message: 'Debe ingresar un motivo detallado para eliminar la receta' })
  reason: string;
}
