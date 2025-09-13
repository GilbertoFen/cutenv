import { Types, isObjectIdOrHexString, isValidObjectId} from "mongoose";

export function normalizeId(type: any): string {
  if (!type) return '';

  if (isObjectIdOrHexString(type)) return type.toString();

  if (typeof type === 'string') {
    if (isValidObjectId(type)) return type;
    const m = type.match(/ObjectId\('([0-9a-fA-F]{24})'\)/);
    if (m?.[1] && isValidObjectId(m[1])) return m[1];
    return '';
  }

  if (type._id) return normalizeId(type._id);
  if (type.id) return normalizeId(type.id);

  return '';
}

export function isPopulatedTable(table: any): table is { _id: any; number?: number } {
  return table && typeof table === 'object' && ('_id' in table || 'number' in table);
}

export function normalizeIdStrict(ref: any): string {
  const out = normalizeId(ref);
  if (!out) throw new Error('normalizeId: valor sin ObjectId válido');
  return out;
}

