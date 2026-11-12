import { Controller, Get, Param, Post, Body, Patch, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { PaySaleDto } from './dto/pay-sale.dto';
import { CancelSaleDto } from './dto/cancel-sale.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

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

  @Post(':id/calculate-promotion')
  calculatePromotion(
    @Param('id') id: string,
    @Body('promotionId') promotionId: string,
  ) {
    return this.salesService.calculatePromotionForSale(id, promotionId);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'manager')
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

  @Get('cash-cut/today')
  getCashCutToday(@Query('date') date?: string) {
    return this.salesService.getCashCutData(date);
  }

  @Get('cash-cut/pdf')
  async getCashCutPdf(@Query('date') date: string | undefined, @Res() res: Response) {
    const pdfBuffer = await this.salesService.generateCashCutPdf(date);
    const filename = `corte-de-caja-${date || new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  }

  @Get(':id')
  getSaleById(@Param('id') id: string) {
    return this.salesService.getSaleById(id);
  }
}