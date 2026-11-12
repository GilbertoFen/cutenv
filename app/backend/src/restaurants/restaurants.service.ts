import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { Restaurant, RestaurantDocument } from '../schemasMongo/restaurant.schema';
import { AccessSchedule, AccessScheduleDocument, DaySchedule } from '../schemasMongo/access-schedule.schema';
import { User, UserDocument } from '../schemasMongo/user.schema';
import { UserSession, UserSessionDocument } from '../schemasMongo/user-session.schema';
import { AuditService } from '../audit/audit.service';
import { WaiterGateway } from '../gateways/waiter.gateway';
import { CreateRestaurantDto, UpdateRestaurantDto, UpdateScheduleDto } from './dto/restaurant.dto';
import { evaluateEffectiveSchedule } from '../common/utils/schedule-validation.util';

@Injectable()
export class RestaurantsService implements OnModuleInit {
  constructor(
    @InjectModel(Restaurant.name) private readonly restaurantModel: Model<RestaurantDocument>,
    @InjectModel(AccessSchedule.name) private readonly scheduleModel: Model<AccessScheduleDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(UserSession.name) private readonly sessionModel: Model<UserSessionDocument>,
    private readonly auditService: AuditService,
    private readonly waiterGateway: WaiterGateway,
  ) {}

  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  async onModuleInit() {
    await this.ensureDefaultRestaurant();
  }

  /**
   * Garantiza que exista al menos el restaurante por defecto y asocia usuarios preexistentes
   */
  async ensureDefaultRestaurant(): Promise<RestaurantDocument> {
    try {
      let defaultRest = await this.restaurantModel.findOne({ code: 'default-restaurant' });
      if (!defaultRest) {
        defaultRest = await this.restaurantModel.create({
          name: 'Restaurante Principal',
          code: 'default-restaurant',
          status: 'active',
          timezone: 'America/Mexico_City',
          createdBy: 'root',
        });
        console.log('[RestaurantsService] Default restaurant initialized (default-restaurant)');
      }

      // Asegurar horario por defecto
      let schedule = await this.scheduleModel.findOne({ restaurant: defaultRest._id });
      if (!schedule) {
        schedule = await this.scheduleModel.create({
          restaurant: defaultRest._id,
          timezone: 'America/Mexico_City',
        });
        console.log('[RestaurantsService] Default restaurant access schedule created');
      }

      // Asociar usuarios existentes que no tengan restaurantId (excepto root)
      const unlinkedUsers = await this.userModel.find({
        username: { $ne: 'root' },
        $or: [{ restaurant: { $exists: false } }, { restaurant: null }],
      });

      for (const u of unlinkedUsers) {
        u.restaurant = defaultRest._id;
        if (!u.email) {
          u.email = `${u.username}@pos.local`;
        }
        await u.save();
      }

      if (unlinkedUsers.length > 0) {
        console.log(`[RestaurantsService] Linked ${unlinkedUsers.length} legacy users to default restaurant`);
      }

      return defaultRest;
    } catch (err) {
      console.warn('[RestaurantsService] ensureDefaultRestaurant warning:', err);
      return null as any;
    }
  }

