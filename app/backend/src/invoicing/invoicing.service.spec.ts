import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { InvoicingService } from './invoicing.service';
import { PacFactory } from './pac/pac-factory';
import { MockSandboxPacAdapter } from './pac/mock-sandbox-pac.adapter';
import { FiscalConfig } from '../schemasMongo/fiscal-config.schema';
import { FiscalCustomer } from '../schemasMongo/fiscal-customer.schema';
import { Invoice } from '../schemasMongo/invoice.schema';
import { Sale } from '../schemasMongo/sale.schema';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('InvoicingService (CFDI 4.0)', () => {
  let service: InvoicingService;
  let mockPacAdapter: MockSandboxPacAdapter;

  const mockRestaurantId = 'rest-123';
  const mockFiscalConfig = {
    _id: new Types.ObjectId(),
    restaurantId: mockRestaurantId,
    rfc: 'EKU9003173C9',
    legalName: 'ESCUELA KEMPER URGATE',
    taxRegime: '601',
    postalCode: '26015',
    pacProvider: 'mock_sandbox',
    defaultClaveProdServ: '90101501',
    defaultClaveUnidad: 'E48',
    defaultIvaRate: 0.16,
    series: 'F',
    nextFolio: 101,
    isValidated: true,
    save: jest.fn().mockResolvedValue(true),
  };

  const mockSaleId = new Types.ObjectId().toString();
  const mockSale = {
    _id: new Types.ObjectId(mockSaleId),
    folio: 'V-001',
    status: 'paid',
    isFacturada: false,
    totalAmount: 116.0,
    paymentMethod: 'efectivo',
    createdAt: new Date(),
    orders: [
      {
        items: [
          {
            recipe: {
              _id: new Types.ObjectId(),
              name: 'Hamburguesa Especial',
              price: 116.0,
            },
            quantity: 1,
          },
        ],
      },
    ],
    save: jest.fn().mockResolvedValue(true),
  };

  const mockFiscalConfigModel = {
    findOne: jest.fn().mockResolvedValue(mockFiscalConfig),
  };

  const mockFiscalCustomerModel = {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) }),
  };

  const createdInvoices: any[] = [];
  const mockInvoiceModel: any = jest.fn().mockImplementation((dto) => {
    const doc = {
      ...dto,
      _id: new Types.ObjectId(),
      save: jest.fn().mockImplementation(function () {
        createdInvoices.push(this);
        return Promise.resolve(this);
      }),
    };
    return doc;
  });
  mockInvoiceModel.findOne = jest.fn().mockResolvedValue(null);
  mockInvoiceModel.find = jest.fn().mockReturnValue({
    sort: jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue([]),
    }),
  });

  const mockSaleModel = {
    findById: jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockSale),
    }),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue([mockSale]),
    }),
    findByIdAndUpdate: jest.fn().mockResolvedValue(true),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  };

  beforeEach(async () => {
    mockPacAdapter = new MockSandboxPacAdapter();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicingService,
        {
          provide: PacFactory,
          useValue: {
            getProvider: jest.fn().mockReturnValue(mockPacAdapter),
          },
        },
        { provide: getModelToken(FiscalConfig.name), useValue: mockFiscalConfigModel },
        { provide: getModelToken(FiscalCustomer.name), useValue: mockFiscalCustomerModel },
        { provide: getModelToken(Invoice.name), useValue: mockInvoiceModel },
        { provide: getModelToken(Sale.name), useValue: mockSaleModel },
      ],
    }).compile();

    mockSale.isFacturada = false;
    service = module.get<InvoicingService>(InvoicingService);
  });

  it('debe estar definido el servicio de facturación', () => {
    expect(service).toBeDefined();
  });

  describe('issueIndividualInvoice', () => {
    it('debe emitir exitosamente un CFDI 4.0 para una venta pagada y calcular subtotal e IVA correctamente', async () => {
      const receptor = {
        rfc: 'URE180429TM6',
        legalName: 'UNIVERSIDAD ROBOTICA DE EXCELENCIA',
        postalCode: '65000',
        taxRegime: '601',
        cfdiUse: 'G03',
        email: 'facturacion@ure.edu.mx',
      };

      const invoice = await service.issueIndividualInvoice(mockRestaurantId, mockSaleId, {
        receptor,
      });

      expect(invoice).toBeDefined();
      expect(invoice.uuid).toBeDefined();
      expect(invoice.uuid.length).toBe(36);
      expect(invoice.subtotal).toBe(100.0);
      expect(invoice.taxAmount).toBe(16.0);
      expect(invoice.total).toBe(116.0);
      expect(invoice.status).toBe('stamped');
      expect(invoice.xmlContent).toContain('Version="4.0"');
      expect(invoice.xmlContent).toContain('Rfc="EKU9003173C9"');
      expect(invoice.xmlContent).toContain('Rfc="URE180429TM6"');
      expect(mockSale.isFacturada).toBe(true);
    });

    it('debe rechazar la emisión si el RFC del receptor es inválido', async () => {
      const receptorInvalido = {
        rfc: 'RFC_TOTALMENTE_INVALIDO',
        legalName: 'EMPRESA FALSA',
        postalCode: '65000',
        taxRegime: '601',
        cfdiUse: 'G03',
      };

      await expect(
        service.issueIndividualInvoice(mockRestaurantId, mockSaleId, { receptor: receptorInvalido })
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si la venta ya está facturada (evitando doble timbrado)', async () => {
      const saleYaFacturada = {
        ...mockSale,
        isFacturada: true,
      };
      mockSaleModel.findById.mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue(saleYaFacturada),
      });

      const receptor = {
        rfc: 'URE180429TM6',
        legalName: 'UNIVERSIDAD ROBOTICA DE EXCELENCIA',
        postalCode: '65000',
        taxRegime: '601',
        cfdiUse: 'G03',
      };

      await expect(
        service.issueIndividualInvoice(mockRestaurantId, mockSaleId, { receptor })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('issueGlobalInvoice', () => {
    it('debe emitir exitosamente una Factura Global de Público en General con periodicidad SAT', async () => {
      const saleSinFacturar = {
        _id: new Types.ObjectId(),
        folio: 'TICKET-010',
        status: 'paid',
        isFacturada: false,
        totalAmount: 232.0,
        createdAt: new Date(),
        paymentMethod: 'efectivo',
      };

      mockSaleModel.find.mockReturnValueOnce({
        sort: jest.fn().mockResolvedValue([saleSinFacturar]),
      });

      const invoice = await service.issueGlobalInvoice(mockRestaurantId, {
        periodicity: '01', // Diario
        months: '10',
        year: 2026,
        startDate: '2026-10-01',
        endDate: '2026-10-18',
      });

      expect(invoice).toBeDefined();
      expect(invoice.uuid).toBeDefined();
      expect(invoice.type).toBe('global');
      expect(invoice.receptor.rfc).toBe('XAXX010101000');
      expect(invoice.receptor.legalName).toBe('PUBLICO EN GENERAL');
      expect(invoice.receptor.taxRegime).toBe('616');
      expect(invoice.xmlContent).toContain('Periodicidad="01"');
      expect(invoice.xmlContent).toContain('ClaveProdServ="01010101"');
      expect(invoice.xmlContent).toContain('ClaveUnidad="ACT"');
    });
  });

  describe('cancelInvoice', () => {
    it('debe cancelar una factura ante el SAT con motivo 02', async () => {
      const invoiceTimbrada: any = {
        _id: new Types.ObjectId(),
        restaurantId: mockRestaurantId,
        uuid: '12345678-1234-4234-8234-1234567890AB',
        status: 'stamped',
        type: 'individual',
        saleId: new Types.ObjectId(),
        cancellationReason: undefined,
        save: jest.fn().mockResolvedValue(true),
      };

      mockInvoiceModel.findOne.mockResolvedValueOnce(invoiceTimbrada);

      const res = await service.cancelInvoice(mockRestaurantId, invoiceTimbrada._id.toString(), {
        reason: '02',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('cancelled');
      expect(invoiceTimbrada.status).toBe('cancelled');
      expect(invoiceTimbrada.cancellationReason).toBe('02');
    });

    it('debe requerir replacementUuid si el motivo de cancelación es 01', async () => {
      const invoiceTimbrada = {
        _id: new Types.ObjectId(),
        restaurantId: mockRestaurantId,
        uuid: '12345678-1234-4234-8234-1234567890AB',
        status: 'stamped',
        type: 'individual',
      };

      mockInvoiceModel.findOne.mockResolvedValueOnce(invoiceTimbrada);

      await expect(
        service.cancelInvoice(mockRestaurantId, invoiceTimbrada._id.toString(), {
          reason: '01',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });
});
