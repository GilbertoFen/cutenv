import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateTableDto {
  @IsInt()
  number: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  capacity?: number;
}
