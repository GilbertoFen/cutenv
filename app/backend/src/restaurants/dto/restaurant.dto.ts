import { IsString, IsNotEmpty, IsOptional, IsEmail, IsArray, ValidateNested, IsBoolean, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRestaurantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  // Cuentas administrativas iniciales
  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @IsEmail()
  @IsNotEmpty()
  ownerEmail: string;

  @IsString()
  @IsNotEmpty()
  managerName: string;

  @IsEmail()
  @IsNotEmpty()
  managerEmail: string;
}

export class UpdateRestaurantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  status?: 'active' | 'inactive';

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

export class DayScheduleDto {
  @IsNumber()
  dayOfWeek: number;

  @IsString()
  dayName: string;

  @IsBoolean()
  enabled: boolean;

  @IsString()
  openTime: string;

  @IsString()
  closeTime: string;
}

export class UpdateScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayScheduleDto)
  weeklySchedule: DayScheduleDto[];

  @IsString()
  @IsOptional()
  timezone?: string;
}

