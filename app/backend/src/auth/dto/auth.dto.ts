import { IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @MinLength(4, { message: 'La contraseña debe tener al menos 4 caracteres' })
  password: string;

  @IsIn(['owner', 'manager', 'worker'], { message: 'El rol debe ser "owner" (Dueño), "manager" (Gerente) o "worker" (Trabajador operativo)' })
  role: 'owner' | 'manager' | 'worker';
}

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class VerifyManagerDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RootLoginDto {
  @IsString()
  @IsNotEmpty()
  rootPassword: string;
}
