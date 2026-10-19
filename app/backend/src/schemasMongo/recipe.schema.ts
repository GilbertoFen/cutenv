import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type RecipeDocument = Recipe & Document;

@Schema({ timestamps: true })
export class Recipe {

  @Prop({ 
    required: true 
  })
  name: string;
  
  @Prop({
    required: true,
  })
  steps: string;


  @Prop({
    required : true
  })
  price: number;

  @Prop([
    {
      ingredientId: { type: mongoose.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true },
      unitMesure: { type: String, required: true },
    }
  ])
  ingredients: {
    ingredientId: mongoose.Types.ObjectId;
    quantity: number;
    unitMesure: string;
  }[];

  @Prop()
  category?: string;
  
  @Prop()
  imageUrl?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: String, required: false })
  deletedBy?: string;

  @Prop({ type: Date, required: false })
  deletedAt?: Date;

  @Prop({ type: String, required: false })
  deleteReason?: string;
}

export const RecipeSchema = SchemaFactory.createForClass(Recipe);
