import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type SaleDocument = Sale & Document;

@Schema({ timestamps: true })
export class Sale {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true })
  table: mongoose.Schema.Types.ObjectId;

  @Prop([{ type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true }])
  orders: mongoose.Schema.Types.ObjectId[];

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ default: 'paid', enum: ['paid', 'unpaid', 'partial'] })
  status: string;

  @Prop({ type: Date })
  date: Date;

  @Prop({ required: true, unique: true })
  folio: string;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);
