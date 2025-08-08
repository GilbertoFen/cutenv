import { HydratedDocument, Types } from 'mongoose';
import { Sale } from '../../schemasMongo/sale.schema';
import { Order } from '../../schemasMongo/order.schema';
import { Table } from '../../schemasMongo/table.schema';

export interface OrderPopulated extends Omit<Order, 'table'> {
  table: Table; 
}

export type SalePopulated = HydratedDocument<Omit<Sale, 'table' | 'orders'>> & {
  table: Table;
  orders: OrderPopulated[];
};
