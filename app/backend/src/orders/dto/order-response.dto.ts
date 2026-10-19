import { IsString, IsArray, IsNumber } from 'class-validator';

export class OrderRecipeDto {
  itemId?: string;
  id?: string;
  name: string;
  quantity: number;
  imageUrl?: string;
  status?: string;
  notes?: string;
  price?: number;
}

export class OrderResponseDto {
  id:string;
  tableNumber: number;
  status: string; 
  recipes: OrderRecipeDto[];
  total:number;
  notes?: string;
}
