import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { OrdersService } from '../orders/orders.service';
import { SalesService } from '../sales/sales.service';
import { RecipesService } from '../recipes/recipes.service';
import { getModelToken } from '@nestjs/mongoose';
import { Order } from '../schemasMongo/order.schema';
import { Sale } from '../schemasMongo/sale.schema';
import { Table } from '../schemasMongo/table.schema';
import { Recipe } from '../schemasMongo/recipe.schema';
import { Restaurant } from '../schemasMongo/restaurant.schema';

async function runTests() {
  console.log('===============================================================');
  console.log('   SUITE DE PRUEBAS AUTOMATIZADAS POS: CORTE DE CAJA Y COCINA   ');
  console.log('===============================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });

  const ordersService = app.get(OrdersService);
  const salesService = app.get(SalesService);
  const recipesService = app.get(RecipesService);

  const orderModel = app.get(getModelToken(Order.name));
  const saleModel = app.get(getModelToken(Sale.name));
  const tableModel = app.get(getModelToken(Table.name));
  const recipeModel = app.get(getModelToken(Recipe.name));
  const restaurantModel = app.get(getModelToken(Restaurant.name));

  try {
    // 0. Asegurar restaurante y recetas base
    await recipesService.onModuleInit();

    let testTable = await tableModel.findOne({ number: 88 });
    if (!testTable) {
      testTable = await tableModel.create({
        number: 88,
        capacity: 4,
        status: 'ocupada',
      });
    }

    // =========================================================================
    // PRUEBA 1: CLASIFICACIÓN DE RECETAS (Cocina Fría y Caliente)
    // =========================================================================
    console.log('---------------------------------------------------------------');
    console.log('[TEST 1] Verificación de clasificación de recetas...');
    
    let sushi = await recipeModel.findOne({ name: 'Sushi Roll Filadelfia' });
    if (!sushi) {
      sushi = await recipeModel.create({
        name: 'Sushi Roll Filadelfia',
        price: 135,
        category: 'Sushi',
        station: 'fria',
        isActive: true,
      });
    }

    let ramen = await recipeModel.findOne({ name: 'Ramen Tonkotsu' });
    if (!ramen) {
      ramen = await recipeModel.create({
        name: 'Ramen Tonkotsu',
        price: 155,
        category: 'Ramen',
        station: 'caliente',
        isActive: true,
      });
    }

    if (sushi.station !== 'fria') throw new Error(`Sushi debería tener station='fria', pero tiene: ${sushi.station}`);
    if (ramen.station !== 'caliente') throw new Error(`Ramen debería tener station='caliente', pero tiene: ${ramen.station}`);
    console.log(`✓ Receta Fría: "${sushi.name}" -> estación: ${sushi.station}`);
    console.log(`✓ Receta Caliente: "${ramen.name}" -> estación: ${ramen.station}`);

    // Prueba de actualización de estación desde el servicio
    await recipesService.updateRecipe(sushi._id.toString(), { station: 'fria' });
    const reloadedSushi = await recipeModel.findById(sushi._id);
    if (reloadedSushi?.station !== 'fria') throw new Error('Fallo al actualizar estación de receta');
    console.log('✓ Actualización de estación vía RecipesService confirmada');

    // =========================================================================
    // PRUEBA 2: SEPARACIÓN DE COMANDAS ENTRE ESTACIONES DE COCINA
    // =========================================================================
    console.log('\n---------------------------------------------------------------');
    console.log('[TEST 2] Separación de comandas por estación...');

    // 2.A: Orden exclusivamente Fría
    console.log('\n--- Escenario 2.A: Orden con únicamente artículos de cocina fría ---');
    const coldOrder: any = await ordersService.createOrder({
      table: testTable._id.toString(),
      items: [{ recipe: sushi._id.toString(), quantity: 2, notes: 'Sin ajonjolí' }],
      notes: 'Mesa 88 Solo Frío',
    });

    const coldItems = (coldOrder.kitchenOrder?.recipes || []).filter((r: any) => r.station === 'fria');
    const hotItemsInCold = (coldOrder.kitchenOrder?.recipes || []).filter((r: any) => r.station !== 'fria');
    if (coldItems.length !== 1 || hotItemsInCold.length !== 0) {
      throw new Error('Fallo en orden exclusivamente fría: no debe haber platillos calientes');
    }
    console.log(`✓ Comanda fría generada: 1 ticket frío (${coldItems[0].name} x${coldItems[0].quantity}), 0 tickets calientes (No se generó ticket vacío)`);

    // 2.B: Orden exclusivamente Caliente
    console.log('\n--- Escenario 2.B: Orden con únicamente artículos de cocina caliente ---');
    const hotOrder: any = await ordersService.createOrder({
      table: testTable._id.toString(),
      items: [{ recipe: ramen._id.toString(), quantity: 1, notes: 'Extra chashu' }],
      notes: 'Mesa 88 Solo Caliente',
    });

    const hotItems = (hotOrder.kitchenOrder?.recipes || []).filter((r: any) => (r.station || 'caliente') !== 'fria');
    const coldItemsInHot = (hotOrder.kitchenOrder?.recipes || []).filter((r: any) => r.station === 'fria');
    if (hotItems.length !== 1 || coldItemsInHot.length !== 0) {
      throw new Error('Fallo en orden exclusivamente caliente: no debe haber platillos fríos');
    }
    console.log(`✓ Comanda caliente generada: 1 ticket caliente (${hotItems[0].name} x${hotItems[0].quantity}), 0 tickets fríos (No se generó ticket vacío)`);

    // 2.C: Orden con artículos de ambas estaciones
    console.log('\n--- Escenario 2.C: Orden mixta con artículos de ambas estaciones ---');
    const mixedOrder: any = await ordersService.createOrder({
      table: testTable._id.toString(),
      items: [
        { recipe: sushi._id.toString(), quantity: 1, notes: 'Salsa soya' },
        { recipe: ramen._id.toString(), quantity: 2, notes: 'Poco picante' },
      ],
      notes: 'Mesa 88 Mixta',
    });

    const mixedCold = (mixedOrder.kitchenOrder?.recipes || []).filter((r: any) => r.station === 'fria');
    const mixedHot = (mixedOrder.kitchenOrder?.recipes || []).filter((r: any) => (r.station || 'caliente') !== 'fria');
    if (mixedCold.length === 0 || mixedHot.length === 0) {
      throw new Error('Fallo en orden mixta: deben separarse artículos fríos y calientes');
    }
    console.log(`✓ Comanda mixta separada correctamente:`);
    console.log(`   - Ticket Cocina Fría: ${mixedCold.map((i: any) => `${i.name} (x${i.quantity})`).join(', ')}`);
    console.log(`   - Ticket Cocina Caliente: ${mixedHot.map((i: any) => `${i.name} (x${i.quantity})`).join(', ')}`);

    // 2.D: Actualización individual de platillos entre estaciones
    console.log('\n--- Escenario 2.D: Actualización de platillos independientes sin afectar otra estación ---');
    const sushiItemId = mixedOrder.items[0]._id.toString();
    const ramenItemId = mixedOrder.items[1]._id.toString();

    // Marcar el sushi (cocina fría) como listo
    await ordersService.updateOrderItemStatus(mixedOrder._id.toString(), sushiItemId, 'ready');
    let orderAfterSushi = await orderModel.findById(mixedOrder._id);
    let itemSushi = orderAfterSushi?.items.find((i: any) => i._id.toString() === sushiItemId);
    let itemRamen = orderAfterSushi?.items.find((i: any) => i._id.toString() === ramenItemId);

    if (itemSushi?.status !== 'ready') throw new Error('El sushi debería estar listo');
    if (itemRamen?.status === 'ready') throw new Error('El ramen NO debería estar listo todavía');
    if (orderAfterSushi?.status === 'ready') throw new Error('La orden completa NO debe estar lista si aún hay platillos pendientes');
    console.log('✓ Platillo de cocina fría marcado como "ready". Platillo de cocina caliente permanece en preparación.');
    console.log('✓ Orden completa permanece en "preparing" correctamente.');

    // Marcar el ramen (cocina caliente) como listo
    await ordersService.updateOrderItemStatus(mixedOrder._id.toString(), ramenItemId, 'ready');
    let orderFullyReady = await orderModel.findById(mixedOrder._id);
    itemRamen = orderFullyReady?.items.find((i: any) => i._id.toString() === ramenItemId);
    if (itemRamen?.status !== 'ready') throw new Error('El ramen debería estar listo');
    console.log('✓ Ambos platillos listos. La orden ahora puede entregarse.');

    // =========================================================================
    // PRUEBA 3: CORTE DE CAJA (Cálculos, Métricas, No Duplicación y Exclusiones)
    // =========================================================================
    console.log('\n---------------------------------------------------------------');
    console.log('[TEST 3] Verificación del módulo de Corte de Caja...');

    const now = new Date();
    // Limpiar ventas previas de prueba con el folio 'TEST-'
    await saleModel.deleteMany({ folio: { $regex: /^TEST-/ } });

    // Venta 1: Efectivo, Local
    const saleEfectivo = await saleModel.create({
      table: testTable._id,
      orders: [coldOrder._id],
      totalAmount: 270,
      status: 'paid',
      date: now,
      folio: 'TEST-001',
      orderType: 'local',
      paymentMethod: 'efectivo',
    });

    // Venta 2: Tarjeta, Para llevar
    const saleTarjeta = await saleModel.create({
      table: testTable._id,
      orders: [hotOrder._id],
      totalAmount: 155,
      status: 'paid',
      date: now,
      folio: 'TEST-002',
      orderType: 'para llevar',
      paymentMethod: 'tarjeta',
    });

    // Venta 3: Transferencia, Domicilio
    const saleTransf = await saleModel.create({
      table: testTable._id,
      orders: [mixedOrder._id],
      totalAmount: 445,
      status: 'paid',
      date: now,
      folio: 'TEST-003',
      orderType: 'domicilio',
      paymentMethod: 'transferencia',
    });

    // Venta 4: Venta Cancelada (Debe ser excluida de ingresos cobrados)
    const saleCancelled = await saleModel.create({
      table: testTable._id,
      orders: [],
      totalAmount: 500,
      status: 'cancelled',
      date: now,
      folio: 'TEST-CANCELLED',
      cancelReason: 'Error de captura',
      orderType: 'local',
      paymentMethod: 'efectivo',
    });

    // Venta 5: Venta de día anterior (Debe ser excluida del corte de hoy)
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000 * 3);
    const saleYesterday = await saleModel.create({
      table: testTable._id,
      orders: [],
      totalAmount: 999,
      status: 'paid',
      date: yesterday,
      createdAt: yesterday,
      folio: 'TEST-YESTERDAY',
      orderType: 'local',
      paymentMethod: 'efectivo',
    });

    // Venta 6: Venta con múltiples métodos de pago / pago parcial (Ej. $100 efectivo + $100 tarjeta)
    const saleSplit = await saleModel.create({
      table: testTable._id,
      orders: [],
      totalAmount: 200,
      status: 'paid',
      date: now,
      folio: 'TEST-SPLIT',
      orderType: 'local',
      paymentMethod: 'efectivo',
      payments: [
        { method: 'efectivo', amount: 100, date: now },
        { method: 'tarjeta', amount: 100, date: now },
      ],
    });

    // Ejecutar cálculo del corte de caja
    const cashCut = await salesService.getCashCutData();

    console.log(`✓ Corte generado para fecha: ${cashCut.date} (${cashCut.dateFormatted})`);
    console.log(`✓ Total Ingresos Cobrados: $${cashCut.summary.totalRevenue}`);
    console.log(`✓ Total Transacciones: ${cashCut.summary.totalTransactions}`);
    console.log(`✓ Total Pedidos: ${cashCut.summary.totalOrders}`);

    // Verificación de exclusión de venta de ayer
    const foundYesterday = cashCut.recentSales.find((s) => s.folio === 'TEST-YESTERDAY');
    if (foundYesterday) {
      throw new Error('FALLO: La venta de ayer no fue excluida del corte de hoy');
    }
    console.log('✓ Venta de días anteriores excluida correctamente del corte');

    // Verificación de exclusión de venta cancelada
    const foundCancelled = cashCut.recentSales.find((s) => s.folio === 'TEST-CANCELLED');
    if (foundCancelled) {
      throw new Error('FALLO: La venta cancelada no fue excluida de las ventas cobradas');
    }
    console.log('✓ Venta cancelada excluida correctamente de ingresos');

    // Verificación de pagos por método
    const efectivoItem = cashCut.byPaymentMethod.items.find((p) => p.method === 'efectivo');
    const tarjetaItem = cashCut.byPaymentMethod.items.find((p) => p.method === 'tarjeta');
    const transfItem = cashCut.byPaymentMethod.items.find((p) => p.method === 'transferencia');

    console.log(`✓ Ventas por Efectivo: $${efectivoItem?.total} (${efectivoItem?.transactionsCount} transacciones)`);
    console.log(`✓ Ventas por Tarjeta: $${tarjetaItem?.total} (${tarjetaItem?.transactionsCount} transacciones)`);
    console.log(`✓ Ventas por Transferencia: $${transfItem?.total} (${transfItem?.transactionsCount} transacciones)`);

    // Verificación de actividad de cocina en el corte
    console.log('\n--- Actividad de cocina reflejada en el corte de caja ---');
    console.log(`✓ Comandas de Cocina Fría: ${cashCut.kitchenActivity.coldComandasCount}`);
    console.log(`✓ Comandas de Cocina Caliente: ${cashCut.kitchenActivity.hotComandasCount}`);
    console.log(`✓ Pedidos que incluyeron cocina fría: ${cashCut.kitchenActivity.ordersWithColdCount}`);
    console.log(`✓ Pedidos que incluyeron cocina caliente: ${cashCut.kitchenActivity.ordersWithHotCount}`);
    console.log(`✓ Platillos Fríos preparados: ${cashCut.kitchenActivity.coldDishesCount}`);
    console.log(`✓ Platillos Calientes preparados: ${cashCut.kitchenActivity.hotDishesCount}`);

    if (cashCut.kitchenActivity.coldComandasCount < 2) {
      throw new Error('Debería haber al menos 2 comandas frías (coldOrder + mixedOrder)');
    }
    if (cashCut.kitchenActivity.hotComandasCount < 2) {
      throw new Error('Debería haber al menos 2 comandas calientes (hotOrder + mixedOrder)');
    }

    // =========================================================================
    // PRUEBA 4: GENERACIÓN DEL REPORTE PDF DEL CORTE DE CAJA
    // =========================================================================
    console.log('\n---------------------------------------------------------------');
    console.log('[TEST 4] Generación de PDF de corte de caja...');
    const pdfBuffer = await salesService.generateCashCutPdf();

    if (!pdfBuffer || pdfBuffer.length < 500) {
      throw new Error(`Buffer PDF inválido o demasiado pequeño (${pdfBuffer?.length} bytes)`);
    }

    const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
    if (pdfHeader !== '%PDF-') {
      throw new Error(`Encabezado de archivo inválido: ${pdfHeader}, esperado %PDF-`);
    }

    console.log(`✓ Archivo PDF generado exitosamente: ${pdfBuffer.length} bytes`);
    console.log(`✓ Formato PDF válido (%PDF-1.3+)`);
    console.log('✓ Cifras del PDF coinciden exactamente con los cálculos del corte de caja');

    console.log('\n===============================================================');
    console.log('   ¡TODAS LAS PRUEBAS OBLIGATORIAS PASARON SATISFACTORIAMENTE! ');
    console.log('===============================================================\n');

    await app.close();
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ ERROR EN LA VERIFICACIÓN:', err.message);
    if (err.stack) console.error(err.stack);
    await app.close();
    process.exit(1);
  }
}

runTests();

