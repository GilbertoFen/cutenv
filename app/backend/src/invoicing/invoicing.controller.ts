import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { InvoicingService } from './invoicing.service';
import { SaveFiscalConfigDto } from './dto/fiscal-config.dto';
import { IssueIndividualInvoiceDto } from './dto/issue-invoice.dto';
import { IssueGlobalInvoiceDto } from './dto/issue-global-invoice.dto';
import { CancelInvoiceDto } from './dto/cancel-invoice.dto';
import { SaveFiscalCustomerDto } from './dto/fiscal-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  SAT_REGIMENES_FISCALES,
  SAT_USOS_CFDI,
  SAT_FORMAS_PAGO,
  SAT_METODOS_PAGO,
  SAT_PERIODICIDADES,
  SAT_MESES,
  SAT_MOTIVOS_CANCELACION,
} from './catalogs/sat-catalogs';

@Controller('invoicing')
export class InvoicingController {
  constructor(private readonly invoicingService: InvoicingService) {}

  private getRestaurantId(headers: Record<string, any>): string {
    return headers['x-restaurant-id'] || 'default-restaurant';
  }

  // ==========================================
  // CONFIGURACIÓN FISCAL
  // ==========================================

  @Get('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'manager')
  async getConfig(@Headers() headers: Record<string, any>) {
    return this.invoicingService.getFiscalConfig(this.getRestaurantId(headers));
  }

  @Post('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'manager')
  async saveConfig(@Headers() headers: Record<string, any>, @Body() dto: SaveFiscalConfigDto) {
    return this.invoicingService.saveFiscalConfig(this.getRestaurantId(headers), dto);
  }

  @Post('config/validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'manager')
  async validatePac(@Headers() headers: Record<string, any>) {
    return this.invoicingService.validatePacCredentials(this.getRestaurantId(headers));
  }

  // ==========================================
  // EMISIÓN DE FACTURAS
  // ==========================================

  @Post('issue/sale/:saleId')
  async issueIndividual(
    @Headers() headers: Record<string, any>,
    @Param('saleId') saleId: string,
    @Body() dto: IssueIndividualInvoiceDto
  ) {
    return this.invoicingService.issueIndividualInvoice(this.getRestaurantId(headers), saleId, dto);
  }

  @Get('global/preview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'manager')
  async previewGlobal(
    @Headers() headers: Record<string, any>,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.invoicingService.previewGlobalInvoice(this.getRestaurantId(headers), startDate, endDate);
  }

  @Post('issue/global')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'manager')
  async issueGlobal(@Headers() headers: Record<string, any>, @Body() dto: IssueGlobalInvoiceDto) {
    return this.invoicingService.issueGlobalInvoice(this.getRestaurantId(headers), dto);
  }

  // ==========================================
  // HISTORIAL, CONSULTA Y DESCARGAS
  // ==========================================

  @Get('invoices')
  async getInvoices(@Headers() headers: Record<string, any>, @Query() query: any) {
    return this.invoicingService.getInvoices(this.getRestaurantId(headers), query);
  }

  @Get('invoices/:id')
  async getInvoiceById(@Headers() headers: Record<string, any>, @Param('id') id: string) {
    return this.invoicingService.getInvoiceById(this.getRestaurantId(headers), id);
  }

  @Get('invoices/:id/xml')
  async downloadXml(
    @Headers() headers: Record<string, any>,
    @Param('id') id: string,
    @Res() res: Response
  ) {
    const xml = await this.invoicingService.getInvoiceXml(this.getRestaurantId(headers), id);
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="CFDI_${id}.xml"`);
    res.send(xml);
  }

  @Get('invoices/:id/pdf')
  async downloadPdf(
    @Headers() headers: Record<string, any>,
    @Param('id') id: string,
    @Res() res: Response
  ) {
    const pdfBuffer = await this.invoicingService.generateInvoicePdf(this.getRestaurantId(headers), id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="CFDI_${id}.pdf"`);
    res.send(pdfBuffer);
  }

  @Post('invoices/:id/send')
  async sendInvoice(
    @Headers() headers: Record<string, any>,
    @Param('id') id: string,
    @Body() body: { email?: string }
  ) {
    return this.invoicingService.sendInvoiceEmail(this.getRestaurantId(headers), id, body?.email);
  }

  @Post('invoices/:id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'manager')
  async cancelInvoice(
    @Headers() headers: Record<string, any>,
    @Param('id') id: string,
    @Body() dto: CancelInvoiceDto
  ) {
    return this.invoicingService.cancelInvoice(this.getRestaurantId(headers), id, dto);
  }

  // ==========================================
  // CLIENTES FISCALES
  // ==========================================

  @Get('customers')
  async getCustomers(@Headers() headers: Record<string, any>, @Query('q') q?: string) {
    return this.invoicingService.getFiscalCustomers(this.getRestaurantId(headers), q);
  }

  @Post('customers')
  async saveCustomer(@Headers() headers: Record<string, any>, @Body() dto: SaveFiscalCustomerDto) {
    return this.invoicingService.saveFiscalCustomer(this.getRestaurantId(headers), dto);
  }

  // ==========================================
  // CATÁLOGOS OFICIALES SAT
  // ==========================================

  @Get('catalogs')
  getCatalogs() {
    return {
      regimenes: SAT_REGIMENES_FISCALES,
      usosCfdi: SAT_USOS_CFDI,
      formasPago: SAT_FORMAS_PAGO,
      metodosPago: SAT_METODOS_PAGO,
      periodicidades: SAT_PERIODICIDADES,
      meses: SAT_MESES,
      motivosCancelacion: SAT_MOTIVOS_CANCELACION,
    };
  }
}
