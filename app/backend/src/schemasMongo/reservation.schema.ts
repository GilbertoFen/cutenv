import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

import { Types } from 'mongoose';


export type ReservationDocument = HydratedDocument<Reservation> & { _id: Types.ObjectId };

@Schema({ timestamps: true })
export class Reservation {
  @Prop({ type: Types.ObjectId, ref: 'Table', required: false })
  table?: Types.ObjectId;

  @Prop() customerName?: string;
  @Prop() phone?: string;
  @Prop() partySize?: number;

  @Prop({ type: Date, required: true }) startTime: Date;
  @Prop({ type: Date, required: true }) endTime: Date;

  @Prop({ enum: ['programada','sentada','cancelada','no_asistencia','expirada'], default: 'programada' })
  status: string;

  @Prop() notes?: string;
}
export const ReservationSchema = SchemaFactory.createForClass(Reservation);
ReservationSchema.index({ table: 1, startTime: 1, endTime: 1 });
