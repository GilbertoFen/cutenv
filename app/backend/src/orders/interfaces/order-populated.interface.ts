import { Document } from 'mongoose';
import { Table } from '../../schemasMongo/table.schema';
import { Recipe } from '../../schemasMongo/recipe.schema';

export interface OrderPopulated extends Document {
  table: Table;
  items: {
    recipe: Recipe;
    quantity: number;
  }[];
  status: string;
  total: number;
  imageUrl: string;
  notes?: string;
}
