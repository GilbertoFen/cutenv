import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PromotionDocument = HydratedDocument<Promotion> & { _id: Types.ObjectId };

export type PromotionType =
  | 'two_for_one'
  | 'percentage_discount'
  | 'fixed_discount'
  | 'birthday'
  | 'package_gift';

@Schema({ timestamps: true })
export class Promotion {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ unique: true, sparse: true, uppercase: true, trim: true })
  code?: string; // Optional coupon code, e.g. MARTES2X1

  @Prop({
    required: true,
    enum: ['two_for_one', 'percentage_discount', 'fixed_discount', 'birthday', 'package_gift'],
  })
  type: PromotionType;

  // Days of week: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday. Empty array or undefined means all days.
  @Prop({ type: [Number], default: [] })
  daysOfWeek: number[];

  @Prop({ type: Date, required: false })
  startDate?: Date;

  @Prop({ type: Date, required: false })
  endDate?: Date;

  // Horario permitido en formato HH:mm (ej. "13:00" a "18:00")
  @Prop({ required: false, trim: true })
  startTime?: string;

  @Prop({ required: false, trim: true })
  endTime?: string;

  // Scope: 'all' | 'categories' | 'recipes'
  @Prop({ default: 'all', enum: ['all', 'categories', 'recipes'] })
  scope: 'all' | 'categories' | 'recipes';

  @Prop({ type: [String], default: [] })
  targetCategories: string[];

  // Legacy fallback support for seed and existing DB entries
  @Prop({ type: [String], default: [] })
  applicableCategories?: string[];

  @Prop([{ type: Types.ObjectId, ref: 'Recipe' }])
  targetRecipes: Types.ObjectId[];

  // Insumos/recetas excluidos específicamente de la categoría o grupo
  @Prop([{ type: Types.ObjectId, ref: 'Recipe' }])
  excludedRecipes?: Types.ObjectId[];

  // Cantidad necesaria para beneficio (ej. en 2x1 es 2, en 3x2 es 3)
  @Prop({ default: 2 })
  buyQuantity?: number;

  // Cantidad bonificada (ej. en 2x1 es 1, en 3x2 es 1)
  @Prop({ default: 1 })
  getQuantity?: number;

  // Para promociones por paquete o regalo (compra trigger y llévate reward de regalo)
  @Prop({ type: Types.ObjectId, ref: 'Recipe', required: false })
  triggerRecipeId?: Types.ObjectId;

  @Prop({ default: 1 })
  triggerQuantity?: number;

  @Prop({ type: Types.ObjectId, ref: 'Recipe', required: false })
  rewardRecipeId?: Types.ObjectId;

  @Prop({ default: 1 })
  rewardQuantity?: number;

  // For percentage_discount: 1-100. For fixed_discount: amount in MXN.
  @Prop({ default: 0 })
  discountValue: number;

  @Prop({ default: 0 })
  minOrderAmount?: number;

  // Límite de descuento máximo permitido en pesos
  @Prop({ default: 0 })
  maxDiscountAmount?: number;

  // Límite de aplicaciones por orden (ej. máximo 2 parejas 2x1)
  @Prop({ default: 0 })
  maxApplicationsPerOrder?: number;

  // Modo de aplicación para 2x1: 'mix_and_match' (default) o 'same_product'
  @Prop({ default: 'mix_and_match', enum: ['mix_and_match', 'same_product'] })
  applyMode: 'mix_and_match' | 'same_product';

  // Si requiere autorización del personal (obligatorio en promociones de cumpleañero)
  @Prop({ default: false })
  requiresAuth?: boolean;

  // Si es acumulable con otras promociones
  @Prop({ default: false })
  isCumulative?: boolean;

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
PromotionSchema.index({ isActive: 1, type: 1 });
