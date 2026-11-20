import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document , HydratedDocument, Types} from 'mongoose';

export type TableType = 'fisica' | 'para_llevar' | 'domicilio' | 'telefonico';

export type TableDocument = HydratedDocument<Table> & { _id: Types.ObjectId };
@Schema({ timestamps: true })
export class Table {
  @Prop({ required: true, unique: true })
  number: number; 

  @Prop({ default: 'disponible', enum: ['disponible', 'ocupada', 'reservada', 'completada'] })
  status: string;

  @Prop({ required: true, min: 1, default: 1 })
  capacity: number;

  @Prop({ type: Date, required: false })
  occupiedAt?: Date;

  @Prop({ default: false, index: true })
  isVirtual: boolean;

  @Prop({
    type: String,
    enum: ['fisica', 'para_llevar', 'domicilio', 'telefonico'],
    default: 'fisica',
    index: true,
  })
  tableType: TableType;

  @Prop({ type: String, required: false })
  virtualCode?: string;

  @Prop({ type: String, required: false })
  customerName?: string;

  @Prop({ type: String, required: false })
  customerPhone?: string;

  @Prop({ type: String, required: false })
  deliveryAddress?: string;

  @Prop({ type: String, required: false })
  deliveryNotes?: string;
}

export const TableSchema = SchemaFactory.createForClass(Table);
TableSchema.index({ isVirtual: 1, status: 1 });
TableSchema.index({ tableType: 1, createdAt: -1 });