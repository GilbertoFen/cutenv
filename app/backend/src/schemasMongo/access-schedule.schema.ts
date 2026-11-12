import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AccessScheduleDocument = HydratedDocument<AccessSchedule> & { _id: Types.ObjectId };

export interface DaySchedule {
  dayOfWeek: number; // 0=Domingo, 1=Lunes, ..., 6=Sábado
  dayName: string;
  enabled: boolean;
  openTime: string; // "08:00"
  closeTime: string; // "23:00" o "02:00" (cruza medianoche)
}

@Schema({ timestamps: true })
export class AccessSchedule {
  @Prop({ type: Types.ObjectId, ref: 'Restaurant', required: true, unique: true })
  restaurant: Types.ObjectId;

  @Prop({
    type: [
      {
        dayOfWeek: { type: Number, required: true },
        dayName: { type: String, required: true },
        enabled: { type: Boolean, default: true },
        openTime: { type: String, default: '08:00' },
        closeTime: { type: String, default: '23:00' },
      },
    ],
    default: [
      { dayOfWeek: 1, dayName: 'Lunes', enabled: true, openTime: '08:00', closeTime: '23:00' },
      { dayOfWeek: 2, dayName: 'Martes', enabled: true, openTime: '08:00', closeTime: '23:00' },
      { dayOfWeek: 3, dayName: 'Miércoles', enabled: true, openTime: '08:00', closeTime: '23:00' },
      { dayOfWeek: 4, dayName: 'Jueves', enabled: true, openTime: '08:00', closeTime: '23:00' },
      { dayOfWeek: 5, dayName: 'Viernes', enabled: true, openTime: '08:00', closeTime: '23:00' },
      { dayOfWeek: 6, dayName: 'Sábado', enabled: true, openTime: '08:00', closeTime: '23:00' },
      { dayOfWeek: 0, dayName: 'Domingo', enabled: true, openTime: '08:00', closeTime: '23:00' },
    ],
  })
  weeklySchedule: DaySchedule[];

  @Prop({ default: 'America/Mexico_City' })
  timezone: string;
}

export const AccessScheduleSchema = SchemaFactory.createForClass(AccessSchedule);

