import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RestaurantDocument = HydratedDocument<Restaurant> & { _id: Types.ObjectId };

@Schema({ timestamps: true })
export class Restaurant {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  code: string;

  @Prop({ required: true, enum: ['active', 'inactive'], default: 'active' })
  status: 'active' | 'inactive';

  @Prop({ default: 'America/Mexico_City', trim: true })
  timezone: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ default: 'root' })
  createdBy: string;
}

export const RestaurantSchema = SchemaFactory.createForClass(Restaurant);

