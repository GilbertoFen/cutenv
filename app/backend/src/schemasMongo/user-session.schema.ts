import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserSessionDocument = HydratedDocument<UserSession> & { _id: Types.ObjectId };

@Schema({ timestamps: true })
export class UserSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Restaurant', required: false, index: true })
  restaurant?: Types.ObjectId;

  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  role: string;

  @Prop({ required: true, unique: true, index: true })
  sessionToken: string;

  @Prop({ required: true, default: true, index: true })
  isActive: boolean;

  @Prop({ required: true, default: Date.now, index: true })
  lastHeartbeat: Date;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop()
  revokedAt?: Date;

  @Prop()
  revokedReason?: string;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;
}

export const UserSessionSchema = SchemaFactory.createForClass(UserSession);