  /**
   * Alta de nuevo restaurante con sus cuentas administrativas principales (Dueño y Gerente)
   */
  async createRestaurant(dto: CreateRestaurantDto, createdBy: string = 'root') {
    // 1. Validar código/slug único
    const code = (
      dto.code ||
      dto.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    ).trim();

    const existingRest = await this.restaurantModel.findOne({ code });
    if (existingRest) {
      throw new ConflictException(`Ya existe un restaurante con el código/identificador "${code}"`);
    }

    // 2. Validar que los correos de dueño y gerente no estén ya registrados
    const ownerEmail = dto.ownerEmail.toLowerCase().trim();
    const managerEmail = dto.managerEmail.toLowerCase().trim();

    if (ownerEmail === managerEmail) {
      throw new BadRequestException('El correo del Dueño y del Gerente deben ser distintos');
    }

    const [existingOwner, existingManager] = await Promise.all([
      this.userModel.findOne({ $or: [{ username: ownerEmail }, { email: ownerEmail }] }),
      this.userModel.findOne({ $or: [{ username: managerEmail }, { email: managerEmail }] }),
    ]);

    if (existingOwner) {
      throw new ConflictException(`El correo "${ownerEmail}" ya está registrado en el sistema`);
    }
    if (existingManager) {
      throw new ConflictException(`El correo "${managerEmail}" ya está registrado en el sistema`);
    }

    // 3. Crear restaurante
    const timezone = dto.timezone || 'America/Mexico_City';
    const restaurant = await this.restaurantModel.create({
      name: dto.name.trim(),
      code,
      timezone,
      address: dto.address?.trim(),
      phone: dto.phone?.trim(),
      status: 'active',
      createdBy,
    });

    // 4. Crear horario general de acceso por defecto (Lunes a Domingo 08:00 a 23:00)
    await this.scheduleModel.create({
      restaurant: restaurant._id,
      timezone,
    });

    // 5. Generar tokens seguros de invitación (vigencia de 72 horas)
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const ownerToken = crypto.randomBytes(32).toString('hex');
    const managerToken = crypto.randomBytes(32).toString('hex');

    // Contraseña inicial aleatoria y no reutilizable
    const dummyOwnerPass = this.hashPassword(crypto.randomBytes(24).toString('hex'));
    const dummyManagerPass = this.hashPassword(crypto.randomBytes(24).toString('hex'));

    let ownerUsername = ownerEmail.split('@')[0].toLowerCase().trim();
    let managerUsername = managerEmail.split('@')[0].toLowerCase().trim();

    const existingOwnerU = await this.userModel.findOne({ username: ownerUsername });
    if (existingOwnerU) ownerUsername = `${ownerUsername}_${code}`;

    const existingManagerU = await this.userModel.findOne({ username: managerUsername });
    if (existingManagerU) managerUsername = `${managerUsername}_${code}`;

    const ownerUser = await this.userModel.create({
      username: ownerUsername,
      email: ownerEmail,
      name: dto.ownerName.trim(),
      password: dummyOwnerPass,
      role: 'owner',
      status: 'active',
      restaurant: restaurant._id,
      invitationToken: ownerToken,
      invitationExpiresAt: expiresAt,
      invitationUsed: false,
    });

    const managerUser = await this.userModel.create({
      username: managerUsername,
      email: managerEmail,
      name: dto.managerName.trim(),
      password: dummyManagerPass,
      role: 'manager',
      status: 'active',
      restaurant: restaurant._id,
      invitationToken: managerToken,
      invitationExpiresAt: expiresAt,
      invitationUsed: false,
    });

    // 6. Auditoría
    await this.auditService.log({
      restaurantId: restaurant._id,
      userId: createdBy,
      userName: 'Root Admin',
      action: 'restaurant_created',
      targetType: 'restaurant',
      targetId: restaurant._id.toString(),
      details: {
        name: restaurant.name,
        code: restaurant.code,
        ownerId: ownerUser._id.toString(),
        ownerEmail,
        managerId: managerUser._id.toString(),
        managerEmail,
      },
    });

    return {
      success: true,
      restaurant: {
        id: restaurant._id.toString(),
        name: restaurant.name,
        code: restaurant.code,
        status: restaurant.status,
        timezone: restaurant.timezone,
        address: restaurant.address,
        phone: restaurant.phone,
        createdAt: (restaurant as any).createdAt,
      },
      owner: {
        id: ownerUser._id.toString(),
        name: ownerUser.name,
        username: ownerUser.username,
        email: ownerUser.email,
        role: ownerUser.role,
        invitationToken: ownerToken,
        invitationExpiresAt: expiresAt,
        invitationUrl: `/set-password?token=${ownerToken}`,
      },
      manager: {
        id: managerUser._id.toString(),
        name: managerUser.name,
        username: managerUser.username,
        email: managerUser.email,
        role: managerUser.role,
        invitationToken: managerToken,
        invitationExpiresAt: expiresAt,
        invitationUrl: `/set-password?token=${managerToken}`,
      },
    };
  }

