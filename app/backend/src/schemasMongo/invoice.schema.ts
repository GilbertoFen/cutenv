import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';

export type InvoiceDocument = HydratedDocument<Invoice> & { _id: Types.ObjectId };

export interface InvoiceItem {
  noIdentificacion?: string;
  claveProdServ: string;
  claveUnidad: string;
  unidad: string;
  cantidad: number;
  descripcion: string;
  valorUnitario: number;
  importe: number;
  descuento?: number;
  objetoImp: string; // '01' No objeto, '02' Sí objeto
  baseIva: number;
  tasaIva: number;
  importeIva: number;
}

@Schema({ timestamps: true })
export class Invoice {
  @Prop({ required: true, default: 'default-restaurant' })
  restaurantId: string;

  @Prop({ required: true, enum: ['individual', 'global'], default: 'individual' })
  type: 'individual' | 'global';

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: false })
  saleId?: mongoose.Schema.Types.ObjectId;

  @Prop([{ type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: false }])
  salesIds?: mongoose.Schema.Types.ObjectId[];

  @Prop({ required: true })
  serie: string;

  @Prop({ required: true })
  folio: string;

  @Prop({ required: true, unique: true, index: true, uppercase: true })
  uuid: string; // Folio fiscal SAT (36 caracteres)

  @Prop({
    required: true,
    enum: ['draft', 'stamped', 'cancelled', 'pending_cancellation', 'error'],
    default: 'stamped',
    index: true,
  })
  status: 'draft' | 'stamped' | 'cancelled' | 'pending_cancellation' | 'error';

  @Prop({ required: true })
  subtotal: number;

  @Prop({ required: true, default: 0 })
  taxAmount: number; // Total IVA

  @Prop({ required: true })
  total: number;

  @Prop({ default: 'MXN' })
  currency: string;

  @Prop({ required: true })
  paymentMethod: string; // SAT FormaPago: '01', '03', '04', '28', etc.

  @Prop({ required: true, enum: ['PUE', 'PPD'], default: 'PUE' })
  paymentType: 'PUE' | 'PPD'; // SAT MetodoPago

  @Prop({
    type: {
      rfc: { type: String, required: true },
      legalName: { type: String, required: true },
      taxRegime: { type: String, required: true },
      postalCode: { type: String, required: true },
    },
    required: true,
  })
  emisor: {
    rfc: string;
    legalName: string;
    taxRegime: string;
    postalCode: string;
  };

  @Prop({
    type: {
      rfc: { type: String, required: true },
      legalName: { type: String, required: true },
      taxRegime: { type: String, required: true },
      postalCode: { type: String, required: true },
      cfdiUse: { type: String, required: true },
      email: { type: String, required: false },
    },
    required: true,
  })
  receptor: {
    rfc: string;
    legalName: string;
    taxRegime: string;
    postalCode: string;
    cfdiUse: string;
    email?: string;
  };

  @Prop([
    {
      noIdentificacion: String,
      claveProdServ: { type: String, required: true },
      claveUnidad: { type: String, required: true },
      unidad: { type: String, required: true },
      cantidad: { type: Number, required: true },
      descripcion: { type: String, required: true },
      valorUnitario: { type: Number, required: true },
      importe: { type: Number, required: true },
      descuento: Number,
      objetoImp: { type: String, default: '02' },
      baseIva: { type: Number, required: true },
      tasaIva: { type: Number, required: true },
      importeIva: { type: Number, required: true },
    },
  ])
  items: InvoiceItem[];

  @Prop({
    type: {
      periodicity: { type: String, enum: ['01', '02', '03', '04'] },
      months: { type: String },
      year: { type: Number },
    },
    required: false,
  })
  globalPeriodicity?: {
    periodicity: '01' | '02' | '03' | '04';
    months: string;
    year: number;
  };

  @Prop({ type: String, required: false })
  xmlContent?: string;

  @Prop({ required: true })
  pacProvider: string;

  @Prop({ type: Date, default: Date.now })
  stampedAt: Date;

  @Prop({ enum: ['01', '02', '03', '04'], required: false })
  cancellationReason?: '01' | '02' | '03' | '04';

  @Prop({ type: String, required: false })
  cancellationReplacementUuid?: string;

  @Prop({ type: Date, required: false })
  cancelledAt?: Date;

  @Prop({ type: String, required: false })
  cancellationStatusSAT?: string;

  @Prop({ type: String, required: false })
  errorMessage?: string;

  @Prop({ type: String, required: false, index: true, sparse: true })
  fiscalistoInvoiceId?: string;

  @Prop({ type: Date, required: false })
  emailSentAt?: Date;

  @Prop({ type: String, required: false })
  emailTo?: string;

  @Prop({ type: String, enum: ['sent', 'pending', 'failed'], required: false })
  emailStatus?: 'sent' | 'pending' | 'failed';

  @Prop({ type: String, required: false, index: true, unique: true, sparse: true })
  idempotencyKey?: string;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
InvoiceSchema.index({ restaurantId: 1, createdAt: -1 });
InvoiceSchema.index({ restaurantId: 1, type: 1 });
InvoiceSchema.index({ saleId: 1 });
