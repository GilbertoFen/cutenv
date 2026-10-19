import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';

export type PromotionDocument = HydratedDocument<Promotion> & { _id: Types.ObjectId };

export type PromotionType = 'two_for_one' | 'percentage_discount' | 'fixed_discount';

@Schema({ timestamps: true })
export class Promotion {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ unique: true, sparse: true, uppercase: true, trim: true })
  code?: string; // Optional coupon code, e.g. MARTES2X1

  @Prop({ required: true, enum: ['two_for_one', 'percentage_discount', 'fixed_discount'] })
  type: PromotionType;

  // Days of week: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday. Empty array or undefined means all days.
  @Prop({ type: [Number], default: [] })
  daysOfWeek: number[];

  @Prop({ type: Date, required: false })
  startDate?: Date;

  @Prop({ type: Date, required: false })
  endDate?: Date;

  // Scope: 'all' | 'categories' | 'recipes'
  @Prop({ default: 'all', enum: ['all', 'categories', 'recipes'] })
  scope: 'all' | 'categories' | 'recipes';

  @Prop({ type: [String], default: [] })
  targetCategories: string[];

  @Prop([{ type: Types.ObjectId, ref: 'Recipe' }])
  targetRecipes: Types.ObjectId[];

  // For percentage_discount: 1-100. For fixed_discount: amount in MXN.
  @Prop({ default: 0 })
  discountValue: number;

  @Prop({ default: 0 })
  minOrderAmount?: number;

  @Prop({ required: false })
  description?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdBy?: string;

  @Prop()
  updatedBy?: string;
}

export const PromotionSchema = SchemaFactory.createForClass(Promotion);
PromotionSchema.index({ code: 1 }, { sparse: true });
PromotionSchema.index({ isActive: 1, type: 1 });
