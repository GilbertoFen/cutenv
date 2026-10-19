import { Controller, Get, Param, Post, Body, Patch, Query, } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { PaySaleDto } from './dto/pay-sale.dto';
import { CancelSaleDto } from './dto/cancel-sale.dto';
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) { }

  @Get()
  getAllSales() {
    return this.salesService.getAllSales();
  }

  @Get('search')
  searchSales(@Query() query: any) {
    console.log('[SalesController.search] query =', query);
    return this.salesService.searchSales(query);
  }

  @Post()
  createSale(@Body() dto: CreateSaleDto) {
    return this.salesService.createSale(dto);
  }
  @Patch(':id/pay')
  paySale(@Param('id') id: string, @Body() dto: PaySaleDto) {
    return this.salesService.paySale(id, dto);
  }

  @Patch(':id/cancel')
  cancelSale(@Param('id') id: string, @Body() dto: CancelSaleDto) {
    return this.salesService.cancelSale(id, dto);
  }

  @Get(':id/print')
  printTicket(@Param('id') id: string) {
    return this.salesService.printTicket(id);
  }

  @Post(':id/request-ticket')
  requestTicket(@Param('id') id: string) {
    return this.salesService.requestTicket(id);
  }

  @Post(':id/mark-printed')
  markPrinted(@Param('id') id: string) {
    return this.salesService.markPrinted(id);
  }

  @Get('/tickets')
  getPendingTickets(@Query('status') status: 'requested' | 'printed' = 'requested') {
    return this.salesService.getTicketQueue(status);
  }

  @Get(':id')
  getSaleById(@Param('id') id: string) {
    return this.salesService.getSaleById(id);
  }
}