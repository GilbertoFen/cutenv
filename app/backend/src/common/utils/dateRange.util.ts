import { BadRequestException } from "@nestjs/common";

export function dayUtcRange(dateYYYYMMDD: string): { start: Date; end: Date } {
  const start = new Date(`${dateYYYYMMDD}T00:00:00.000Z`);
  const end = new Date(`${dateYYYYMMDD}T23:59:59.999Z`);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new BadRequestException('Fecha inválida (YYYY-MM-DD)');
  }
  return { start, end };
}