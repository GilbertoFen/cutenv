import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SocketIoAdapter } from '../src/socket-io.adapter';
import { io as ClientSocketIo, Socket as ClientSocket } from 'socket.io-client';
import * as http from 'http';
import { getOperatingScheduleStatus } from '../src/common/utils/operating-schedule.util';
import { TablesGateway } from '../src/gateways/tables.gateway';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(msg);
  }
  console.log(`  ✓ ${msg}`);
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 SUITE DE PRUEBAS DE DISPONIBILIDAD Y RECONEXIÓN');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1: Horario Operativo y Zona Horaria America/Mexico_City
  // --------------------------------------------------------------------------
  console.log('▶ [TEST 1] Evaluación de Horario Operativo (06:00 a 21:00 America/Mexico_City)...');

  // Simulación 05:59 (Antes de apertura)
  process.env.SIMULATE_TIME = '05:59';
  delete process.env.SIMULATE_OPERATING_SCHEDULE;
  let status = getOperatingScheduleStatus();
  assert(status.isOperating === false, '05:59 MX está FUERA de horario operativo (cerrado)');
  assert(status.timezone === 'America/Mexico_City', 'Zona horaria configurada en America/Mexico_City');

  // Simulación 06:00 (Apertura)
  process.env.SIMULATE_TIME = '06:00';
  status = getOperatingScheduleStatus();
  assert(status.isOperating === true, '06:00 MX está DENTRO de horario operativo (abierto)');

  // Simulación 14:30 (Pico operativo)
  process.env.SIMULATE_TIME = '14:30';
  status = getOperatingScheduleStatus();
  assert(status.isOperating === true, '14:30 MX está DENTRO de horario operativo');

  // Simulación 20:59 (Último minuto de turno)
  process.env.SIMULATE_TIME = '20:59';
  status = getOperatingScheduleStatus();
  assert(status.isOperating === true, '20:59 MX está DENTRO de horario operativo');

  // Simulación 21:00 (Cierre)
  process.env.SIMULATE_TIME = '21:00';
  status = getOperatingScheduleStatus();
  assert(status.isOperating === false, '21:00 MX está FUERA de horario operativo (cerrado)');

  // Simulación de madrugada 02:30 (Madrugada - Backend puede suspenderse)
  process.env.SIMULATE_TIME = '02:30';
  status = getOperatingScheduleStatus();
  assert(status.isOperating === false, '02:30 MX está FUERA de horario operativo (madrugada)');

  // Simulación por flag forzado activo e inactivo
  process.env.SIMULATE_OPERATING_SCHEDULE = 'active';
  delete process.env.SIMULATE_TIME;
  status = getOperatingScheduleStatus();
  assert(status.isOperating === true && status.simulated === true, 'Flag SIMULATE_OPERATING_SCHEDULE=active fuerza estado activo');

  process.env.SIMULATE_OPERATING_SCHEDULE = 'inactive';
  status = getOperatingScheduleStatus();
  assert(status.isOperating === false && status.simulated === true, 'Flag SIMULATE_OPERATING_SCHEDULE=inactive fuerza estado inactivo');

  // Limpiar variables de prueba
  delete process.env.SIMULATE_OPERATING_SCHEDULE;
  delete process.env.SIMULATE_TIME;

  // --------------------------------------------------------------------------
  // TEST 2: Iniciar Servidor NestJS y Verificar Endpoint de Salud /api/health
  // --------------------------------------------------------------------------
  console.log('\n▶ [TEST 2] Verificación de Endpoint de Salud GET /api/health...');
  const TEST_PORT = 3333;
  let app = await NestFactory.create(AppModule, { cors: true, logger: ['error', 'warn'] });
  app.useWebSocketAdapter(new SocketIoAdapter(app));
  app.setGlobalPrefix('api');
  await app.listen(TEST_PORT);
  console.log(`  Backend iniciado para pruebas en puerto ${TEST_PORT}`);

  const healthData = await new Promise<any>((resolve, reject) => {
    http.get(`http://127.0.0.1:${TEST_PORT}/api/health`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });

  assert(healthData.status === 'ok', 'Endpoint /api/health responde status: "ok"');
  assert(healthData.service === 'pos-backend', 'Endpoint informa service: "pos-backend"');
  assert(typeof healthData.uptimeSeconds === 'number', 'Endpoint informa uptimeSeconds numérico sin coste de BD');
  assert(healthData.timezone === 'America/Mexico_City', 'Endpoint reporta zona horaria America/Mexico_City');
  assert(healthData.operatingSchedule.start === '06:00', 'Horario operativo configurado con inicio 06:00');
  assert(healthData.operatingSchedule.end === '21:00', 'Horario operativo configurado con fin 21:00');

  // --------------------------------------------------------------------------
  // TEST 3: Conexión Socket.IO y Suscripción a Salas
  // --------------------------------------------------------------------------
  console.log('\n▶ [TEST 3] Conexión de clientes Socket.IO y suscripción a salas...');

  const kitchenClient: ClientSocket = ClientSocketIo(`http://127.0.0.1:${TEST_PORT}/kitchen`, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 200,
    reconnectionDelayMax: 500,
  });

  const tablesClient: ClientSocket = ClientSocketIo(`http://127.0.0.1:${TEST_PORT}/tables`, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 200,
    reconnectionDelayMax: 500,
  });

  await new Promise<void>((resolve, reject) => {
    let connectedCount = 0;
    const check = () => {
      connectedCount++;
      if (connectedCount === 2) resolve();
    };
    kitchenClient.on('connect', check);
    tablesClient.on('connect', check);
    setTimeout(() => reject(new Error('Timeout esperando conexión de sockets')), 5000);
  });

  assert(kitchenClient.connected, 'Cliente /kitchen conectado exitosamente vía Socket.IO');
  assert(tablesClient.connected, 'Cliente /tables conectado exitosamente vía Socket.IO');

  // Probar suscripción a salas
  kitchenClient.emit('joinKitchen', { restaurantId: 'rest-123' });
  tablesClient.emit('joinReception');

  // --------------------------------------------------------------------------
  // TEST 4 & 5: Detener Backend y Verificar Desconexión en Cliente
  // --------------------------------------------------------------------------
  console.log('\n▶ [TEST 4 y 5] Simulación de interrupción: detener backend y verificar desconexión...');

  let kitchenDisconnected = false;
  let disconnectReason = '';
  kitchenClient.on('disconnect', (reason) => {
    kitchenDisconnected = true;
    disconnectReason = reason;
  });

  await app.close();
  console.log('  Backend detenido exitosamente (simulando caída de servicio o suspensión de Render)');

  // Esperar detección de desconexión
  await new Promise((r) => setTimeout(r, 600));
  assert(kitchenDisconnected, `Cliente detectó desconexión del backend (motivo: ${disconnectReason})`);

  // --------------------------------------------------------------------------
  // TEST 6, 7 & 8: Reanudar Backend, Reconexión Automática y Cero Duplicados
  // --------------------------------------------------------------------------
  console.log('\n▶ [TEST 6, 7 y 8] Reanudar backend, verificar reconexión automática y listeners...');

  let eventReceiveCount = 0;
  tablesClient.on('table.status.changed', () => {
    eventReceiveCount++;
  });

  // Re-levantar el servidor en el mismo puerto
  app = await NestFactory.create(AppModule, { cors: true, logger: ['error', 'warn'] });
  app.useWebSocketAdapter(new SocketIoAdapter(app));
  app.setGlobalPrefix('api');
  await app.listen(TEST_PORT);
  console.log('  Backend reanudado en el mismo puerto');

  // Esperar a que el cliente se reconecte automáticamente
  await new Promise<void>((resolve, reject) => {
    if (tablesClient.connected) return resolve();
    tablesClient.on('connect', () => resolve());
    setTimeout(() => reject(new Error('Timeout esperando reconexión automática')), 6000);
  });

  assert(tablesClient.connected, 'Cliente Socket.IO se reconectó automáticamente sin intervención manual');

  // Obtener gateway de tablas para emitir evento de prueba
  const tablesGateway = app.get(TablesGateway);
  tablesGateway.emitTableStatusChanged({
    tableId: 'mesa-test-1',
    number: 1,
    prevStatus: 'disponible',
    status: 'ocupada',
    at: Date.now(),
  });

  await new Promise((r) => setTimeout(r, 400));
  assert(eventReceiveCount === 1, `Evento recibido exactamente 1 vez (recibidos: ${eventReceiveCount}), sin listeners duplicados`);

  // --------------------------------------------------------------------------
  // TEST 9: Limpieza
  // --------------------------------------------------------------------------
  kitchenClient.disconnect();
  tablesClient.disconnect();
  await app.close();
  console.log('\n✅ TODAS LAS PRUEBAS AUTOMATIZADAS PASARON SATISFACTORIAMENTE.\n');
}

runTests().catch((err) => {
  console.error('\n❌ ERROR EN PRUEBAS:', err);
  process.exit(1);
});
