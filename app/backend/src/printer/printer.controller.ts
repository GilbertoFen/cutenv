import { Controller, Get, Post, Body } from '@nestjs/common';
import { PrinterService, PrinterStatusDto } from './printer.service';

@Controller('printer')
export class PrinterController {
  constructor(private readonly printerService: PrinterService) {}

  @Get('status')
  async getStatus(): Promise<PrinterStatusDto> {
    return this.printerService.getStatus();
  }

  @Get('printers')
  async getPrinters(): Promise<{ printers: string[] }> {
    const printers = await this.printerService.getSystemPrinters();
    return { printers };
  }

  @Post('print')
  async printSale(@Body() body: { sale: any; options?: any }) {
    const { sale, options } = body;
    return this.printerService.printSale(sale, options);
  }

  @Post('print-kitchen')
  async printKitchen(@Body() body: { order: any; options?: any }) {
    const { order, options } = body;
    return this.printerService.printKitchen(order, options);
  }
}

