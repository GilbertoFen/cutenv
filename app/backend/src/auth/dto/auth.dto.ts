import { IsIn, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(4, { message: 'La contraseña debe tener al menos 4 caracteres' })
  password: string;

  @IsIn(['owner', 'manager', 'worker'], { message: 'El rol debe ser "owner" (Dueño), "manager" (Gerente) o "worker" (Trabajador operativo)' })
  role: 'owner' | 'manager' | 'worker';

  @IsString()
  @IsOptional()
  restaurantId?: string;
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

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;
}

export class ConfirmPasswordResetDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;
}

export class RequestPasswordResetDto {
  @IsString()
  @IsNotEmpty({ message: 'El usuario o correo es obligatorio' })
  identifier: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
