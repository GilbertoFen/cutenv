import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { User, UserDocument } from '../schemasMongo/user.schema';
import { Restaurant, RestaurantDocument } from '../schemasMongo/restaurant.schema';
import { AccessSchedule, AccessScheduleDocument } from '../schemasMongo/access-schedule.schema';
import { UserSession, UserSessionDocument } from '../schemasMongo/user-session.schema';
import { AuditService } from '../audit/audit.service';
import { WaiterGateway } from '../gateways/waiter.gateway';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { evaluateEffectiveSchedule } from '../common/utils/schedule-validation.util';
import { JwtPayload } from '../auth/jwt.service';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Restaurant.name) private readonly restaurantModel: Model<RestaurantDocument>,
    @InjectModel(AccessSchedule.name) private readonly scheduleModel: Model<AccessScheduleDocument>,
    @InjectModel(UserSession.name) private readonly sessionModel: Model<UserSessionDocument>,
    private readonly auditService: AuditService,
    private readonly waiterGateway: WaiterGateway,
  ) {}

  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Obtener restaurante del usuario autenticado
   */
  private async getTargetRestaurantId(currentUser: JwtPayload, explicitRestId?: string): Promise<Types.ObjectId> {
    if (currentUser.username === 'root') {
      if (explicitRestId && Types.ObjectId.isValid(explicitRestId)) {
        return new Types.ObjectId(explicitRestId);
      }
      const defaultRest = await this.restaurantModel.findOne({ code: 'default-restaurant' });
      return defaultRest?._id as Types.ObjectId;
    }

    if (!currentUser.restaurantId || !Types.ObjectId.isValid(currentUser.restaurantId)) {
      throw new ForbiddenException('Su cuenta no está vinculada a ningún restaurante activo.');
    }

    return new Types.ObjectId(currentUser.restaurantId);
  }

  /**
   * Listar empleados con filtros, búsqueda y estado de conexión en tiempo real
   */
  async getEmployees(
    currentUser: JwtPayload,
    query: {
      role?: string;
      operationalRole?: string;
      status?: string;
      search?: string;
      connectionStatus?: string;
    },
  ) {
    const restaurantId = await this.getTargetRestaurantId(currentUser);

    const filter: any = { restaurant: restaurantId };
    if (currentUser.username !== 'root') {
      filter.username = { $ne: 'root' };
    }

    if (query.role) filter.role = query.role;
    if (query.operationalRole) filter.operationalRole = query.operationalRole;
    if (query.status) filter.status = query.status;

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      filter.$or = [
        { name: { $regex: s, $options: 'i' } },
        { lastName: { $regex: s, $options: 'i' } },
        { email: { $regex: s, $options: 'i' } },
        { username: { $regex: s, $options: 'i' } },
      ];
    }

    const [users, restaurant, schedule, activeSessions] = await Promise.all([
      this.userModel.find(filter).sort({ createdAt: -1 }).lean(),
      this.restaurantModel.findById(restaurantId).lean(),
      this.scheduleModel.findOne({ restaurant: restaurantId }).lean(),
      this.sessionModel
        .find({
          restaurant: restaurantId,
          isActive: true,
          lastHeartbeat: { $gte: new Date(Date.now() - 90 * 1000) }, // Últimos 90 segundos
        })
        .select('user')
        .lean(),
    ]);

    const onlineUserIds = new Set(activeSessions.map((s) => s.user?.toString()));
    const timezone = restaurant?.timezone || schedule?.timezone || 'America/Mexico_City';

    const mapped = users.map((u) => {
      const isOnline = onlineUserIds.has(u._id.toString());
      let connectionStatus: 'online' | 'offline' | 'outside_schedule' | 'inactive' = 'offline';

      if (u.status === 'inactive') {
        connectionStatus = 'inactive';
      } else if (isOnline) {
        connectionStatus = 'online';
      } else {
        // Si es worker, revisar si está dentro o fuera de horario
        if (u.role === 'worker' && schedule) {
          const evalRes = evaluateEffectiveSchedule(
            schedule.weeklySchedule,
            u.individualSchedule,
            new Date(),
            timezone,
          );
          connectionStatus = evalRes.allowed ? 'offline' : 'outside_schedule';
        } else {
          connectionStatus = 'offline';
        }
      }

      return {
        id: u._id.toString(),
        name: u.name,
        lastName: u.lastName || '',
        fullName: [u.name, u.lastName].filter(Boolean).join(' '),
        email: u.email || u.username,
        username: u.username,
        role: u.role,
        operationalRole: u.operationalRole || (u.role === 'worker' ? 'mesero' : undefined),
        status: u.status,
        connectionStatus,
        isOnline,
        individualSchedule: u.individualSchedule,
        lastActivity: u.lastActivity,
        createdAt: (u as any).createdAt,
      };
    });

    // Filtro adicional por connectionStatus si se solicitó
    if (query.connectionStatus) {
      return mapped.filter((m) => m.connectionStatus === query.connectionStatus);
    }

    return mapped;
  }

  /**
   * Resumen de estadísticas del personal
   */
  async getEmployeeStats(currentUser: JwtPayload) {
    const restaurantId = await this.getTargetRestaurantId(currentUser);

    const [allEmployees, activeSessions, schedule, restaurant] = await Promise.all([
      this.userModel.find({ restaurant: restaurantId, username: { $ne: 'root' } }).lean(),
      this.sessionModel
        .find({
          restaurant: restaurantId,
          isActive: true,
          lastHeartbeat: { $gte: new Date(Date.now() - 90 * 1000) },
        })
        .select('user')
        .lean(),
      this.scheduleModel.findOne({ restaurant: restaurantId }).lean(),
      this.restaurantModel.findById(restaurantId).lean(),
    ]);

    const onlineUserIds = new Set(activeSessions.map((s) => s.user?.toString()));
    const timezone = restaurant?.timezone || schedule?.timezone || 'America/Mexico_City';

    let total = allEmployees.length;
    let active = 0;
    let online = 0;
    let offline = 0;
    let restricted = 0;

    for (const u of allEmployees) {
      if (u.status === 'active') {
        active++;
      }

      if (onlineUserIds.has(u._id.toString())) {
        online++;
      } else if (u.status === 'inactive') {
        offline++;
      } else {
        if (u.role === 'worker' && schedule) {
          const evalRes = evaluateEffectiveSchedule(
            schedule.weeklySchedule,
            u.individualSchedule,
            new Date(),
            timezone,
          );
          if (!evalRes.allowed) {
            restricted++;
          } else {
            offline++;
          }
        } else {
          offline++;
        }
      }
    }

    return {
      total,
      active,
      online,
      offline,
      restricted,
    };
  }

  /**
   * Crear nuevo empleado en el restaurante autenticado
   */
  async createEmployee(dto: CreateEmployeeDto, currentUser: JwtPayload) {
    const restaurantId = await this.getTargetRestaurantId(currentUser);

    // Jerarquía estricta:
    // El Gerente sólo puede dar de alta Trabajadores operativos
    if (currentUser.role === 'manager' && dto.role && dto.role !== 'worker') {
      throw new ForbiddenException('El Gerente únicamente puede crear cuentas de Trabajador Operativo.');
    }

    // Nadie puede crear un Dueño desde la sección de empleados (solo Root Admin al crear restaurante)
    if ((dto as any).role === 'owner') {
      throw new ForbiddenException('No está permitido crear cuentas de Dueño desde este módulo.');
    }

    const email = dto.email.toLowerCase().trim();
    const username = (dto.username || dto.email).toLowerCase().trim();

    // Validar duplicados
    const existing = await this.userModel.findOne({
      $or: [{ username }, { email }],
    });
    if (existing) {
      throw new ConflictException(`El correo o usuario "${email}" ya se encuentra registrado.`);
    }

    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 horas
    const initialHash = this.hashPassword(crypto.randomBytes(24).toString('hex'));

    const created = await this.userModel.create({
      username,
      email,
      name: dto.name.trim(),
      lastName: dto.lastName?.trim(),
      password: initialHash,
      role: dto.role || 'worker',
      operationalRole: dto.operationalRole || 'mesero',
      status: dto.status || 'active',
      restaurant: restaurantId,
      individualSchedule: dto.individualSchedule || { enabled: false, weeklySchedule: [] },
      invitationToken,
      invitationExpiresAt,
      invitationUsed: false,
    });

    // Auditoría
    await this.auditService.log({
      restaurantId,
      userId: (currentUser as any).sub || (currentUser as any).id || (currentUser as any)._id?.toString() || 'system',
      userName: (currentUser as any).name || (currentUser as any).username || 'Usuario',
      action: 'employee_created',
      targetType: 'user',
      targetId: created._id.toString(),
      details: {
        name: created.name,
        email: created.email,
        role: created.role,
        operationalRole: created.operationalRole,
      },
    });

    return {
      success: true,
      employee: {
        id: created._id.toString(),
        name: created.name,
        lastName: created.lastName,
        fullName: [created.name, created.lastName].filter(Boolean).join(' '),
        email: created.email,
        username: created.username,
        role: created.role,
        operationalRole: created.operationalRole,
        status: created.status,
        individualSchedule: created.individualSchedule,
        createdAt: (created as any).createdAt,
      },
      invitationToken,
      invitationUrl: `/set-password?token=${invitationToken}`,
    };
  }

  /**
   * Modificar empleado, rol operativo u horario individual
   */
  async updateEmployee(id: string, dto: UpdateEmployeeDto, currentUser: JwtPayload) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('ID de empleado inválido');
    const restaurantId = await this.getTargetRestaurantId(currentUser);

    const employee = await this.userModel.findOne({ _id: id, restaurant: restaurantId });
    if (!employee) throw new NotFoundException('Empleado no encontrado en este restaurante');

    // Jerarquía estricta:
    // El Gerente no puede modificar a un Dueño ni a otro Gerente
    if (currentUser.role === 'manager' && employee.role !== 'worker') {
      throw new ForbiddenException('El Gerente no tiene permisos para modificar cuentas administrativas.');
    }

    // El Gerente no puede elevar permisos
    if (currentUser.role === 'manager' && dto.role && dto.role !== 'worker') {
      throw new ForbiddenException('El Gerente no puede asignar roles administrativos.');
    }

    const prevStatus = employee.status;

    if (dto.name) employee.name = dto.name.trim();
    if (dto.lastName !== undefined) employee.lastName = dto.lastName.trim();
    if (dto.email) employee.email = dto.email.toLowerCase().trim();
    if (dto.role) employee.role = dto.role;
    if (dto.operationalRole) employee.operationalRole = dto.operationalRole;
    if (dto.status) employee.status = dto.status;
    if (dto.individualSchedule) employee.individualSchedule = dto.individualSchedule as any;

    await employee.save();

    // Si la cuenta fue desactivada, revocar de inmediato todas sus sesiones activas
    if (dto.status === 'inactive' && prevStatus !== 'inactive') {
      await this.sessionModel.updateMany(
        { user: employee._id, isActive: true },
        {
          $set: {
            isActive: false,
            revokedAt: new Date(),
            revokedReason: 'employee_deactivated',
          },
        },
      );

      this.waiterGateway.emitToAll('auth.session.revoked', {
        userIds: [employee._id.toString()],
        reason: 'Su cuenta ha sido desactivada por la administración del restaurante.',
      });
    }

    // Si se modificó su horario individual, verificar si su sesión actual sigue autorizada
    if (dto.individualSchedule && employee.role === 'worker') {
      const schedule = await this.scheduleModel.findOne({ restaurant: restaurantId });
      const rest = await this.restaurantModel.findById(restaurantId);
      const tz = rest?.timezone || schedule?.timezone || 'America/Mexico_City';

      if (schedule) {
        const evalRes = evaluateEffectiveSchedule(
          schedule.weeklySchedule,
          employee.individualSchedule,
          new Date(),
          tz,
        );

        if (!evalRes.allowed) {
          await this.sessionModel.updateMany(
            { user: employee._id, isActive: true },
            {
              $set: {
                isActive: false,
                revokedAt: new Date(),
                revokedReason: 'schedule_changed',
              },
            },
          );

          this.waiterGateway.emitToAll('auth.session.revoked', {
            userIds: [employee._id.toString()],
            reason: 'Su horario de trabajo ha sido modificado y su turno ha concluido.',
          });
        }
      }
    }

    // Auditoría
    await this.auditService.log({
      restaurantId,
      userId: (currentUser as any).sub || (currentUser as any).id || (currentUser as any)._id?.toString() || 'system',
      userName: (currentUser as any).name || (currentUser as any).username || 'Usuario',
      action: dto.status && dto.status !== prevStatus ? 'account_status_changed' : 'employee_updated',
      targetType: 'user',
      targetId: employee._id.toString(),
      details: { ...dto, prevStatus },
    });

    return {
      success: true,
      employee: {
        id: employee._id.toString(),
        name: employee.name,
        lastName: employee.lastName,
        fullName: [employee.name, employee.lastName].filter(Boolean).join(' '),
        email: employee.email,
        role: employee.role,
        operationalRole: employee.operationalRole,
        status: employee.status,
        individualSchedule: employee.individualSchedule,
      },
    };
  }

  /**
   * Obtener solicitudes de restablecimiento de contraseña pendientes
   */
  async getPasswordResetRequests(currentUser: JwtPayload) {
    const restaurantId = await this.getTargetRestaurantId(currentUser);
    const pendingUsers = await this.userModel.find({
      restaurant: restaurantId,
      'passwordResetRequest.status': 'pending',
    }).sort({ 'passwordResetRequest.requestedAt': -1 });

    return pendingUsers.map((emp) => ({
      id: emp._id.toString(),
      name: emp.name,
      lastName: emp.lastName || '',
      username: emp.username,
      email: emp.email || '',
      role: emp.role,
      operationalRole: emp.operationalRole,
      requestedAt: emp.passwordResetRequest?.requestedAt,
      reason: emp.passwordResetRequest?.reason,
    }));
  }

  /**
   * Autorizar solicitud de restablecimiento de contraseña (Gerente o Dueño)
   * Genera el token único, temporal y de un solo uso.
   */
  async authorizePasswordReset(id: string, currentUser: JwtPayload) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('ID de empleado inválido');
    const restaurantId = await this.getTargetRestaurantId(currentUser);

    const employee = await this.userModel.findOne({ _id: id, restaurant: restaurantId });
    if (!employee) throw new NotFoundException('Empleado no encontrado');

    if (currentUser.role === 'manager' && employee.role !== 'worker') {
      throw new ForbiddenException('El Gerente no tiene permisos para autorizar contraseñas de cuentas de Dueño.');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    employee.passwordResetToken = resetToken;
    employee.passwordResetExpiresAt = resetExpiresAt;
    employee.passwordResetRequest = {
      status: 'authorized',
      requestedAt: employee.passwordResetRequest?.requestedAt || new Date(),
      reason: employee.passwordResetRequest?.reason,
      authorizedBy: ((currentUser as any).sub || (currentUser as any).id) as any,
      authorizedAt: new Date(),
    };
    await employee.save();

    await this.auditService.log({
      restaurantId,
      userId: (currentUser as any).sub || (currentUser as any).id || (currentUser as any)._id?.toString() || 'system',
      userName: (currentUser as any).name || (currentUser as any).username || 'Usuario',
      action: 'password_reset_authorized',
      targetType: 'user',
      targetId: employee._id.toString(),
      details: { employeeEmail: employee.email, username: employee.username },
    });

    return {
      success: true,
      message: 'Solicitud de restablecimiento autorizada exitosamente.',
      resetToken,
      resetUrl: `/set-password?token=${resetToken}&mode=reset`,
    };
  }

  /**
   * Rechazar solicitud de restablecimiento de contraseña
   * Cancela la petición sin generar ningún enlace.
   */
  async rejectPasswordReset(id: string, currentUser: JwtPayload) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('ID de empleado inválido');
    const restaurantId = await this.getTargetRestaurantId(currentUser);

    const employee = await this.userModel.findOne({ _id: id, restaurant: restaurantId });
    if (!employee) throw new NotFoundException('Empleado no encontrado');

    if (currentUser.role === 'manager' && employee.role !== 'worker') {
      throw new ForbiddenException('El Gerente no tiene permisos para rechazar solicitudes de cuentas de Dueño.');
    }

    employee.passwordResetToken = undefined;
    employee.passwordResetExpiresAt = undefined;
    employee.passwordResetRequest = {
      status: 'rejected',
      requestedAt: employee.passwordResetRequest?.requestedAt || new Date(),
      reason: employee.passwordResetRequest?.reason,
      rejectedBy: ((currentUser as any).sub || (currentUser as any).id) as any,
      rejectedAt: new Date(),
    };
    await employee.save();

    await this.auditService.log({
      restaurantId,
      userId: (currentUser as any).sub || (currentUser as any).id || (currentUser as any)._id?.toString() || 'system',
      userName: (currentUser as any).name || (currentUser as any).username || 'Usuario',
      action: 'password_reset_rejected',
      targetType: 'user',
      targetId: employee._id.toString(),
      details: { employeeEmail: employee.email, username: employee.username },
    });

    return {
      success: true,
      message: 'Solicitud de restablecimiento rechazada. No se generó ningún enlace.',
    };
  }

  /**
   * Generar nuevo token de restablecimiento de contraseña directamente por gerencia
   */
  async requestPasswordReset(id: string, currentUser: JwtPayload) {
    return this.authorizePasswordReset(id, currentUser);
  }

  /**
   * Reenviar o generar nueva invitación para un empleado
   */
  async reinviteEmployee(id: string, currentUser: JwtPayload) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('ID de empleado inválido');
    const restaurantId = await this.getTargetRestaurantId(currentUser);

    const employee = await this.userModel.findOne({ _id: id, restaurant: restaurantId });
    if (!employee) throw new NotFoundException('Empleado no encontrado');

    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 horas

    employee.invitationToken = invitationToken;
    employee.invitationExpiresAt = invitationExpiresAt;
    employee.invitationUsed = false;
    await employee.save();

    await this.auditService.log({
      restaurantId,
      userId: (currentUser as any).sub || (currentUser as any).id || (currentUser as any)._id?.toString() || 'system',
      userName: (currentUser as any).name || (currentUser as any).username || 'Usuario',
      action: 'invitation_reissued',
      targetType: 'user',
      targetId: employee._id.toString(),
      details: { employeeEmail: employee.email },
    });

    return {
      success: true,
      message: 'Nueva invitación generada exitosamente',
      invitationToken,
      invitationUrl: `/set-password?token=${invitationToken}`,
    };
  }
}

