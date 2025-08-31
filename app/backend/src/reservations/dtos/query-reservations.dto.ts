// src/reservations/dtos/query-reservations.dto.ts
import { IsOptional, IsString, IsIn } from 'class-validator';

export class QueryReservationsDto {
  @IsOptional() @IsString()
  date?: string; // YYYY-MM-DD

  @IsOptional() @IsString()
  from?: string; // ISO

  @IsOptional() @IsString()
  to?: string;   // ISO

  @IsOptional() @IsString()
  table?: string; // ObjectId

  @IsOptional() @IsString() @IsIn(['programada','sentada','cancelada','no_asistencia','expirada'])
  status?: string;
}
