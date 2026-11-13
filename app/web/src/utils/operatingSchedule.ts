/**
 * Utilidad de gestión de horario operativo en frontend.
 * Calcula el horario en zona horaria America/Mexico_City independientemente
 * de la zona horaria del dispositivo del cliente.
 *
 * Horario operativo predeterminado: 06:00 a 21:00 horas.
 *
 * Durante el horario operativo:
 * - Se mantienen las conexiones de Socket.IO y la reconexión automática activa.
 * - Las solicitudes reales y eventos de Socket.IO mantienen activo el backend.
 *
 * Fuera del horario operativo:
 * - No se generan solicitudes HTTP o pings artificiales.
 * - El backend de Render Free puede suspenderse.
 * - Si un usuario interactúa (solicitud real), se despierta el backend.
 */

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

export function parseMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  return h * 60 + m;
}

export function getLocalTimeInMexicoCity(date: Date = new Date()): {
  dayOfWeek: number;
  hour: number;
  minute: number;
  timeString: string;
  totalMinutes: number;
} {
  const timezone = 'America/Mexico_City';
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    let weekdayStr = '';
    let hour = 0;
    let minute = 0;

    for (const part of parts) {
      if (part.type === 'weekday') weekdayStr = part.value;
      else if (part.type === 'hour') hour = parseInt(part.value, 10);
      else if (part.type === 'minute') minute = parseInt(part.value, 10);
    }

    if (hour === 24) hour = 0;

    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    const dayOfWeek = weekdayMap[weekdayStr] ?? date.getDay();
    const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const totalMinutes = hour * 60 + minute;

    return { dayOfWeek, hour, minute, timeString, totalMinutes };
  } catch {
    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const totalMinutes = hour * 60 + minute;
    return { dayOfWeek, hour, minute, timeString, totalMinutes };
  }
}

export function getClientOperatingSchedule(date: Date = new Date()): OperatingScheduleStatus {
  const timezone = 'America/Mexico_City';
  const start = process.env.NEXT_PUBLIC_OPERATING_HOURS_START || '06:00';
  const end = process.env.NEXT_PUBLIC_OPERATING_HOURS_END || '21:00';

  const simulateSchedule = process.env.NEXT_PUBLIC_SIMULATE_OPERATING_SCHEDULE?.toLowerCase()?.trim();
  const simulateTime = process.env.NEXT_PUBLIC_SIMULATE_TIME?.trim();

  // 1. Simulación forzada explícita
  if (simulateSchedule === 'active' || simulateSchedule === 'open' || simulateSchedule === 'true') {
    return {
      isOperating: true,
      localTime: simulateTime || '12:00',
      dayOfWeek: 1,
      timezone,
      start,
      end,
      simulated: true,
      simulationNote: 'Simulación forzada activa (NEXT_PUBLIC_SIMULATE_OPERATING_SCHEDULE)',
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
      simulationNote: 'Simulación forzada inactiva (NEXT_PUBLIC_SIMULATE_OPERATING_SCHEDULE)',
    };
  }

  // 2. Simulación de hora
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
    const local = getLocalTimeInMexicoCity(date);
    localMinutes = local.totalMinutes;
    localTimeStr = local.timeString;
    dayOfWeek = local.dayOfWeek;
  }

  const startMinutes = parseMinutes(start);
  const endMinutes = parseMinutes(end);

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

