import { IsOptional, IsString, IsIn } from 'class-validator';

export class QueryReservationsDto {
  @IsOptional() @IsString()
  date?: string; 

  @IsOptional() @IsString()
  from?: string; 

  @IsOptional() @IsString()
  to?: string;   

  @IsOptional() @IsString()
  table?: string;  
  @IsOptional() @IsString() @IsIn(['programada','sentada','cancelada','no_asistencia','expirada'])
  status?: string;
}
