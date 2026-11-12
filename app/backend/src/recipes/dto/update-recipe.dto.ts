import { IsArray, IsMongoId, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class IngredientUpdate {
  @IsOptional()
  @IsMongoId()
  ingredientId?: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  unit?: string;
}

export class UpdateRecipeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  steps?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientUpdate)
  ingredients?: IngredientUpdate[];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  station?: 'fria' | 'caliente' | 'ninguna';

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
