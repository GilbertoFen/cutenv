import { Types } from "mongoose";


export type TableLite = {
  _id: Types.ObjectId;
  number: number;
  status: string;
  capacity: number;
};

export type ReservationLean = {
  _id: Types.ObjectId;
  table?: Types.ObjectId | TableLite;
  customerName?: string;
  phone?: string;
  partySize?: number;
  startTime: Date;
  endTime: Date;
  status: 'programada' | 'sentada' | 'cancelada' | 'no_asistencia' | 'expirada';
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ReservationDto = {
  id: string;
  table?: { id: string; number: number; status: string; capacity: number } | string;
  customerName?: string;
  phone?: string;
  partySize?: number;
  startTime: string; // ISO
  endTime: string;   // ISO
  status: ReservationLean['status'];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function mapLean(r: ReservationLean): ReservationDto {
    const table =
      r.table && typeof (r.table as TableLite)._id !== 'undefined'
        ? {
          id: ((r.table as TableLite)._id).toString(),
          number: (r.table as TableLite).number,
          status: (r.table as TableLite).status,
          capacity: (r.table as TableLite).capacity,
        }
        : typeof r.table === 'string'
          ? r.table
          : undefined;

    return {
      id: r._id.toString(),
      table,
      customerName: r.customerName,
      phone: r.phone,
      partySize: r.partySize,
      startTime: r.startTime.toISOString(),
      endTime: r.endTime.toISOString(),
      status: r.status,
      notes: r.notes,
      createdAt: r.createdAt ? r.createdAt.toISOString() : undefined,
      updatedAt: r.updatedAt ? r.updatedAt.toISOString() : undefined,
    };
  }
