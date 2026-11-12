import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../schemasMongo/audit-log.schema';

export interface CreateAuditLogParams {
  restaurantId?: string | Types.ObjectId;
  userId: string;
  userName: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(params: CreateAuditLogParams): Promise<AuditLogDocument> {
    try {
      const sanitizedDetails = params.details ? { ...params.details } : undefined;
      // Seguridad: eliminar cualquier campo sensible
      if (sanitizedDetails) {
        delete sanitizedDetails.password;
        delete sanitizedDetails.token;
        delete sanitizedDetails.invitationToken;
        delete sanitizedDetails.passwordResetToken;
      }

      const logEntry = new this.auditLogModel({
        restaurant:
          params.restaurantId && Types.ObjectId.isValid(params.restaurantId.toString())
            ? new Types.ObjectId(params.restaurantId.toString())
            : undefined,
        userId: params.userId || 'system',
        userName: params.userName || 'Sistema',
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        details: sanitizedDetails,
        ipAddress: params.ipAddress,
      });

      return await logEntry.save();
    } catch (e) {
      console.warn('[AuditService] Failed to record audit log:', e);
      return null as any;
    }
  }

  async getLogs(query: {
    restaurantId?: string;
    action?: string;
    targetType?: string;
    limit?: number;
    skip?: number;
  }) {
    const filter: any = {};
    if (query.restaurantId && Types.ObjectId.isValid(query.restaurantId)) {
      filter.restaurant = new Types.ObjectId(query.restaurantId);
    }
    if (query.action) {
      filter.action = query.action;
    }
    if (query.targetType) {
      filter.targetType = query.targetType;
    }

    const limit = Math.min(Math.max(query.limit || 50, 1), 100);
    const skip = query.skip || 0;

    const [logs, total] = await Promise.all([
      this.auditLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.auditLogModel.countDocuments(filter),
    ]);

    return {
      total,
      limit,
      skip,
      logs: logs.map((l: any) => ({
        id: l._id.toString(),
        restaurantId: l.restaurant?.toString(),
        userId: l.userId,
        userName: l.userName,
        action: l.action,
        targetType: l.targetType,
        targetId: l.targetId,
        details: l.details,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt,
      })),
    };
  }
}

