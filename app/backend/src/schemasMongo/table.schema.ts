import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TableDocument = Table & Document;

@Schema({ timestamps: true })
export class Table {
  @Prop({ required: true, unique: true })
  number: number; 

  @Prop({ default: 'available', enum: ['disponible', 'ocupada', 'reservada'] })
  status: string;

  @Prop({ required: true, min: 1 })
  capacity: number;
}

export const TableSchema = SchemaFactory.createForClass(Table);