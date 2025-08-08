import {Controller, Get, Param, Post, Body, Patch, Query, } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  getAllSales() {
    return this.salesService.getAllSales();
  }

  @Get('search')
  searchSales(@Query() query: any) {
    return this.salesService.searchSales(query);
  }


  @Get(':id')
  getSaleById(@Param('id') id: string) {
    return this.salesService.getSaleById(id);
  }

  @Post()
  createSale(@Body() dto: CreateSaleDto) {
    return this.salesService.createSale(dto);
  }
   @Patch(':id/pay')
  paySale(@Param('id') id: string) {
    return this.salesService.paySale(id);
  }

  @Get(':id/print')
  printTicket(@Param('id') id: string) {
    return this.salesService.printTicket(id);
  }
  

}