  /**
   * Listar todos los restaurantes registrados (para Root Admin)
   */
  async getAllRestaurants() {
    const restaurants = await this.restaurantModel.find().sort({ createdAt: -1 }).lean();

    const results = await Promise.all(
      restaurants.map(async (r) => {
        const [users, schedule] = await Promise.all([
          this.userModel.find({ restaurant: r._id }).select('name email username role status lastActivity').lean(),
          this.scheduleModel.findOne({ restaurant: r._id }).lean(),
        ]);

        const owner = users.find((u) => u.role === 'owner');
        const manager = users.find((u) => u.role === 'manager');
        const workers = users.filter((u) => u.role === 'worker');

        return {
          id: r._id.toString(),
          name: r.name,
          code: r.code,
          status: r.status,
          timezone: r.timezone || 'America/Mexico_City',
          address: r.address || '—',
          phone: r.phone || '—',
          createdBy: r.createdBy,
          createdAt: (r as any).createdAt,
          userCount: users.length,
          workerCount: workers.length,
          owner: owner
            ? {
                id: owner._id.toString(),
                name: owner.name,
                email: owner.email || owner.username,
                status: owner.status,
                lastActivity: owner.lastActivity,
              }
            : null,
          manager: manager
            ? {
                id: manager._id.toString(),
                name: manager.name,
                email: manager.email || manager.username,
                status: manager.status,
                lastActivity: manager.lastActivity,
              }
            : null,
          schedule: schedule?.weeklySchedule || [],
        };
      }),
    );

    return results;
  }

