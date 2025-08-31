import { IsMongoId } from 'class-validator';

export class AssignTableDto {
  @IsMongoId()
  tableId: string;
}
