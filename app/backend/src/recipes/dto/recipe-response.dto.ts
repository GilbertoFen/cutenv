export class IngredientResponseDto {
  name: string;
  quantity: number;
  unitMesure: string;
}

export class RecipeResponseDto {
  id: string;
  name: string;
  steps?: string;
  price: number;
  ingredients: IngredientResponseDto[];
  imageUrl?: string;
  category?: string;
  station?: 'fria' | 'caliente' | 'ninguna';
}
