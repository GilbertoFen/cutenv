import { getLocalTimeInTimezone, parseMinutes } from './schedule-validation.util';

export interface OperatingScheduleStatus {
  isOperating: boolean;
  localTime: string;
  dayOfWeek: number;
  timezone: string;
  start: string;
  end: string;
  simulated: boolean;
  simulationNote?: string;
}

/**
 * Evalúa si el backend se encuentra dentro del horario operativo programado
 * (06:00 a 21:00 hora de Ciudad de México por defecto).
 *
 * Durante el horario operativo se mantienen conexiones WebSocket y reconexiones activas.
 * Fuera del horario operativo no se generan solicitudes artificiales y el backend puede
 * suspenderse en plataformas como Render Free.
 *
 * Permite simulación en desarrollo/pruebas mediante variables de entorno:
 * - SIMULATE_OPERATING_SCHEDULE: 'active' | 'inactive'
 * - SIMULATE_TIME: 'HH:mm' (ej. '04:30' o '15:00')
 * - OPERATING_HOURS_START: 'HH:mm' (default '06:00')
 * - OPERATING_HOURS_END: 'HH:mm' (default '21:00')
 * - OPERATING_HOURS_TZ: 'America/Mexico_City' (default)
 */
export function getOperatingScheduleStatus(date: Date = new Date()): OperatingScheduleStatus {
  const timezone = process.env.OPERATING_HOURS_TZ || 'America/Mexico_City';
  const start = process.env.OPERATING_HOURS_START || '06:00';
  const end = process.env.OPERATING_HOURS_END || '21:00';

  const simulateSchedule = process.env.SIMULATE_OPERATING_SCHEDULE?.toLowerCase()?.trim();
  const simulateTime = process.env.SIMULATE_TIME?.trim();

  // 1. Simulación explícita directa de estado operativo
  if (simulateSchedule === 'active' || simulateSchedule === 'open' || simulateSchedule === 'true') {
    return {
      isOperating: true,
      localTime: simulateTime || '12:00',
      dayOfWeek: 1,
      timezone,
      start,
      end,
      simulated: true,
      simulationNote: 'Simulación activa forzada mediante SIMULATE_OPERATING_SCHEDULE',
    };
  }

  if (simulateSchedule === 'inactive' || simulateSchedule === 'closed' || simulateSchedule === 'false') {
    return {
      isOperating: false,
      localTime: simulateTime || '02:00',
      dayOfWeek: 1,
      timezone,
      start,
      end,
      simulated: true,
      simulationNote: 'Simulación inactiva forzada mediante SIMULATE_OPERATING_SCHEDULE',
    };
  }

  // 2. Si se proporcionó una hora simulada
  let localMinutes: number;
  let localTimeStr: string;
  let dayOfWeek: number;
  let simulated = false;

  if (simulateTime && /^([01]\d|2[0-3]):([0-5]\d)$/.test(simulateTime)) {
    localMinutes = parseMinutes(simulateTime);
    localTimeStr = simulateTime;
    dayOfWeek = 1;
    simulated = true;
  } else {
    const local = getLocalTimeInTimezone(date, timezone);
    localMinutes = local.totalMinutes;
    localTimeStr = local.timeString;
    dayOfWeek = local.dayOfWeek;
  }

  const startMinutes = parseMinutes(start);
  const endMinutes = parseMinutes(end);

  // Consideramos operativo desde 'start' inclusive hasta 'end' exclusivo (ej. 06:00 a 21:00)
  const isOperating = localMinutes >= startMinutes && localMinutes < endMinutes;

  return {
    isOperating,
    localTime: localTimeStr,
    dayOfWeek,
    timezone,
    start,
    end,
    simulated,
    simulationNote: simulated ? `Hora simulada evaluada: ${localTimeStr}` : undefined,
  };
}

