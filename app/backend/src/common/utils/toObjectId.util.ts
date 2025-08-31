import { Types } from "mongoose";
import { BadRequestException } from "@nestjs/common";

export function toObjectId(v: unknown): Types.ObjectId {
  if (v instanceof Types.ObjectId) return v;
  if (typeof v === 'string' && Types.ObjectId.isValid(v)) return new Types.ObjectId(v);
  if (v && typeof (v as { _id?: unknown })._id !== 'undefined') {
    const nested = (v as { _id?: unknown })._id;
    if (nested instanceof Types.ObjectId) return nested;
    if (typeof nested === 'string' && Types.ObjectId.isValid(nested)) {
      return new Types.ObjectId(nested);
    }
  }
  throw new BadRequestException('Valor no convertible a ObjectId');
}