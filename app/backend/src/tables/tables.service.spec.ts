import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TablesService } from './tables.service';
import { Table } from '../schemasMongo/table.schema';
import { Sale } from '../schemasMongo/sale.schema';
import { TablesGateway } from '../gateways/tables.gateway';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('TablesService', () => {
  let service: TablesService;
  let mockTableModel: any;
  let mockSaleModel: any;
  let mockTablesGateway: any;

  beforeEach(async () => {
    mockTableModel = {
      find: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
    };

    mockSaleModel = {
      findOne: jest.fn(),
      findByIdAndDelete: jest.fn(),
      create: jest.fn(),
    };

    mockTablesGateway = {
      emitTableStatusChanged: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TablesService,
        { provide: getModelToken(Table.name), useValue: mockTableModel },
        { provide: getModelToken(Sale.name), useValue: mockSaleModel },
        { provide: TablesGateway, useValue: mockTablesGateway },
      ],
    }).compile();

    service = module.get<TablesService>(TablesService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('updateTableStatus', () => {
    const tableId = new Types.ObjectId().toString();

    it('debe marcar una mesa como ocupada y crear una venta activa si no existe', async () => {
      const mockTableInstance = {
        _id: new Types.ObjectId(tableId),
        number: 5,
        status: 'disponible',
        save: jest.fn().mockResolvedValue(true),
      };

      mockTableModel.findById.mockResolvedValue(mockTableInstance);
      mockSaleModel.findOne.mockResolvedValue(null);
      mockSaleModel.create.mockResolvedValue({ _id: new Types.ObjectId() });

      const result = await service.updateTableStatus(tableId, { status: 'ocupada' });

      expect(mockTableInstance.status).toBe('ocupada');
      expect(mockSaleModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          table: mockTableInstance._id,
          orders: [],
          totalAmount: 0,
          status: 'unpaid',
        }),
      );
      expect(mockTablesGateway.emitTableStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          tableId,
          number: 5,
          prevStatus: 'disponible',
          status: 'ocupada',
        }),
      );
    });

    it('debe liberar limpiamente una mesa ocupada con venta vacía ($0 y 0 órdenes) eliminando la venta huérfana', async () => {
      const mockTableInstance = {
        _id: new Types.ObjectId(tableId),
        number: 5,
        status: 'ocupada',
        save: jest.fn().mockResolvedValue(true),
      };

      const emptySaleId = new Types.ObjectId();
      const mockActiveSale = {
        _id: emptySaleId,
        orders: [],
        totalAmount: 0,
        status: 'unpaid',
      };

      mockTableModel.findById.mockResolvedValue(mockTableInstance);
      mockSaleModel.findOne.mockResolvedValue(mockActiveSale);
      mockSaleModel.findByIdAndDelete.mockResolvedValue(mockActiveSale);

      await service.updateTableStatus(tableId, { status: 'disponible' });

      expect(mockSaleModel.findByIdAndDelete).toHaveBeenCalledWith(emptySaleId);
      expect(mockTableInstance.status).toBe('disponible');
      expect(mockTablesGateway.emitTableStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          tableId,
          status: 'disponible',
        }),
      );
    });

    it('debe lanzar ConflictException si se intenta liberar una mesa con órdenes pendientes o consumo activo', async () => {
      const mockTableInstance = {
        _id: new Types.ObjectId(tableId),
        number: 5,
        status: 'ocupada',
        save: jest.fn().mockResolvedValue(true),
      };

      const mockActiveSale = {
        _id: new Types.ObjectId(),
        orders: [new Types.ObjectId()],
        totalAmount: 350,
        status: 'unpaid',
      };

      mockTableModel.findById.mockResolvedValue(mockTableInstance);
      mockSaleModel.findOne.mockResolvedValue(mockActiveSale);

      await expect(
        service.updateTableStatus(tableId, { status: 'disponible' }),
      ).rejects.toThrow(ConflictException);

      expect(mockTableInstance.save).not.toHaveBeenCalled();
    });
  });
});
