import {
  Controller,
  Get,
  Post,
  Param,
  Patch,
  Delete,
  Body,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  getAllOrders() {
    return this.ordersService.getAllOrders();
  }
  @Get('search')
  searchOrders(@Query() query: any) {
    return this.ordersService.searchOrders(query);
  }

  @Get(':id')
  getOrderById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Post()
  createOrder(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto);
  }
  @Get('/table/:id')
async getOrdersByTable(@Param('id') id: string) {
  return this.ordersService.getOrdersByTableId(id);
}


  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateOrderStatus(id, dto);
  }

  @Patch(':id')
  updateOrder(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.ordersService.updateOrder(id, dto);
  }

  @Get('active/table/:id')
  getActiveOrdersByTable(@Param('id') id: string) {
    return this.ordersService.getActiveOrdersByTable(id);
  }

  @Post('check-stock')
  checkStock(@Body() body: { items: Array<{ recipe: string; quantity: number }> }) {
    return this.ordersService.checkRecipeAvailability(body?.items || []);
  }

  @Patch(':id/items/:itemId/status')
  updateOrderItemStatus(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body('status') status: 'preparing' | 'ready' | 'delivered' | 'cancelled',
  ) {
    return this.ordersService.updateOrderItemStatus(id, itemId, status);
  }

  @Delete(':id')
  deleteOrder(@Param('id') id: string) {
    return this.ordersService.deleteOrder(id);
  }
}
