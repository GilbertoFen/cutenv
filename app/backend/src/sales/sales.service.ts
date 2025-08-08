import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Sale, SaleDocument } from '../schemasMongo/sale.schema';
import { Model } from 'mongoose';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleResponseDto } from './dto/sale-response.dto';
import { SalePopulated } from './interfaces/sale-populated.interface';
import { Order, OrderDocument } from '../schemasMongo/order.schema';
import { Table, TableDocument } from '../schemasMongo/table.schema';

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Table.name) private tableModel: Model<TableDocument>
  ) {}

  async getAllSales(): Promise<SaleResponseDto[]> {
    try{
      const sales = await this.saleModel
        .find()
        .populate({
          path: 'orders',
          populate: { path: 'items.recipe' },
        }) as unknown as SalePopulated[];

      return sales.map(sale => ({
        id: sale._id.toString() as any,
        totalAmount: sale.totalAmount,
        orders: sale.orders.map(order => ({
          items: order.items.map(item => ({
            recipe: item.recipe['name'],
            quantity: item.quantity,
            price: item.recipe['price'],
          })),
          tableNumber: order.table.number,
          total: order.total,
        })), 
        folio: sale.folio,
        date: sale.date
      }));
    } catch (e) {
        throw e;
    }
  }
  async searchSales(query: any): Promise<SaleResponseDto[]> {
    try{
      const mongoQuery: any = {};
      if (query.folio) {
        mongoQuery.folio = query.folio;
      }
      if(query._id){
        mongoQuery._id = query._id; 
      }

      if (query.status) {
        mongoQuery.status = query.status;
      }

      if (query.totalAmount) {
        mongoQuery.totalAmount = Number(query.totalAmount);
      }

      if (query.table) {
        mongoQuery.table = query.table;
      }

      const sales = await this.saleModel
        .find(mongoQuery)
        .populate({
          path: 'orders',
          populate: { path: 'items.recipe' },
        }) as unknown as SalePopulated[];

      return sales.map((sale) => ({
        id: sale['_id'].toString(),
        tableNumber: sale.table['number'],
        totalAmount: sale.totalAmount,
        orders: sale.orders.map((order: any) => ({
          tableNumber: order.table.number,
          total: order.total,
          items: order.items.map(item => ({
            recipe: item.recipe['name'],
            quantity: item.quantity,
            price: item.recipe['price'],
          })),
        })), 
        folio: sale.folio,
        date: sale.date
      }));
    } catch (e) {
      throw e;
    }
  }


  async getSaleById(id: string): Promise<SaleResponseDto> {
    try{
      const sale = await this.saleModel
        .findById(id)
        .populate({
          path: 'orders',
          populate: { path: 'items.recipe' },
        }) as unknown as SalePopulated;

      if (!sale) throw new NotFoundException('Venta no encontrada');

      return {
        id: sale._id.toString()!,
        totalAmount: sale.totalAmount,
        orders: sale.orders.map(order => ({
          tableNumber: order.table.number,
          items: order.items.map(item => ({
            recipe: item.recipe['name'],
            quantity: item.quantity,
            price: item.recipe['price'],
          })),
          total: order.total,
      
        })), 
        folio: sale.folio,
        date: sale.date
      };
    }catch (e) {
        throw e;
    }
  }

  async createSale(dto: CreateSaleDto) {
    try{
      const existingSale = await this.saleModel.findOne({
        table: dto.table,
        status: 'unpaid' 
      });
      if (existingSale) {
        throw new Error('Ya existe una venta pendiente para esta mesa');
      }
      const created = new this.saleModel(dto);
      return await created.save();
    } catch (e) {
      throw e;
    }
  }
  /// Simulado haciendo la peticion a un servidor de Flask que imprime el ticket no se necesita printTicket

  async printTicket(saleId: string): Promise<void> {
    try {
      const response = await fetch(`http://localhost:3000/api/sales/search?_id=${saleId}`);
      const sales = await response.json();

      if (!Array.isArray(sales) || sales.length === 0) {
        throw new Error('Venta no encontrada');
      }

      const sale = sales[0];

      const printRes = await fetch('http://localhost:5000/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ venta: sale })
      });

      const result = await printRes.json();

      if (result.ok) {
        console.log('Ticket impreso');
      } else {
        console.error('Error en impresion:', result.error);
      }
    } catch (error) {
      console.error('Error al imprimir ticket:', error.message);
      throw error;
    }
}

  async paySale(saleId: string) {
    try{
      const sale = await this.saleModel
        .findById(saleId)
        .populate({
          path: 'orders',
          model: 'Order'
        })
        .populate('table');

      if (!sale) throw new NotFoundException('Venta no encontrada');
      if (sale.status === 'paid') throw new ConflictException('La venta ya ha sido pagada');

      const orders = sale.orders as unknown as OrderDocument[];

      await Promise.all(
        orders.map(async (order) => {
          order.status = 'delivered';
          await order.save();
        })
      );
      //  //  //  //  //  //  //  //  Falta la fecha en un formato legible
      sale.status = 'paid'; 
      sale.date = new Date();
      await sale.save();

      const table = await this.tableModel.findById(sale.table);
      if (table) {
        table.status = 'disponible';
        await table.save();
      }

      return { message: 'Venta pagada, ordenes entregadas y mesa liberada' };
    } catch (e) {
      throw e;
    }
  }
}
