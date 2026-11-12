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
    status: { type: String, enum: ['pending', 'preparing', 'ready', 'delivered', 'cancelled'], default: 'preparing' },
    station: { type: String, enum: ['fria', 'caliente', 'ninguna'], default: 'ninguna' },
    notes: { type: String, required: false },
    callWaiter: {
      requested: { type: Boolean, default: false },
      reason: { type: String, enum: ['ready', 'unavailable', 'issue', 'other'], default: 'ready' },
      message: { type: String, required: false },
      requestedAt: { type: Date, required: false },
      resolved: { type: Boolean, default: false },
      isExplicitCall: { type: Boolean, default: false },
    },
  }])
  items: {
    _id?: Types.ObjectId;
    recipe: Types.ObjectId;
    quantity: number;
    status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
    station?: 'fria' | 'caliente' | 'ninguna';
    notes?: string;
    callWaiter?: {
      requested: boolean;
      reason: 'ready' | 'unavailable' | 'issue' | 'other';
      message?: string;
      requestedAt?: Date;
      resolved?: boolean;
      isExplicitCall?: boolean;
    };
  }[];

  @Prop({ default: 'preparing', enum: ['pending', 'preparing', 'ready', 'delivered', 'cancelled'] })
  status: string;

  @Prop()
  total: number;
  @Prop({type: String, required: false})
  notes: string;

  @Prop({ type: Boolean, default: false })
  inventoryRestored?: boolean;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
