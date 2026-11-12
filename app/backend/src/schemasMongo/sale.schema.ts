import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';

export type SaleDocument = HydratedDocument<Sale> & { _id: Types.ObjectId };
@Schema({ timestamps: true })
export class Sale {
  @Prop({ type: Types.ObjectId, ref: 'Table', required: true })
  table: mongoose.Schema.Types.ObjectId;

  @Prop([{ type: Types.ObjectId, ref: 'Order', required: true }])
  orders: mongoose.Schema.Types.ObjectId[];

  @Prop({ required: true, default: 0 })
  totalAmount: number;

  @Prop({ default: 'unpaid', enum: ['paid', 'unpaid', 'partial', 'cancelled'] })
  status: string;

  @Prop() cancelReason?: string;
  @Prop() cancelledBy?: string;
  @Prop() cancelledAt?: Date;

  @Prop({ type: Date })
  date: Date;

  @Prop({ required: true, unique: true })
  folio: string;

  @Prop({ enum: ['local', 'para llevar', 'evento', 'domicilio'], default: 'local' })
  orderType: string;
  @Prop({ enum: ['none', 'requested', 'printed'], default: 'none' })
  ticketStatus: 'none' | 'requested' | 'printed';

  @Prop() requestedAt?: Date;
  @Prop() ticketPrintedAt?: Date;

  @Prop({ enum: ['efectivo', 'tarjeta', 'transferencia'], default: 'efectivo' })
  paymentMethod: string;

  @Prop({ default: false, index: true })
  isFacturada: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Invoice', required: false })
  invoiceId?: Types.ObjectId;

  @Prop({ default: 0 })
  discountAmount: number;

  @Prop({ default: 0 })
  paidAmount?: number;

  @Prop({ type: [{ method: String, amount: Number, date: Date }], default: [] })
  payments?: Array<{ method: string; amount: number; date?: Date }>;

  @Prop({ type: Object, required: false })
  promotionApplied?: {
    promotionId: string;
    name: string;
    code?: string;
    type: string;
    discountAmount: number;
    baseAmount?: number;
    rule?: string;
    benefitedItems?: string[];
    appliedAt?: Date;
    authorizedBy?: string;
    authReason?: string;
  };
}

export const SaleSchema = SchemaFactory.createForClass(Sale);
SaleSchema.index({ status: 1, ticketStatus: 1, requestedAt: -1 }); // útil para cola del cajero
SaleSchema.index({ isFacturada: 1, status: 1 });

