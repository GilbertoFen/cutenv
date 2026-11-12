import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FiscalConfigDocument = HydratedDocument<FiscalConfig> & { _id: Types.ObjectId };

@Schema({ timestamps: true })
export class FiscalConfig {
  @Prop({ required: true, default: 'default-restaurant' })
  restaurantId: string;

  @Prop({ required: true, uppercase: true, trim: true })
  rfc: string;

  @Prop({ required: true, trim: true })
  legalName: string;

  @Prop({ required: true, trim: true })
  taxRegime: string; // ej. '601', '612', '626'

  @Prop({ required: true, trim: true, length: 5 })
  postalCode: string; // LugarExpedicion (CP de 5 dígitos)

  @Prop({ required: true, enum: ['facturama', 'finkok', 'mock_sandbox', 'fiscalisto'], default: 'fiscalisto' })
  pacProvider: 'facturama' | 'finkok' | 'mock_sandbox' | 'fiscalisto';

  @Prop({ trim: true, default: '' })
  pacUsername: string;

  // Se almacena encriptado/protegido en backend, nunca se expone al cliente
  @Prop({ trim: true, default: '' })
  pacPasswordEncrypted: string;

  @Prop({ required: true, enum: ['sandbox', 'production'], default: 'sandbox' })
  environment: 'sandbox' | 'production';

  @Prop({ default: '90101501' }) // 90101501 - Restaurantes
  defaultClaveProdServ: string;

  @Prop({ default: 'E48' }) // E48 - Unidad de servicio
  defaultClaveUnidad: string;

  @Prop({ default: 0.16 }) // IVA 16% general
  defaultIvaRate: number;

  @Prop({ default: 'F' })
  series: string;

  @Prop({ default: 1 })
  nextFolio: number;

  @Prop({ default: false })
  isValidated: boolean;

  @Prop()
  certificateNumber?: string;
}

export const FiscalConfigSchema = SchemaFactory.createForClass(FiscalConfig);
FiscalConfigSchema.index({ restaurantId: 1 }, { unique: true });
