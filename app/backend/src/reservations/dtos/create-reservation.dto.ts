import { IsMongoId, IsOptional, IsString, IsNumber, IsISO8601, ValidateIf } from 'class-validator';

export class CreateReservationDto {
  @IsOptional()
  @IsMongoId()
  table?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  partySize?: number;

  @IsISO8601()
  startTime: string; // ISO string

  @ValidateIf(o => !o.durationMinutes)
  @IsOptional()
  @IsISO8601()
  endTime?: string;  // ISO; si no llega, usamos durationMinutes

  @ValidateIf(o => !o.endTime)
  @IsOptional()
  @IsNumber()
  durationMinutes?: number; // si no mandan endTime

  @IsOptional()
  @IsString()
  notes?: string;
}
