import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { DaySchedule } from './access-schedule.schema';

export type UserDocument = HydratedDocument<User> & { _id: Types.ObjectId };

export interface IndividualSchedule {
  enabled: boolean;
  weeklySchedule: DaySchedule[];
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  username: string;

  @Prop({ lowercase: true, trim: true, sparse: true, index: true })
  email?: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  lastName?: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, enum: ['owner', 'manager', 'worker'], default: 'worker', index: true })
  role: 'owner' | 'manager' | 'worker';

  @Prop({
    enum: ['mesero', 'cocinero', 'cajero', 'recepcionista', 'general'],
    default: 'mesero',
  })
  operationalRole?: 'mesero' | 'cocinero' | 'cajero' | 'recepcionista' | 'general';

  @Prop({ required: true, enum: ['active', 'inactive'], default: 'active', index: true })
  status: 'active' | 'inactive';

  @Prop({ type: Types.ObjectId, ref: 'Restaurant', required: false, index: true })
  restaurant?: Types.ObjectId;

  @Prop({
    type: {
      enabled: { type: Boolean, default: false },
      weeklySchedule: {
        type: [
          {
            dayOfWeek: Number,
            dayName: String,
            enabled: Boolean,
            openTime: String,
            closeTime: String,
          },
        ],
        default: [],
      },
    },
    default: { enabled: false, weeklySchedule: [] },
  })
  individualSchedule?: IndividualSchedule;

  @Prop({ sparse: true, index: true })
  invitationToken?: string;

  @Prop()
  invitationExpiresAt?: Date;

  @Prop({ default: false })
  invitationUsed?: boolean;

  @Prop({ sparse: true, index: true })
  passwordResetToken?: string;

  @Prop()
  passwordResetExpiresAt?: Date;

  @Prop({
    type: {
      status: {
        type: String,
        enum: ['pending', 'authorized', 'rejected', 'completed'],
        default: null,
      },
      requestedAt: { type: Date, default: null },
      reason: { type: String, default: null },
      authorizedBy: { type: Types.ObjectId, ref: 'User', default: null },
      authorizedAt: { type: Date, default: null },
      rejectedBy: { type: Types.ObjectId, ref: 'User', default: null },
      rejectedAt: { type: Date, default: null },
    },
    default: null,
  })
  passwordResetRequest?: {
    status?: 'pending' | 'authorized' | 'rejected' | 'completed';
    requestedAt?: Date;
    reason?: string;
    authorizedBy?: Types.ObjectId;
    authorizedAt?: Date;
    rejectedBy?: Types.ObjectId;
    rejectedAt?: Date;
  };

  @Prop({ index: true })
  lastActivity?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ restaurant: 1, role: 1 });
