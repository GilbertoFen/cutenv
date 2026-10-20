// Comprehensive Security and Authentication Audit Verification Script
const http = require('http');

const BACKEND_BASE = 'http://localhost:3001/api';
const FRONTEND_BASE = 'http://localhost:3000';

async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runAudit() {
  console.log('=====================================================');
  console.log('🚀 INICIANDO AUDITORÍA INTEGRAL DE SEGURIDAD Y RUTAS');
  console.log('=====================================================\n');

  // --- SCENARIO 8 & 1: Peticiones sin token o con token alterado a endpoints protegidos ---
  console.log('--- Escenario 1 & 8: Endpoints protegidos sin autenticación o con token inválido ---');
  const unauthAnalytics = await request(`${BACKEND_BASE}/analytics/dashboard`);
  assert(unauthAnalytics.status === 401, 'Endpoint /api/analytics/dashboard sin token retorna 401 Unauthorized');

  const tamperedAnalytics = await request(`${BACKEND_BASE}/analytics/dashboard`, {
    headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.tampered.signature' },
  });
  assert(tamperedAnalytics.status === 401, 'Token manipulado/falso en /api/analytics/dashboard retorna 401 Unauthorized');

  const unauthMe = await request(`${BACKEND_BASE}/auth/me`);
  assert(unauthMe.status === 401, 'Endpoint /api/auth/me sin token retorna 401 Unauthorized');

  // --- Login Administrador (Dueño) ---
  console.log('\n--- Escenario 2, 3 & 6: Autenticación de Administrador (owner) ---');
  const adminLogin = await request(`${BACKEND_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { username: 'root', password: 'root' },
  });
  assert(adminLogin.status === 200 || adminLogin.status === 201, 'Login de administrador exitoso');
  assert(adminLogin.data.token && adminLogin.data.token.length > 20, 'El servidor emitió un JWT firmado');
  assert(adminLogin.data.user.role === 'owner', 'El rol verificado en servidor es owner');
  const adminToken = adminLogin.data.token;

  // Verificar /auth/me con token de admin
  const adminMe = await request(`${BACKEND_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminMe.status === 200, 'Verificación de sesión /auth/me exitosa para admin');
  assert(adminMe.data.role === 'owner', 'Sesión restaurada correctamente como owner');

  // Admin accede a analíticas (endpoint administrativo)
  const adminAnalytics = await request(`${BACKEND_BASE}/analytics/dashboard`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminAnalytics.status === 200, 'Administrador autorizado a acceder a /api/analytics/dashboard (HTTP 200)');

  // --- Login de Trabajador (Worker) ---
  console.log('\n--- Escenario 4, 5 & 6: Autenticación y Autorización de Trabajador (worker) ---');
  const workerLogin = await request(`${BACKEND_BASE}/auth/worker/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { username: 'mesero1', password: 'password123' },
  });
  assert(workerLogin.status === 200 || workerLogin.status === 201, 'Login de trabajador operativo exitoso');
  assert(workerLogin.data.token && workerLogin.data.token.length > 20, 'Servidor emitió JWT firmado para el trabajador');
  assert(workerLogin.data.user.role === 'worker', 'El rol emitido para trabajador es worker');
  const workerToken = workerLogin.data.token;

  // Trabajador consulta su propia sesión en backend
  const workerMe = await request(`${BACKEND_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${workerToken}` },
  });
  assert(workerMe.status === 200, 'Trabajador puede verificar su sesión en /auth/me');
  assert(workerMe.data.role === 'worker', 'El backend confirma rol worker');

  // Intento de Trabajador de acceder a /api/analytics/dashboard (RBAC)
  const workerBlockedAnalytics = await request(`${BACKEND_BASE}/analytics/dashboard`, {
    headers: { Authorization: `Bearer ${workerToken}` },
  });
  assert(
    workerBlockedAnalytics.status === 403,
    'Trabajador intentando acceder a /api/analytics/dashboard es RECHAZADO con 403 Forbidden'
  );

  // Intento de Trabajador de crear producto en backend (RBAC)
  const workerBlockedProduct = await request(`${BACKEND_BASE}/products`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${workerToken}`,
      'Content-Type': 'application/json',
    },
    body: { name: 'Producto Ilegal', price: 99 },
  });
  assert(
    workerBlockedProduct.status === 403,
    'Trabajador intentando crear un producto en /api/products es RECHAZADO con 403 Forbidden'
  );

  // Intento de Trabajador de borrar una orden (RBAC)
  const workerBlockedOrderDelete = await request(`${BACKEND_BASE}/orders/dummy-id`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${workerToken}` },
  });
  assert(
    workerBlockedOrderDelete.status === 403,
    'Trabajador intentando eliminar orden vía DELETE /api/orders/:id es RECHAZADO con 403 Forbidden'
  );

  // Intento de Trabajador de crear receta (RBAC)
  const workerBlockedRecipe = await request(`${BACKEND_BASE}/recipes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${workerToken}`, 'Content-Type': 'application/json' },
    body: { name: 'Receta Secreta', ingredients: [] },
  });
  assert(workerBlockedRecipe.status === 403, 'Trabajador intentando crear receta en /api/recipes es RECHAZADO con 403 Forbidden');

  // Intento de Trabajador de crear promoción (RBAC)
  const workerBlockedPromotion = await request(`${BACKEND_BASE}/promotions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${workerToken}`, 'Content-Type': 'application/json' },
    body: { title: 'Promo Ilegal', discount: 50 },
  });
  assert(workerBlockedPromotion.status === 403, 'Trabajador intentando crear promo en /api/promotions es RECHAZADO con 403 Forbidden');

  // Intento de Trabajador de crear mesa (RBAC)
  const workerBlockedTable = await request(`${BACKEND_BASE}/tables`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${workerToken}`, 'Content-Type': 'application/json' },
    body: { number: 999, capacity: 4 },
  });
  assert(workerBlockedTable.status === 403, 'Trabajador intentando crear mesa en /api/tables es RECHAZADO con 403 Forbidden');

  // Intento de Trabajador de guardar configuración de facturación (RBAC)
  const workerBlockedInvoicing = await request(`${BACKEND_BASE}/invoicing/config`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${workerToken}`, 'Content-Type': 'application/json' },
    body: { rfc: 'TEST010101AAA' },
  });
  assert(workerBlockedInvoicing.status === 403, 'Trabajador intentando configurar facturación es RECHAZADO con 403 Forbidden');

  // Intento de Trabajador de cancelar una venta (RBAC)
  const workerBlockedSaleCancel = await request(`${BACKEND_BASE}/sales/dummy-sale-id/cancel`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${workerToken}`, 'Content-Type': 'application/json' },
    body: { reason: 'Cancelación no autorizada' },
  });
  assert(workerBlockedSaleCancel.status === 403, 'Trabajador intentando cancelar venta en PATCH /api/sales/:id/cancel es RECHAZADO con 403 Forbidden');

  // --- Escenario 8 & 9: Token Expirado ---
  console.log('\n--- Escenario 8 & 9: Token Expirado en Backend ---');
  const crypto = require('crypto');
  const secret = process.env.JWT_SECRET || 'pos_jwt_secret_key_restaurant_2026_local_first_secure';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const expiredPayload = Buffer.from(JSON.stringify({
    sub: 'user-expired',
    username: 'expired_user',
    name: 'Usuario Expirado',
    role: 'worker',
    iat: Math.floor(Date.now() / 1000) - 7200,
    exp: Math.floor(Date.now() / 1000) - 3600, // Expiró hace 1 hora
  })).toString('base64url');
  const expiredData = `${header}.${expiredPayload}`;
  const expiredSig = crypto.createHmac('sha256', secret).update(expiredData).digest('base64url');
  const expiredToken = `${expiredData}.${expiredSig}`;

  const expiredReq = await request(`${BACKEND_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${expiredToken}` },
  });
  assert(expiredReq.status === 401, 'Token con timestamp expirado es RECHAZADO con 401 Unauthorized');
  assert(
    typeof expiredReq.data.message === 'string' && expiredReq.data.message.includes('expirado'),
    'Servidor detalla que el token está expirado'
  );

  // --- Escenario 7: Autenticación y Autorización de Gerente (manager) ---
  console.log('\n--- Escenario 7: Rol Gerente (manager) ---');
  const managerLogin = await request(`${BACKEND_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { username: 'gerente1', password: 'password123' },
  });
  assert(managerLogin.status === 200 || managerLogin.status === 201, 'Login de gerente exitoso');
  const managerToken = managerLogin.data.token;
  assert(managerLogin.data.user.role === 'manager', 'Rol verificado en servidor es manager');

  // Gerente accede a analíticas (permitido para manager y owner)
  const managerAnalytics = await request(`${BACKEND_BASE}/analytics/dashboard`, {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert(managerAnalytics.status === 200, 'Gerente autorizado a ver dashboard de analíticas (HTTP 200)');

  // --- Escenario 15: Intento de suplantación de rol (Cliente manipulando rol en payload) ---
  console.log('\n--- Escenario 15: Ataque de suplantación de rol por cliente ---');
  // Aunque el cliente afirme en el body ser "owner", el backend valida el JWT real del trabajador
  const spoofAttempt = await request(`${BACKEND_BASE}/analytics/dashboard`, {
    headers: {
      Authorization: `Bearer ${workerToken}`,
      'X-Role-Spoof': 'owner',
    },
  });
  assert(
    spoofAttempt.status === 403,
    'Modificación de headers o rol cliente es ignorada: servidor valida claims criptográficos del JWT y devuelve 403'
  );

  // --- Escenario 12: Redirección de /inventory hacia /manager?tab=inventory ---
  console.log('\n--- Escenario 12: Eliminación y redirección de ruta /inventory ---');
  const inventoryRedirect = await request(`${FRONTEND_BASE}/inventory`);
  assert(
    inventoryRedirect.status === 307 || inventoryRedirect.status === 308,
    `Ruta /inventory responde con redirección HTTP ${inventoryRedirect.status}`
  );
  assert(
    inventoryRedirect.headers.location === '/manager?tab=inventory',
    'Ruta /inventory redirige exactamente a /manager?tab=inventory'
  );

  const inventorySubpath = await request(`${FRONTEND_BASE}/inventory/articulos`);
  assert(
    inventorySubpath.status === 307 || inventorySubpath.status === 308,
    `Subruta /inventory/articulos responde con redirección HTTP ${inventorySubpath.status}`
  );
  assert(
    inventorySubpath.headers.location === '/manager?tab=inventory',
    'Subruta /inventory/articulos redirige a /manager?tab=inventory'
  );

  // --- Escenario 7 & 13: Comportamiento de Puerto 3000 y 3001 ---
  console.log('\n--- Escenario 7 & 13: Comportamiento de Puerto 3000 (Frontend) y 3001 (Backend) ---');
  const frontendRoot = await request(`${FRONTEND_BASE}/`);
  assert(frontendRoot.status === 200, 'Puerto 3000 (Frontend) responde 200 OK en raíz /');
  assert(
    typeof frontendRoot.data === 'string' && frontendRoot.data.includes('html'),
    'Puerto 3000 sirve la aplicación web SPA/SSR de Next.js'
  );

  const backendRoot = await request('http://localhost:3001/');
  assert(
    backendRoot.status === 404,
    'Puerto 3001 (Backend) preserva semántica de API REST JSON y no redirige indiscriminadamente la raíz (HTTP 404)'
  );

  console.log('\n=====================================================');
  console.log('🎉 TODAS LAS PRUEBAS DE SEGURIDAD PASARON SATISFACTORIAMENTE');
  console.log('=====================================================\n');
}

runAudit().catch((err) => {
  console.error('\n💥 Error durante la auditoría:', err.message);
  process.exit(1);
});
