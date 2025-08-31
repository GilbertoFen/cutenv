import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument , Types} from 'mongoose';

export type SaleDocument = HydratedDocument<Sale> & { _id: Types.ObjectId };
@Schema({ timestamps: true })
export class Sale {
  @Prop({ type: Types.ObjectId, ref: 'Table', required: true })
  table: mongoose.Schema.Types.ObjectId;

  @Prop([{ type: Types.ObjectId, ref: 'Order', required: true }])
  orders: mongoose.Schema.Types.ObjectId[];

  @Prop({ required: true, default:0 })
  totalAmount: number;

  @Prop({ default: 'unpaid', enum: ['paid', 'unpaid', 'partial'] })
  status: string;

  @Prop({ type: Date })
  date: Date;

  @Prop({ required: true, unique: true })
  folio: string;

  @Prop({ enum: ['local', 'para llevar', 'evento', 'domicilio'], default: 'local' })
  orderType: string;

  @Prop({ enum: ['efectivo', 'tarjeta', 'transferencia'], default: 'efectivo' })
  paymentMethod: string;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);
