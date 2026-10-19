import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FiscalCustomerDocument = HydratedDocument<FiscalCustomer> & { _id: Types.ObjectId };

@Schema({ timestamps: true })
export class FiscalCustomer {
  @Prop({ required: true, default: 'default-restaurant', index: true })
  restaurantId: string;

  @Prop({ required: true, uppercase: true, trim: true, index: true })
  rfc: string;

  @Prop({ required: true, uppercase: true, trim: true })
  legalName: string;

  @Prop({ required: true, trim: true, length: 5 })
  postalCode: string;

  @Prop({ required: true, trim: true })
  taxRegime: string; // ej. '601', '605', '616', etc.

  @Prop({ required: true, trim: true })
  cfdiUse: string; // ej. 'G03', 'S01', 'G01', etc.

  @Prop({ trim: true, lowercase: true })
  email?: string;

  @Prop({ trim: true })
  phone?: string;
}

export const FiscalCustomerSchema = SchemaFactory.createForClass(FiscalCustomer);
FiscalCustomerSchema.index({ restaurantId: 1, rfc: 1 });
