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
  startTime: string; 

  @ValidateIf(o => !o.durationMinutes)
  @IsOptional()
  @IsISO8601()
  endTime?: string;   

  @ValidateIf(o => !o.endTime)
  @IsOptional()
  @IsNumber()
  durationMinutes?: number;  

  @IsOptional()
  @IsString()
  notes?: string;
}
