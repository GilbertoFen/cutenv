import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), 'app/backend/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'atlas-credentials.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import {
  evaluateWeeklySchedule,
  evaluateEffectiveSchedule,
  parseMinutes,
  getLocalTimeInTimezone,
} from '../common/utils/schedule-validation.util';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { EmployeesService } from '../employees/employees.service';
import { AuthService } from '../auth/auth.service';
import { DaySchedule } from '../schemasMongo/access-schedule.schema';
import { ForbiddenException } from '@nestjs/common';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${msg}`);
}

async function runVerification() {
  console.log('================================================================');
  console.log('🧪 INICIANDO BATERÍA DE PRUEBAS DE JERARQUÍA Y CONTROL HORARIO');
  console.log('================================================================\n');

  // --- PARTE 1: PRUEBAS UNITARIAS DEL MOTOR DE HORARIOS Y ZONAS HORARIAS ---
  console.log('--- 1. Pruebas de Evaluación de Horarios y Turnos Nocturnos ---');

  const regularSchedule: DaySchedule[] = [
    { dayOfWeek: 1, dayName: 'Lunes', enabled: true, openTime: '08:00', closeTime: '23:00' },
  ];

  // Lunes a las 14:30 en CDMX
  // Creamos una fecha correspondiente a Lunes 14:30 en America/Mexico_City
  const mondayMidday = new Date('2026-11-09T20:30:00Z'); // 20:30 UTC = 14:30 CDMX (UTC-6)
  const evalRegular = evaluateWeeklySchedule(regularSchedule, mondayMidday, 'America/Mexico_City');
  assert(evalRegular.allowed === true, 'Turno regular 08:00-23:00 a las 14:30 debe ser PERMITIDO');

  // Lunes a las 07:30 en CDMX (13:30 UTC)
  const mondayEarly = new Date('2026-11-09T13:30:00Z');
  const evalEarly = evaluateWeeklySchedule(regularSchedule, mondayEarly, 'America/Mexico_City');
  assert(evalEarly.allowed === false, 'Turno regular antes de apertura (07:30) debe ser BLOQUEADO');

  // Lunes a las 23:30 en CDMX (Martes 05:30 UTC)
  const mondayLate = new Date('2026-11-10T05:30:00Z');
  const evalLate = evaluateWeeklySchedule(regularSchedule, mondayLate, 'America/Mexico_City');
  assert(evalLate.allowed === false, 'Turno regular después de cierre (23:30) debe ser BLOQUEADO');

  // Turno nocturno que cruza medianoche: Viernes 18:00 a 02:00
  const overnightSchedule: DaySchedule[] = [
    { dayOfWeek: 5, dayName: 'Viernes', enabled: true, openTime: '18:00', closeTime: '02:00' },
    { dayOfWeek: 6, dayName: 'Sábado', enabled: false, openTime: '08:00', closeTime: '23:00' },
  ];

  // Sábado a las 01:30 en CDMX (07:30 UTC) - aún dentro del turno nocturno de Viernes
  const saturdayOvernight = new Date('2026-11-14T07:30:00Z');
  const evalOvernight = evaluateWeeklySchedule(overnightSchedule, saturdayOvernight, 'America/Mexico_City');
  assert(evalOvernight.allowed === true, 'Turno nocturno 18:00-02:00 vigente el sábado a las 01:30 debe ser PERMITIDO');

  // Sábado a las 02:30 en CDMX (08:30 UTC) - terminado el turno nocturno
  const saturdayOvernightEnd = new Date('2026-11-14T08:30:00Z');
  const evalOvernightEnd = evaluateWeeklySchedule(overnightSchedule, saturdayOvernightEnd, 'America/Mexico_City');
  assert(evalOvernightEnd.allowed === false, 'Turno nocturno terminado a las 02:30 debe ser BLOQUEADO');

  // Intersección estricta: Restaurante abierto 08:00-23:00, Empleado asignado 09:00-15:00
  const restaurantSchedule: DaySchedule[] = [
    { dayOfWeek: 1, dayName: 'Lunes', enabled: true, openTime: '08:00', closeTime: '23:00' },
  ];
  const employeeIndividual: DaySchedule[] = [
    { dayOfWeek: 1, dayName: 'Lunes', enabled: true, openTime: '09:00', closeTime: '15:00' },
  ];

  // A las 14:00 (permitido para ambos)
  const monday2pm = new Date('2026-11-09T20:00:00Z');
  const evalBoth = evaluateEffectiveSchedule(
    restaurantSchedule,
    { enabled: true, weeklySchedule: employeeIndividual },
    monday2pm,
    'America/Mexico_City'
  );
  assert(evalBoth.allowed === true, 'Intersección a las 14:00 (dentro de restaurante y empleado) es PERMITIDA');

  // A las 16:00 (restaurante abierto, empleado fuera de horario)
  const monday4pm = new Date('2026-11-09T22:00:00Z');
  const evalRestrictedEmp = evaluateEffectiveSchedule(
    restaurantSchedule,
    { enabled: true, weeklySchedule: employeeIndividual },
    monday4pm,
    'America/Mexico_City'
  );
  assert(evalRestrictedEmp.allowed === false, 'Intersección a las 16:00 (empleado fuera de turno) es BLOQUEADA');

  // --- PARTE 2: PRUEBAS DE INTEGRACIÓN CON NESTJS Y MONGODB ---
  console.log('\n--- 2. Pruebas de Jerarquía y Servicios en MongoDB ---');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const restaurantsService = app.get(RestaurantsService);
  const employeesService = app.get(EmployeesService);
  const authService = app.get(AuthService);

  const testSuffix = Date.now().toString().slice(-6);
  const restaurantCode = `test_rest_${testSuffix}`;

  try {
    // 2.1 Root Admin crea restaurante
    console.log(`\n2.1 Creando restaurante de prueba: ${restaurantCode}`);
    const ownerEmail = `dueno_${testSuffix}@resttest.com`;
    const managerEmail = `gerente_${testSuffix}@resttest.com`;
    const ownerUsername = ownerEmail.split('@')[0].toLowerCase();
    const managerUsername = managerEmail.split('@')[0].toLowerCase();

    const restResult = await restaurantsService.createRestaurant(
      {
        name: `Restaurante Test ${testSuffix}`,
        code: restaurantCode,
        timezone: 'America/Mexico_City',
        ownerName: 'Dueño Test',
        ownerEmail,
        managerName: 'Gerente Test',
        managerEmail,
      },
      'root-admin'
    );

    assert(Boolean(restResult.restaurant), 'Restaurante creado con éxito');
    assert(Boolean(restResult.owner?.invitationToken), 'Token de invitación para dueño generado');
    assert(Boolean(restResult.manager?.invitationToken), 'Token de invitación para gerente generado');

    const ownerInviteToken = restResult.owner!.invitationToken!;
    const managerInviteToken = restResult.manager!.invitationToken!;

    // 2.2 Validación de tokens de invitación de 72h
    console.log('\n2.2 Validando token de invitación y establecimiento seguro de contraseña');
    const validInvite = await authService.validateInvitation(ownerInviteToken);
    assert(validInvite.valid === true, 'Token de invitación es válido antes de usarse');
    assert(validInvite.email === `dueno_${testSuffix}@resttest.com`, 'Email asociado al token correcto');

    // Aceptación de invitación y establecimiento de contraseña
    const acceptRes = await authService.acceptInvitation({
      token: ownerInviteToken,
      password: 'PasswordSegura123!',
    });
    assert(acceptRes.success === true, 'Contraseña de dueño establecida mediante token');

    // Comprobación de un solo uso del token
    try {
      await authService.validateInvitation(ownerInviteToken);
      assert(false, 'El token de invitación debió ser invalidado tras su uso');
    } catch (e: any) {
      assert(true, 'Token de invitación invalidado inmediatamente tras su uso');
    }

    // 2.3 Dueño inicia sesión (Excepción administrativa 24/7)
    console.log('\n2.3 Inicio de sesión del Dueño (Excepción administrativa 24/7)');
    const ownerLogin = await authService.login({
      username: ownerUsername,
      password: 'PasswordSegura123!',
    });
    assert(Boolean(ownerLogin.token), 'Dueño autenticado exitosamente con JWT');
    assert(ownerLogin.user.role === 'owner', 'Rol del dueño confirmado como owner');

    // 2.4 Gerente establece su contraseña
    await authService.acceptInvitation({
      token: managerInviteToken,
      password: 'GerenteSeguro123!',
    });
    const managerLogin = await authService.login({
      username: managerUsername,
      password: 'GerenteSeguro123!',
    });
    assert(Boolean(managerLogin.token), 'Gerente autenticado exitosamente');
    assert(managerLogin.user.role === 'manager', 'Rol del gerente confirmado como manager');

    // 2.5 Regla de Jerarquía: El Gerente NO puede crear dueños ni administradores superiores
    console.log('\n2.5 Verificando restricción de jerarquía: Gerente NO puede crear Dueño ni Root');
    try {
      await employeesService.createEmployee(
        {
          name: 'Intruso',
          username: `intruso_${testSuffix}`,
          email: `intruso_${testSuffix}@resttest.com`,
          role: 'owner' as any,
          operationalRole: 'general',
        },
        managerLogin.user as any
      );
      assert(false, 'El gerente debió ser bloqueado al intentar crear un usuario con rol "owner"');
    } catch (err: any) {
      assert(err instanceof ForbiddenException, 'Gerente bloqueado con 403 Forbidden al intentar crear administradores');
    }

    // 2.6 Gerente crea un empleado operativo (Mesero) con token de invitación
    console.log('\n2.6 Gerente crea empleado operativo (Mesero)');
    const empResult = await employeesService.createEmployee(
      {
        name: 'Carlos',
        lastName: 'Mesero',
        username: `carlos_${testSuffix}`,
        email: `carlos_${testSuffix}@resttest.com`,
        role: 'worker',
        operationalRole: 'mesero',
        individualSchedule: {
          enabled: true,
          weeklySchedule: [
            { dayOfWeek: 0, dayName: 'Domingo', enabled: true, openTime: '00:00', closeTime: '23:59' },
            { dayOfWeek: 1, dayName: 'Lunes', enabled: true, openTime: '00:00', closeTime: '23:59' },
            { dayOfWeek: 2, dayName: 'Martes', enabled: true, openTime: '00:00', closeTime: '23:59' },
            { dayOfWeek: 3, dayName: 'Miércoles', enabled: true, openTime: '00:00', closeTime: '23:59' },
            { dayOfWeek: 4, dayName: 'Jueves', enabled: true, openTime: '00:00', closeTime: '23:59' },
            { dayOfWeek: 5, dayName: 'Viernes', enabled: true, openTime: '00:00', closeTime: '23:59' },
            { dayOfWeek: 6, dayName: 'Sábado', enabled: true, openTime: '00:00', closeTime: '23:59' },
          ],
        },
      },
      managerLogin.user as any
    );

    assert(Boolean(empResult.employee), 'Empleado operativo creado');
    assert(empResult.employee.operationalRole === 'mesero', 'Rol operativo mesero asignado correctamente');
    assert(Boolean(empResult.invitationToken), 'Token de invitación para empleado operativo generado');

    // Empleado establece contraseña
    await authService.acceptInvitation({
      token: empResult.invitationToken,
      password: 'MeseroPassword123!',
    });

    // 2.7 Empleado operativo inicia sesión dentro de horario
    console.log('\n2.7 Login de empleado operativo dentro de horario autorizado');
    const workerLogin = await authService.workerLogin({
      username: `carlos_${testSuffix}`,
      password: 'MeseroPassword123!',
    });
    assert(Boolean(workerLogin.token), 'Mesero ingresa exitosamente con sesión activa');

    // 2.8 Restricción de horario: Deshabilitar el horario y comprobar rechazo
    console.log('\n2.8 Comprobando bloqueo por horario deshabilitado');
    await restaurantsService.updateSchedule(
      restResult.restaurant.id,
      {
        weeklySchedule: [
          { dayOfWeek: 0, dayName: 'Domingo', enabled: false, openTime: '08:00', closeTime: '23:00' },
          { dayOfWeek: 1, dayName: 'Lunes', enabled: false, openTime: '08:00', closeTime: '23:00' },
          { dayOfWeek: 2, dayName: 'Martes', enabled: false, openTime: '08:00', closeTime: '23:00' },
          { dayOfWeek: 3, dayName: 'Miércoles', enabled: false, openTime: '08:00', closeTime: '23:00' },
          { dayOfWeek: 4, dayName: 'Jueves', enabled: false, openTime: '08:00', closeTime: '23:00' },
          { dayOfWeek: 5, dayName: 'Viernes', enabled: false, openTime: '08:00', closeTime: '23:00' },
          { dayOfWeek: 6, dayName: 'Sábado', enabled: false, openTime: '08:00', closeTime: '23:00' },
        ],
      },
      managerLogin.user as any
    );

    try {
      await authService.workerLogin({
        username: `carlos_${testSuffix}`,
        password: 'MeseroPassword123!',
      });
      assert(false, 'El mesero debió ser rechazado por horario cerrado');
    } catch (err: any) {
      assert(err instanceof ForbiddenException, 'Mesero bloqueado con 403 Forbidden por fuera de horario');
      console.log(`   Mensaje de bloqueo recibido: "${err.message}"`);
    }

    // 2.9 El Administrador/Dueño aún puede ingresar incluso con el restaurante cerrado
    console.log('\n2.9 Comprobando excepción administrativa: Dueño ingresa con restaurante cerrado');
    const ownerLogin2 = await authService.login({
      username: ownerUsername,
      password: 'PasswordSegura123!',
    });
    assert(Boolean(ownerLogin2.token), 'Dueño ingresa sin problemas fuera de horario (24/7)');

    // 2.10 Suspensión del Restaurante y Revocación de Sesiones
    console.log('\n2.10 Suspensión del restaurante por Root Admin y revocación de sesiones');
    await restaurantsService.updateRestaurant(
      restResult.restaurant.id,
      { status: 'inactive' },
      { sub: 'root-admin', name: 'Root Admin' }
    );

    try {
      await authService.login({
        username: ownerUsername,
        password: 'PasswordSegura123!',
      });
      assert(false, 'El dueño debió ser bloqueado porque el restaurante está inactivo');
    } catch (err: any) {
      assert(err instanceof ForbiddenException, 'Dueño bloqueado al estar el restaurante suspendido');
      console.log(`   Mensaje de bloqueo recibido: "${err.message}"`);
    }

    console.log('\n================================================================');
    console.log('🎉 TODAS LAS PRUEBAS DE JERARQUÍA Y HORARIOS PASARON CON ÉXITO');
    console.log('================================================================');
  } finally {
    await app.close();
  }
}

runVerification().catch((err) => {
  console.error('💥 Error inesperado durante la verificación:', err);
  process.exit(1);
});
