import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { OrdersService } from '../orders/orders.service';
import { InvoicingService } from '../invoicing/invoicing.service';
import { getModelToken } from '@nestjs/mongoose';
import { Order } from '../schemasMongo/order.schema';
import { Sale } from '../schemasMongo/sale.schema';
import { Table } from '../schemasMongo/table.schema';
import { Recipe } from '../schemasMongo/recipe.schema';
import { Types } from 'mongoose';

async function runVerification() {
  console.log('--- INICIANDO VERIFICACIÓN DE REFINAMIENTOS ---');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });

  const ordersService = app.get(OrdersService);
  const invoicingService = app.get(InvoicingService);
  const orderModel = app.get(getModelToken(Order.name));
  const saleModel = app.get(getModelToken(Sale.name));
  const tableModel = app.get(getModelToken(Table.name));
  const recipeModel = app.get(getModelToken(Recipe.name));

  try {
    // 1. Obtener o crear mesa de prueba
    let testTable = await tableModel.findOne({ number: 99 });
    if (!testTable) {
      testTable = await tableModel.create({
        number: 99,
        capacity: 4,
        status: 'ocupada',
      });
    }

    // 2. Obtener 2 recetas para la comanda
    const recipes = await recipeModel.find({}).limit(2);
    if (recipes.length < 2) {
      console.log('Se requieren al menos 2 recetas en base de datos para la prueba.');
      await app.close();
      return;
    }

    const r1 = recipes[0];
    const r2 = recipes[1];
    const price1 = r1.price || 50;
    const price2 = r2.price || 100;

    // 3. Crear comanda
    console.log(`[TEST 1] Creando comanda con 2 platillos: "${r1.name}" ($${price1}) y "${r2.name}" ($${price2})...`);
    const createdOrder: any = await ordersService.createOrder({
      table: testTable._id.toString(),
      items: [
        { recipe: r1._id.toString(), quantity: 1, notes: 'Bien cocido' },
        { recipe: r2._id.toString(), quantity: 1, notes: 'Sin cebolla' },
      ],
      notes: 'Mesa 99 Comanda de prueba',
    });

    console.log(`✓ Orden creada con ID: ${createdOrder._id}, Total inicial: $${createdOrder.total}`);
    if (createdOrder.total !== price1 + price2) {
      throw new Error(`Total esperado $${price1 + price2}, pero se obtuvo $${createdOrder.total}`);
    }

    // 4. Test Llamar al mesero
    const item1Id = createdOrder.items[0]._id.toString();
    console.log(`[TEST 2] Cocinero llama al mesero para el platillo 1 ("${r1.name}")...`);
    const callResult = await ordersService.callWaiter(createdOrder._id.toString(), item1Id, {
      reason: 'unavailable',
      message: 'Se terminó el insumo principal en cocina',
    });
    console.log(`✓ Llamada registrada:`, callResult.item);
    if (!callResult.item.requested || callResult.item.reason !== 'unavailable') {
      throw new Error('La llamada al mesero no se registró correctamente.');
    }

    // 5. Test Cancelación individual de platillo no disponible y recálculo de totales
    console.log(`[TEST 3] Mesero cancela el platillo no disponible...`);
    const updatedOrder: any = await ordersService.updateOrderItemStatus(
      createdOrder._id.toString(),
      item1Id,
      'cancelled'
    );
    console.log(`✓ Platillo cancelado. Nuevo total de la orden: $${updatedOrder.total}`);
    if (updatedOrder.total !== price2) {
      throw new Error(`El total debió recalcularse a $${price2}, pero dio $${updatedOrder.total}`);
    }

    // 6. Test Estado general de la comanda
    const item2Id = createdOrder.items[1]._id.toString();
    console.log(`[TEST 4] Marcando el platillo 2 como listo...`);
    const readyOrder: any = await ordersService.updateOrderItemStatus(
      createdOrder._id.toString(),
      item2Id,
      'ready'
    );
    console.log(`✓ Estado general de la orden: "${readyOrder.status}" (los cancelados no bloquearon que sea "ready")`);
    if (readyOrder.status !== 'ready') {
      throw new Error(`El estado de la orden debió ser "ready", pero es "${readyOrder.status}"`);
    }

    // 7. Test Prevención de doble facturación
    console.log(`[TEST 5] Probando prevención de facturación duplicada...`);
    const testSale = await saleModel.create({
      table: testTable._id,
      orders: [createdOrder._id],
      totalAmount: price2,
      status: 'paid',
      folio: 'V-VERIF-999',
      orderType: 'local',
      paymentMethod: 'efectivo',
      isFacturada: true,
      invoiceId: new Types.ObjectId(),
    });

    let conflictCaught = false;
    try {
      await invoicingService.issueIndividualInvoice('default-restaurant', testSale._id.toString(), {
        receptor: {
          rfc: 'XAXX010101000',
          legalName: 'PUBLICO EN GENERAL',
          postalCode: '42501',
          taxRegime: '616',
          cfdiUse: 'S01',
        },
      });
    } catch (err: any) {
      if (err.status === 409 || err.message.includes('ya cuenta con una factura')) {
        conflictCaught = true;
        console.log(`✓ Intento de refacturación rechazado correctamente con 409 Conflict: "${err.message}"`);
      } else {
        throw err;
      }
    }

    if (!conflictCaught) {
      throw new Error('Se esperaba un error de conflicto 409 al intentar facturar una venta ya facturada.');
    }

    // Limpieza
    await orderModel.findByIdAndDelete(createdOrder._id);
    await saleModel.findByIdAndDelete(testSale._id);
    console.log('--- TODAS LAS VERIFICACIONES COMPLETADAS CON ÉXITO ---');
  } catch (err) {
    console.error('Error durante la verificación:', err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runVerification();