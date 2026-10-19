import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Types } from 'mongoose';

export type OrderDocument = Order & Document & { _id: Types.ObjectId };

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'Table', required: true })
  table: mongoose.Schema.Types.ObjectId;

  @Prop([{
    recipe: { type: Types.ObjectId, ref: 'Recipe', required: true },
    quantity: { type: Number, required: true },
    status: { type: String, enum: ['preparing', 'ready', 'delivered', 'cancelled'], default: 'preparing' },
    notes: { type: String, required: false }
  }])
  items: {
    _id?: Types.ObjectId;
    recipe: Types.ObjectId;
    quantity: number;
    status: 'preparing' | 'ready' | 'delivered' | 'cancelled';
    notes?: string;
  }[];

  @Prop({ default: 'preparing', enum: ['preparing', 'ready', 'delivered', 'cancelled'] })
  status: string;

  @Prop()
  total: number;
  @Prop({type: String, required: false})
  notes: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
