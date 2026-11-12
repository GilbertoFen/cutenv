import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog> & { _id: Types.ObjectId };

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'Restaurant', required: false, index: true })
  restaurant?: Types.ObjectId;

  @Prop({ default: 'system', index: true })
  userId: string;

  @Prop({ default: 'Sistema' })
  userName: string;

  @Prop({ required: true, index: true })
  action: string;

  @Prop({ required: true })
  targetType: string;

  @Prop()
  targetId?: string;

  @Prop({ type: Object })
  details?: Record<string, any>;

  @Prop()
  ipAddress?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ createdAt: -1 });

