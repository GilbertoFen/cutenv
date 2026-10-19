import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type StockMovementDocument = StockMovement & Document;

@Schema({ timestamps: true })
export class StockMovement {
  @Prop({ type: mongoose.Types.ObjectId, ref: 'Product', required: true, index: true })
  product: mongoose.Types.ObjectId;

  @Prop({
    type: String,
    enum: ['entry', 'adjustment', 'sale_deduction'],
    required: true,
  })
  type: 'entry' | 'adjustment' | 'sale_deduction';

  @Prop({ required: true })
  quantity: number; // positivo para entradas, negativo para deducciones

  @Prop({ required: true })
  previousStock: number;

  @Prop({ required: true })
  newStock: number;

  @Prop({ trim: true })
  reason?: string;

  @Prop({ trim: true })
  reference?: string; // id de orden, número de factura o remisión

  @Prop({ trim: true, default: 'sistema' })
  user?: string;
}

export const StockMovementSchema = SchemaFactory.createForClass(StockMovement);
