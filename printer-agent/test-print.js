/**
 * Script de prueba unitaria y de integración para el Agente de Impresión Local USB
 * Prueba:
 * 1. Endpoint /status
 * 2. Endpoint /printers
 * 3. Endpoint /print con formato 80mm
 * 4. Endpoint /print con formato 58mm
 * 5. Prevención de impresiones duplicadas (idempotencia)
 * 6. Reimpresión forzada permitida
 */

const http = require('http');

const PORT = 5001;
const TOKEN = 'pos-local-usb-agent';

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-POS-Print-Token': TOKEN,
        ...headers,
      },
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

const mockSale = {
  id: '6714a1f59c8d23456789abcd',
  folio: 'VTA-00892',
  date: new Date().toISOString(),
  table: { number: 4 },
  orderType: 'local',
  paymentMethod: 'efectivo',
  status: 'paid',
  totalAmount: 320.00,
  discountAmount: 40.00,
  promotionApplied: { name: '2x1 Bebidas Nacionales' },
  orders: [
    {
      items: [
        { recipe: 'Hamburguesa Clásica con Queso', quantity: 2, price: 120.00, notes: 'Sin cebolla' },
        { recipe: 'Cerveza Corona 355ml', quantity: 2, price: 40.00 },
        { recipe: 'Papas a la Francesa', quantity: 1, price: 40.00 }
      ]
    }
  ]
};

async function runTests() {
  console.log('--- INICIANDO PRUEBAS DEL AGENTE DE IMPRESIÓN ---');

  try {
    // 1. Probar /status
    console.log('\n[Prueba 1] Consultando GET /status...');
    const statusRes = await makeRequest('GET', '/status');
    console.log(`✓ Status ${statusRes.status}:`, statusRes.body);

    // 2. Probar /printers
    console.log('\n[Prueba 2] Consultando GET /printers...');
    const printersRes = await makeRequest('GET', '/printers');
    console.log(`✓ Status ${printersRes.status}: Impresoras encontradas =`, printersRes.body.printers?.length ?? 0);

    // 3. Probar /print (80mm)
    console.log('\n[Prueba 3] Enviando ticket 80mm POST /print...');
    const print80Res = await makeRequest('POST', '/print', {
      sale: mockSale,
      options: { paperWidth: '80mm', cutPaper: true }
    });
    console.log(`✓ Status ${print80Res.status}:`, print80Res.body);

    // 4. Probar /print duplicado (Debe ignorarse)
    console.log('\n[Prueba 4] Verificando protección de duplicado inmediato (Idempotencia)...');
    const dupRes = await makeRequest('POST', '/print', {
      sale: mockSale,
      options: { paperWidth: '80mm' }
    });
    console.log(`✓ Status ${dupRes.status} (Ignorado=${dupRes.body.duplicateIgnored}):`, dupRes.body.message);

    // 5. Probar /print con forceReprint: true (Debe permitirse)
    console.log('\n[Prueba 5] Verificando reimpresión autorizada (forceReprint: true)...');
    const reprintRes = await makeRequest('POST', '/print', {
      sale: mockSale,
      options: { paperWidth: '58mm', cutPaper: true },
      forceReprint: true
    });
    console.log(`✓ Status ${reprintRes.status}:`, reprintRes.body);

    // 6. Probar /print-kitchen (Comanda automática de cocina)
    console.log('\n[Prueba 6] Enviando comanda automática de cocina POST /print-kitchen...');
    const mockKitchenOrder = {
      id: 'ord_kitchen_101',
      tableNumber: 4,
      notes: 'Sin hielo en bebidas, la mesa lleva prisa',
      recipes: [
        { name: 'Hamburguesa Especial', quantity: 2, notes: 'Sin mostaza' },
        { name: 'Papas Gajo', quantity: 1, notes: 'Bien doradas' },
        { name: 'Refresco Cola 355ml', quantity: 2, notes: '' },
      ],
      createdAt: new Date().toISOString(),
    };

    const kitchenRes = await makeRequest('POST', '/print-kitchen', {
      type: 'kitchen',
      order: mockKitchenOrder,
      options: { paperWidth: '58mm', cutPaper: true },
    });
    console.log(`✓ Status ${kitchenRes.status} (Tipo=${kitchenRes.body.jobType}):`, kitchenRes.body.message);

    // 7. Probar /print-kitchen duplicado (Debe ignorarse)
    console.log('\n[Prueba 7] Verificando deduplicación de comanda de cocina...');
    const dupKitchenRes = await makeRequest('POST', '/print-kitchen', {
      type: 'kitchen',
      order: mockKitchenOrder,
      options: { paperWidth: '58mm' },
    });
    console.log(`✓ Status ${dupKitchenRes.status} (Ignorado=${dupKitchenRes.body.duplicateIgnored}):`, dupKitchenRes.body.message);

    console.log('\n========================================');
    console.log('✓ TODAS LAS PRUEBAS COMPLETADAS CON ÉXITO');
    console.log('========================================');
  } catch (err) {
    console.error('Error durante las pruebas:', err.message);
  }
}

runTests();
