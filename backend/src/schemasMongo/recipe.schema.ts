import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Product } from './product.schema';

export type RecipeDocument = Recipe & Document;

@Schema({ timestamps: true })
export class Recipe {

  @Prop({ 
    required: true 
  })
  name: string;

  @Prop()
  description: string;

  @Prop({
    required : true
  })
  price: number;

  @Prop([
    {
      ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true },
      unitMesure: { type: String, required: true },
    }
  ])
  ingredients: {
    ingredientId: mongoose.Schema.Types.ObjectId;
    quantity: number;
    unitMesure: string;
  }[];
}

export const RecipeSchema = SchemaFactory.createForClass(Recipe);
