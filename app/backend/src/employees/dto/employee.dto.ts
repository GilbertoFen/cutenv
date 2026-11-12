import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsIn,
  IsBoolean,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DayScheduleDto } from '../../restaurants/dto/restaurant.dto';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  @IsIn(['worker', 'manager'])
  role?: 'worker' | 'manager';

  @IsString()
  @IsOptional()
  @IsIn(['mesero', 'cocinero', 'cajero', 'recepcionista', 'general'])
  operationalRole?: 'mesero' | 'cocinero' | 'cajero' | 'recepcionista' | 'general';

  @IsString()
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsString()
  @IsOptional()
  password?: string;

  @IsOptional()
  individualSchedule?: {
    enabled: boolean;
    weeklySchedule: DayScheduleDto[];
  };
}

export class UpdateEmployeeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @IsIn(['worker', 'manager'])
  role?: 'worker' | 'manager';

  @IsString()
  @IsOptional()
  @IsIn(['mesero', 'cocinero', 'cajero', 'recepcionista', 'general'])
  operationalRole?: 'mesero' | 'cocinero' | 'cajero' | 'recepcionista' | 'general';

  @IsString()
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @IsString()
  @IsOptional()
  password?: string;

  @IsOptional()
  individualSchedule?: {
    enabled: boolean;
    weeklySchedule: DayScheduleDto[];
  };
}

