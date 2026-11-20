import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TablesService } from './tables.service';
import { Table } from '../schemasMongo/table.schema';
import { Sale } from '../schemasMongo/sale.schema';
import { Order } from '../schemasMongo/order.schema';
import { Reservation } from '../schemasMongo/reservation.schema';
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
        { provide: getModelToken(Order.name), useValue: { find: jest.fn().mockResolvedValue([]) } },
        { provide: getModelToken(Reservation.name), useValue: { find: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null) } },
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

  describe('Mesas Virtuales (Pedidos Para Llevar, Domicilio y Telefónicos)', () => {
    it('debe crear un pedido para llevar generando código virtual, folio de venta e inicializando estado ocupado', async () => {
      const mockCreatedTable = {
        _id: new Types.ObjectId(),
        number: 1001,
        status: 'ocupada',
        capacity: 1,
        occupiedAt: new Date(),
        isVirtual: true,
        tableType: 'para_llevar',
        virtualCode: 'LL-01',
        customerName: 'Juan Pérez',
      };

      mockTableModel.countDocuments = jest.fn().mockResolvedValue(0);
      mockTableModel.exists = jest.fn().mockResolvedValue(false);
      mockTableModel.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue({ number: 10 }),
      });
      mockTableModel.create = jest.fn().mockResolvedValue(mockCreatedTable);
      mockSaleModel.create = jest.fn().mockResolvedValue({ _id: new Types.ObjectId() });

      const result = await service.createVirtualTable({
        tableType: 'para_llevar',
        customerName: 'Juan Pérez',
      });

      expect(result.isVirtual).toBe(true);
      expect(result.virtualCode).toBe('LL-01');
      expect(result.tableType).toBe('para_llevar');
      expect(result.customerName).toBe('Juan Pérez');
      expect(mockSaleModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          table: mockCreatedTable._id,
          orderType: 'para llevar',
          status: 'unpaid',
        }),
      );
      expect(mockTablesGateway.emitTableStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          tableId: mockCreatedTable._id.toString(),
          status: 'ocupada',
          isVirtual: true,
          virtualCode: 'LL-01',
        }),
      );
    });

    it('debe crear un pedido a domicilio con dirección y teléfono asignados', async () => {
      const mockCreatedTable = {
        _id: new Types.ObjectId(),
        number: 1002,
        status: 'ocupada',
        capacity: 1,
        occupiedAt: new Date(),
        isVirtual: true,
        tableType: 'domicilio',
        virtualCode: 'DOM-01',
        customerName: 'María García',
        customerPhone: '5512345678',
        deliveryAddress: 'Av. Insurgentes 123',
      };

      mockTableModel.countDocuments = jest.fn().mockResolvedValue(0);
      mockTableModel.exists = jest.fn().mockResolvedValue(false);
      mockTableModel.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue({ number: 1001 }),
      });
      mockTableModel.create = jest.fn().mockResolvedValue(mockCreatedTable);
      mockSaleModel.create = jest.fn().mockResolvedValue({ _id: new Types.ObjectId() });

      const result = await service.createVirtualTable({
        tableType: 'domicilio',
        customerName: 'María García',
        customerPhone: '5512345678',
        deliveryAddress: 'Av. Insurgentes 123',
      });

      expect(result.isVirtual).toBe(true);
      expect(result.virtualCode).toBe('DOM-01');
      expect(result.tableType).toBe('domicilio');
      expect(result.deliveryAddress).toBe('Av. Insurgentes 123');
      expect(mockSaleModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orderType: 'domicilio',
        }),
      );
    });

    it('al liberar un pedido virtual debe pasar a estado "completada" para no reutilizarse', async () => {
      const virtualTableId = new Types.ObjectId().toString();
      const mockVirtualTable = {
        _id: new Types.ObjectId(virtualTableId),
        number: 1001,
        status: 'ocupada',
        isVirtual: true,
        tableType: 'para_llevar',
        virtualCode: 'LL-01',
        save: jest.fn().mockResolvedValue(true),
      };

      mockTableModel.findById.mockResolvedValue(mockVirtualTable);
      mockSaleModel.findOne.mockResolvedValue(null); // Venta ya liquidada

      const result = await service.updateTableStatus(virtualTableId, { status: 'disponible' });

      expect(mockVirtualTable.status).toBe('completada');
      expect(mockVirtualTable.save).toHaveBeenCalled();
      expect(mockTablesGateway.emitTableStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          tableId: virtualTableId,
          status: 'completada',
          isVirtual: true,
          virtualCode: 'LL-01',
        }),
      );
    });

    it('no debe permitir reservar un pedido virtual', async () => {
      const virtualTableId = new Types.ObjectId().toString();
      const mockVirtualTable = {
        _id: new Types.ObjectId(virtualTableId),
        number: 1001,
        status: 'ocupada',
        isVirtual: true,
        tableType: 'para_llevar',
      };

      mockTableModel.findById.mockResolvedValue(mockVirtualTable);

      await expect(
        service.updateTableStatus(virtualTableId, { status: 'reservada' }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
