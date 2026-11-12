import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document , HydratedDocument, Types} from 'mongoose';

export type TableDocument = HydratedDocument<Table> & { _id: Types.ObjectId };
@Schema({ timestamps: true })
export class Table {
  @Prop({ required: true, unique: true })
  number: number; 

  @Prop({ default: 'disponible', enum: ['disponible', 'ocupada', 'reservada'] })
  status: string;

  @Prop({ required: true, min: 1 })
  capacity: number;

  @Prop({ type: Date, required: false })
  occupiedAt?: Date;
}

export const TableSchema = SchemaFactory.createForClass(Table);