  async getRestaurantById(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('ID de restaurante inválido');
    const r = await this.restaurantModel.findById(id).lean();
    if (!r) throw new NotFoundException('Restaurante no encontrado');

    const [users, schedule] = await Promise.all([
      this.userModel.find({ restaurant: r._id }).select('name email username role operationalRole status lastActivity createdAt').lean(),
      this.scheduleModel.findOne({ restaurant: r._id }).lean(),
    ]);

    return {
      id: r._id.toString(),
      name: r.name,
      code: r.code,
      status: r.status,
      timezone: r.timezone,
      address: r.address,
      phone: r.phone,
      createdAt: (r as any).createdAt,
      users: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email || u.username,
        role: u.role,
        operationalRole: u.operationalRole,
        status: u.status,
        lastActivity: u.lastActivity,
        createdAt: (u as any).createdAt,
      })),
      schedule: schedule?.weeklySchedule || [],
    };
  }

  /**
   * Actualizar datos o estado (activar/desactivar) de un restaurante
   */
  async updateRestaurant(id: string, dto: UpdateRestaurantDto, user: { sub: string; name: string }) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('ID de restaurante inválido');
    const r = await this.restaurantModel.findById(id);
    if (!r) throw new NotFoundException('Restaurante no encontrado');

    const prevStatus = r.status;

    if (dto.name) r.name = dto.name.trim();
    if (dto.status) r.status = dto.status;
    if (dto.timezone) r.timezone = dto.timezone.trim();
    if (dto.address !== undefined) r.address = dto.address.trim();
    if (dto.phone !== undefined) r.phone = dto.phone.trim();

    await r.save();

    // Si el restaurante se desactivó, revocar de inmediato todas las sesiones activas
    if (dto.status === 'inactive' && prevStatus !== 'inactive') {
      await this.sessionModel.updateMany(
        { restaurant: r._id, isActive: true },
        {
          $set: {
            isActive: false,
            revokedAt: new Date(),
            revokedReason: 'restaurant_deactivated',
          },
        },
      );

      this.waiterGateway.emitToAll('auth.session.revoked', {
        restaurantId: r._id.toString(),
        reason: 'El restaurante ha sido suspendido por el administrador de la plataforma',
      });
    }

    await this.auditService.log({
      restaurantId: r._id,
      userId: (user as any).sub || (user as any).id || (user as any)._id?.toString() || 'system',
      userName: (user as any).name || (user as any).username || 'Root Admin',
      action: dto.status && dto.status !== prevStatus ? 'restaurant_status_changed' : 'restaurant_updated',
      targetType: 'restaurant',
      targetId: r._id.toString(),
      details: { ...dto, prevStatus },
    });

    return r;
  }

  /**
   * Obtener horario general de disponibilidad de un restaurante
   */
  async getSchedule(restaurantId: string): Promise<AccessScheduleDocument> {
    let schedule = await this.scheduleModel.findOne({
      restaurant: new Types.ObjectId(restaurantId),
    });

    if (!schedule) {
      const rest = await this.restaurantModel.findById(restaurantId);
      schedule = await this.scheduleModel.create({
        restaurant: new Types.ObjectId(restaurantId),
        timezone: rest?.timezone || 'America/Mexico_City',
      });
    }

    return schedule;
  }

  /**
   * Modificar horario general del restaurante y revocar en tiempo real
   * sesiones de empleados que queden fuera del nuevo horario
   */
  async updateSchedule(
    restaurantId: string,
    dto: UpdateScheduleDto,
    user: { sub: string; name: string },
  ) {
    let schedule = await this.getSchedule(restaurantId);

    schedule.weeklySchedule = dto.weeklySchedule as any;
    if (dto.timezone) {
      schedule.timezone = dto.timezone.trim();
      await this.restaurantModel.findByIdAndUpdate(restaurantId, {
        $set: { timezone: dto.timezone.trim() },
      });
    }

    await schedule.save();

    // 1. Evaluar todas las sesiones activas de trabajadores en este restaurante
    const activeSessions = await this.sessionModel
      .find({
        restaurant: new Types.ObjectId(restaurantId),
        role: 'worker',
        isActive: true,
      })
      .populate('user');

    const revokedUserIds: string[] = [];

    for (const session of activeSessions) {
      const workerUser = session.user as any;
      if (!workerUser) continue;

      const evaluation = evaluateEffectiveSchedule(
        schedule.weeklySchedule,
        workerUser.individualSchedule,
        new Date(),
        schedule.timezone,
      );

      // Si quedó fuera del nuevo horario, revocar sesión de inmediato
      if (!evaluation.allowed) {
        session.isActive = false;
        session.revokedAt = new Date();
        session.revokedReason = 'schedule_changed';
        await session.save();
        revokedUserIds.push(workerUser._id.toString());
      }
    }

    // 2. Si hubo sesiones revocadas, notificar vía WebSocket para desconectar al usuario
    if (revokedUserIds.length > 0) {
      this.waiterGateway.emitToAll('auth.session.revoked', {
        userIds: revokedUserIds,
        reason: 'El horario de atención del restaurante ha sido actualizado y su turno ha concluido.',
      });
    }

    // 3. Registrar en auditoría
    await this.auditService.log({
      restaurantId: new Types.ObjectId(restaurantId),
      userId: (user as any).sub || (user as any).id || (user as any)._id?.toString() || 'system',
      userName: (user as any).name || (user as any).username || 'Usuario',
      action: 'schedule_changed',
      targetType: 'schedule',
      targetId: schedule._id.toString(),
      details: {
        weeklySchedule: dto.weeklySchedule,
        timezone: schedule.timezone,
        revokedSessionsCount: revokedUserIds.length,
      },
    });

    return {
      success: true,
      schedule,
      revokedSessionsCount: revokedUserIds.length,
    };
  }
}

