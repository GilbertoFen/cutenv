import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User> & { _id: Types.ObjectId };

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  username: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, enum: ['owner', 'manager', 'worker'], default: 'worker' })
  role: 'owner' | 'manager' | 'worker';

  @Prop({ required: true, enum: ['active', 'inactive'], default: 'active' })
  status: 'active' | 'inactive';
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ username: 1 });
