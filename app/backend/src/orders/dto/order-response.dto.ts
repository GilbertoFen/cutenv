import { IsString, IsArray, IsNumber } from 'class-validator';

class OrderRecipeDto {
  name: string;
  quantity: number;
  imageUrl?: string;
}

export class OrderResponseDto {
  id:string;
  tableNumber: number;
  status: string; 
  recipes: OrderRecipeDto[];
  total:number;
  notes?: string;
}
