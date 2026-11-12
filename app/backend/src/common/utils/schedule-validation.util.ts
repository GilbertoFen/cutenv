import { DaySchedule } from '../../schemasMongo/access-schedule.schema';

export interface ScheduleEvaluationResult {
  allowed: boolean;
  reason?: string;
  localTime: string;
  dayOfWeek: number;
  dayName: string;
  currentShift?: { openTime: string; closeTime: string };
  authorizedSummary?: string;
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function parseMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  return h * 60 + m;
}

export function getLocalTimeInTimezone(
  date: Date = new Date(),
  timezone: string = 'America/Mexico_City',
): {
  dayOfWeek: number;
  hour: number;
  minute: number;
  timeString: string;
  totalMinutes: number;
} {
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
  } catch (err) {
    // Fallback a hora local del servidor si la zona horaria es inválida
    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const totalMinutes = hour * 60 + minute;
    return { dayOfWeek, hour, minute, timeString, totalMinutes };
  }
}

/**
 * Evalúa si el momento actual está dentro de un horario semanal determinado.
 * Soporta turnos regulares y turnos que cruzan la medianoche (ej: 18:00 a 02:00).
 */
export function evaluateWeeklySchedule(
  scheduleList: DaySchedule[],
  date: Date = new Date(),
  timezone: string = 'America/Mexico_City',
): ScheduleEvaluationResult {
  const local = getLocalTimeInTimezone(date, timezone);
  const currentMinutes = local.totalMinutes;
  const currentDay = local.dayOfWeek;
  const yesterday = (currentDay + 6) % 7;

  const todayConfig = scheduleList?.find((d) => d.dayOfWeek === currentDay);
  const yesterdayConfig = scheduleList?.find((d) => d.dayOfWeek === yesterday);

  // 1. Revisar si ayer inició un turno nocturno que cruza medianoche y aún sigue vigente hoy
  if (yesterdayConfig && yesterdayConfig.enabled) {
    const yOpen = parseMinutes(yesterdayConfig.openTime);
    const yClose = parseMinutes(yesterdayConfig.closeTime);
    if (yOpen > yClose) {
      // Cruza medianoche. Vigente hoy desde 00:00 hasta yClose
      if (currentMinutes <= yClose) {
        return {
          allowed: true,
          localTime: local.timeString,
          dayOfWeek: currentDay,
          dayName: DAY_NAMES[currentDay],
          currentShift: {
            openTime: yesterdayConfig.openTime,
            closeTime: yesterdayConfig.closeTime,
          },
        };
      }
    }
  }

  // 2. Revisar el turno configurado para el día de hoy
  if (todayConfig && todayConfig.enabled) {
    const openMin = parseMinutes(todayConfig.openTime);
    const closeMin = parseMinutes(todayConfig.closeTime);

    if (openMin <= closeMin) {
      // Turno normal en el mismo día
      if (currentMinutes >= openMin && currentMinutes <= closeMin) {
        return {
          allowed: true,
          localTime: local.timeString,
          dayOfWeek: currentDay,
          dayName: DAY_NAMES[currentDay],
          currentShift: {
            openTime: todayConfig.openTime,
            closeTime: todayConfig.closeTime,
          },
        };
      }
    } else {
      // Turno nocturno iniciado hoy antes de medianoche (ej: 18:00 a 02:00)
      if (currentMinutes >= openMin) {
        return {
          allowed: true,
          localTime: local.timeString,
          dayOfWeek: currentDay,
          dayName: DAY_NAMES[currentDay],
          currentShift: {
            openTime: todayConfig.openTime,
            closeTime: todayConfig.closeTime,
          },
        };
      }
    }
  }

  // Construir resumen legible de los días autorizados
  const activeDays = (scheduleList || [])
    .filter((d) => d.enabled)
    .map((d) => `${d.dayName} (${d.openTime} a ${d.closeTime})`)
    .join(', ');

  const summary = activeDays || 'Sin días activos programados (cerrado)';

  return {
    allowed: false,
    reason: `Acceso restringido fuera de horario laboral. Hora actual en ${timezone}: ${local.timeString} (${DAY_NAMES[currentDay]}). Horarios autorizados: ${summary}.`,
    localTime: local.timeString,
    dayOfWeek: currentDay,
    dayName: DAY_NAMES[currentDay],
    authorizedSummary: summary,
  };
}

/**
 * Evalúa el horario efectivo de un empleado:
 * Intersección estricta entre el horario general del restaurante y su horario individual.
 */
export function evaluateEffectiveSchedule(
  generalSchedule: DaySchedule[],
  individualSchedule?: { enabled: boolean; weeklySchedule: DaySchedule[] },
  date: Date = new Date(),
  timezone: string = 'America/Mexico_City',
): ScheduleEvaluationResult {
  // Primero debe estar permitido en la disponibilidad general del restaurante
  const generalResult = evaluateWeeklySchedule(generalSchedule, date, timezone);
  if (!generalResult.allowed) {
    return {
      allowed: false,
      reason: `El restaurante se encuentra cerrado en este momento (${generalResult.localTime} ${generalResult.dayName}). Horario de apertura general: ${generalResult.authorizedSummary}.`,
      localTime: generalResult.localTime,
      dayOfWeek: generalResult.dayOfWeek,
      dayName: generalResult.dayName,
      authorizedSummary: generalResult.authorizedSummary,
    };
  }

  // Si tiene horario individual habilitado, debe estar permitido en él también
  if (individualSchedule?.enabled && Array.isArray(individualSchedule.weeklySchedule) && individualSchedule.weeklySchedule.length > 0) {
    const individualResult = evaluateWeeklySchedule(individualSchedule.weeklySchedule, date, timezone);
    if (!individualResult.allowed) {
      return {
        allowed: false,
        reason: `Su horario individual no autoriza acceso en este momento (${individualResult.localTime} ${individualResult.dayName}). Su turno asignado: ${individualResult.authorizedSummary}.`,
        localTime: individualResult.localTime,
        dayOfWeek: individualResult.dayOfWeek,
        dayName: individualResult.dayName,
        authorizedSummary: individualResult.authorizedSummary,
      };
    }
    return individualResult;
  }

  return generalResult;
}

