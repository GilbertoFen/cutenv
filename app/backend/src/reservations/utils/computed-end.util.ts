import { BadRequestException } from "@nestjs/common";

export function computeEnd(start: Date, endTime?: string, durationMinutes?: number): Date {
  if (endTime) {
    const e = new Date(endTime);
    if (isNaN(e.getTime())) throw new BadRequestException('endTime inválido');
    return e;
  }
  const mins = typeof durationMinutes === 'number' ? durationMinutes : 120;
  const d = new Date(start);
  d.setMinutes(d.getMinutes() + mins);
  return d;
}
