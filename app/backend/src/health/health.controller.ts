import { Controller, Get } from '@nestjs/common';
import { getOperatingScheduleStatus } from '../common/utils/operating-schedule.util';

@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  @Get()
  getHealth() {
    const uptimeSeconds = Math.round((Date.now() - this.startTime) / 1000);
    const schedule = getOperatingScheduleStatus();

    return {
      status: 'ok',
      service: 'pos-backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      localTime: schedule.localTime,
      timezone: schedule.timezone,
      operatingSchedule: {
        isOperating: schedule.isOperating,
        start: schedule.start,
        end: schedule.end,
        timezone: schedule.timezone,
        simulated: schedule.simulated,
        ...(schedule.simulationNote ? { note: schedule.simulationNote } : {}),
      },
    };
  }
}

