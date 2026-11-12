import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvoicingController } from './invoicing.controller';
import { InvoicingService } from './invoicing.service';
import { FiscalistoService } from './fiscalisto.service';
import { FiscalistoPacAdapter } from './pac/fiscalisto-pac.adapter';
import { PacFactory } from './pac/pac-factory';
import { MockSandboxPacAdapter } from './pac/mock-sandbox-pac.adapter';
import { FiscalConfig, FiscalConfigSchema } from '../schemasMongo/fiscal-config.schema';
import { FiscalCustomer, FiscalCustomerSchema } from '../schemasMongo/fiscal-customer.schema';
import { Invoice, InvoiceSchema } from '../schemasMongo/invoice.schema';
import { Sale, SaleSchema } from '../schemasMongo/sale.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FiscalConfig.name, schema: FiscalConfigSchema },
      { name: FiscalCustomer.name, schema: FiscalCustomerSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Sale.name, schema: SaleSchema },
    ]),
  ],
  controllers: [InvoicingController],
  providers: [InvoicingService, FiscalistoService, FiscalistoPacAdapter, PacFactory, MockSandboxPacAdapter],
  exports: [InvoicingService, FiscalistoService],
})
export class InvoicingModule {}
