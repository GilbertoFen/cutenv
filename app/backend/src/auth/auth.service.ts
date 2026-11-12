import {
  Injectable,
  UnauthorizedException,
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
import {
  CreateUserDto,
  LoginDto,
  VerifyManagerDto,
  AcceptInvitationDto,
  ConfirmPasswordResetDto,
  RequestPasswordResetDto,
} from './dto/auth.dto';
import { JwtService } from './jwt.service';
import { evaluateEffectiveSchedule } from '../common/utils/schedule-validation.util';

@Injectable()
export class AuthService {
  private readonly rootPassword = process.env.ROOT_ADMIN_PASSWORD || 'root';

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Restaurant.name) private restaurantModel: Model<RestaurantDocument>,
    @InjectModel(AccessSchedule.name) private scheduleModel: Model<AccessScheduleDocument>,
    @InjectModel(UserSession.name) private sessionModel: Model<UserSessionDocument>,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly waiterGateway: WaiterGateway,
  ) {}

  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, combined: string): boolean {
    try {
      const [salt, key] = combined.split(':');
      if (!salt || !key) return false;
      const hash = crypto.scryptSync(password, salt, 64).toString('hex');
      return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(hash, 'hex'));
    } catch {
      return false;
    }
  }

  verifyRoot(rootPass: string): boolean {
    return rootPass === this.rootPassword;
  }

  async getAllUsers() {
    const users = await this.userModel
      .find()
      .populate('restaurant', 'name code')
      .select('-password')
      .sort({ createdAt: -1 });

    return users.map((u) => ({
      id: u._id.toString(),
      username: u.username,
      email: u.email || u.username,
      name: u.name,
      lastName: u.lastName || '',
      role: u.role,
      operationalRole: u.operationalRole,
      status: u.status,
      restaurant: u.restaurant
        ? {
            id: (u.restaurant as any)._id?.toString(),
            name: (u.restaurant as any).name,
            code: (u.restaurant as any).code,
          }
        : null,
      lastActivity: u.lastActivity,
      createdAt: (u as any).createdAt,
    }));
  }

  async createUser(dto: CreateUserDto) {
    const username = dto.username.toLowerCase().trim();
    const existing = await this.userModel.findOne({ username });
    if (existing) {
      throw new ConflictException(`El nombre de usuario "${dto.username}" ya está registrado`);
    }

    const email = dto.email ? dto.email.toLowerCase().trim() : (username.includes('@') ? username : undefined);
    if (email) {
      const existingEmail = await this.userModel.findOne({ email });
      if (existingEmail) {
        throw new ConflictException(`El correo "${email}" ya está registrado`);
      }
    }

    const hashedPassword = this.hashPassword(dto.password);
    const created = new this.userModel({
      username,
      email,
      name: dto.name.trim(),
      lastName: dto.lastName?.trim(),
      password: hashedPassword,
      role: dto.role,
      status: 'active',
      restaurant: dto.restaurantId && Types.ObjectId.isValid(dto.restaurantId) ? new Types.ObjectId(dto.restaurantId) : undefined,
    });

    const saved = await created.save();
    return {
      id: saved._id.toString(),
      username: saved.username,
      name: saved.name,
      lastName: saved.lastName,
      email: saved.email,
      role: saved.role,
      status: saved.status,
    };
  }

  async toggleUserStatus(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('ID de usuario inválido');
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.username === 'root') {
      throw new BadRequestException('No es posible desactivar la cuenta del Administrador Root');
    }
    user.status = user.status === 'active' ? 'inactive' : 'active';
    await user.save();
    return {
      success: true,
      id: user._id.toString(),
      status: user.status,
      message: `Cuenta de ${user.username} ${user.status === 'active' ? 'activada' : 'desactivada'} correctamente`,
    };
  }

  async deleteUser(id: string) {
    const deleted = await this.userModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Usuario no encontrado');
    return { success: true, message: 'Usuario eliminado correctamente' };
  }

  async onModuleInit() {
    try {
      const existing = await this.userModel.findOne({ username: 'root' });
      if (!existing) {
        await this.userModel.create({
          username: 'root',
          email: 'root@platform.local',
          name: 'Administrador Root',
          password: this.hashPassword('root'),
          role: 'owner',
          status: 'active',
        });
        console.log('[AuthService] Root user initialized (username: root, password: root)');
      }
    } catch (e) {
      console.warn('[AuthService] Could not auto-seed root user:', e);
    }
  }

  /**
   * Inicio de sesión administrativo (Dueño, Gerente, Root Admin)
   */
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const userLower = dto.username.toLowerCase().trim();

    // 1. Root Admin con credenciales por defecto o variables de entorno
    if ((userLower === 'root' || userLower === 'admin') && dto.password === this.rootPassword) {
      const user = {
        id: 'root-user-id',
        username: 'root',
        name: 'Administrador Root',
        role: 'owner' as const,
      };

      const sessionToken = crypto.randomBytes(32).toString('hex');
      const token = this.jwtService.sign({
        sub: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        sessionId: 'root-session',
      });

      return {
        success: true,
        user,
        token,
        access_token: token,
      };
    }

    // 2. Búsqueda por username o email
    const user = await this.userModel.findOne({
      $or: [{ username: userLower }, { email: userLower }],
    });

    if (!user || !this.verifyPassword(dto.password, user.password)) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    if (user.status !== 'active') {
      throw new ForbiddenException('Esta cuenta se encuentra desactivada por la administración.');
    }

    if (user.role === 'worker') {
      throw new ForbiddenException(
        'Esta cuenta corresponde al rol de Trabajador Operativo. Debe iniciar sesión en la Estación de Trabajo (/worker/login).',
      );
    }

    // 3. Validar estado del restaurante
    let restaurant: RestaurantDocument | null = null;
    if (user.restaurant) {
      restaurant = await this.restaurantModel.findById(user.restaurant);
      if (restaurant && restaurant.status !== 'active') {
        throw new ForbiddenException('El restaurante se encuentra temporalmente suspendido por la administración de la plataforma.');
      }
    }

    // Dueño y Gerente tienen acceso administrativo irrestricto sin horario
    user.lastActivity = new Date();
    await user.save();

    // Registrar sesión
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const session = await this.sessionModel.create({
      user: user._id,
      restaurant: user.restaurant,
      username: user.username,
      role: user.role,
      sessionToken,
      isActive: true,
      lastHeartbeat: new Date(),
      expiresAt: new Date(Date.now() + 12 * 3600 * 1000), // 12 horas
      ipAddress,
      userAgent,
    });

    const userData = {
      id: user._id.toString(),
      username: user.username,
      email: user.email || user.username,
      name: user.name,
      lastName: user.lastName,
      role: user.role,
      restaurantId: user.restaurant?.toString(),
    };

    const token = this.jwtService.sign({
      sub: userData.id,
      username: userData.username,
      name: userData.name,
      role: userData.role,
      restaurantId: userData.restaurantId,
      sessionId: session._id.toString(),
    });

    await this.auditService.log({
      restaurantId: user.restaurant,
      userId: user._id.toString(),
      userName: user.name,
      action: 'login_success',
      targetType: 'user',
      targetId: user._id.toString(),
      details: { role: user.role, ipAddress },
      ipAddress,
    });

    return {
      success: true,
      user: userData,
      token,
      access_token: token,
      sessionId: session._id.toString(),
    };
  }

  /**
   * Inicio de sesión de trabajadores operativos en estación de trabajo
   * Aplica estricto control y validación de horarios en NestJS
   */
  async workerLogin(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const userLower = dto.username.toLowerCase().trim();

    // Administrador root tiene acceso universal autorizado
    if ((userLower === 'root' || userLower === 'admin') && dto.password === this.rootPassword) {
      const user = {
        id: 'root-user-id',
        username: 'root',
        name: 'Administrador Root',
        role: 'owner' as const,
      };
      const token = this.jwtService.sign({
        sub: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        sessionId: 'root-session',
      });

      return {
        success: true,
        user,
        token,
        access_token: token,
        workerToken: token,
      };
    }

    const user = await this.userModel.findOne({
      $or: [{ username: userLower }, { email: userLower }],
    });

    if (!user || !this.verifyPassword(dto.password, user.password)) {
      throw new UnauthorizedException('Usuario o contraseña de trabajador incorrectos');
    }

    if (user.status !== 'active') {
      throw new ForbiddenException('Esta cuenta se encuentra desactivada por la administración.');
    }

    // Verificar restaurante
    if (!user.restaurant) {
      throw new ForbiddenException('Su cuenta no está vinculada a ningún restaurante activo.');
    }

    const restaurant = await this.restaurantModel.findById(user.restaurant);
    if (!restaurant || restaurant.status !== 'active') {
      throw new ForbiddenException('El restaurante se encuentra temporalmente suspendido.');
    }

    // 4. Evaluación de restricción horaria (Solo para workers; Dueños y Gerentes están exentos)
    if (user.role === 'worker') {
      const schedule = await this.scheduleModel.findOne({ restaurant: user.restaurant });
      const timezone = restaurant.timezone || schedule?.timezone || 'America/Mexico_City';

      if (schedule) {
        const scheduleEval = evaluateEffectiveSchedule(
          schedule.weeklySchedule,
          user.individualSchedule,
          new Date(),
          timezone,
        );

        if (!scheduleEval.allowed) {
          await this.auditService.log({
            restaurantId: user.restaurant,
            userId: user._id.toString(),
            userName: user.name,
            action: 'login_rejected_schedule',
            targetType: 'user',
            targetId: user._id.toString(),
            details: { reason: scheduleEval.reason, localTime: scheduleEval.localTime },
            ipAddress,
          });

          throw new ForbiddenException(scheduleEval.reason);
        }
      }
    }

    user.lastActivity = new Date();
    await user.save();

    // Crear sesión activa
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const session = await this.sessionModel.create({
      user: user._id,
      restaurant: user.restaurant,
      username: user.username,
      role: user.role,
      sessionToken,
      isActive: true,
      lastHeartbeat: new Date(),
      expiresAt: new Date(Date.now() + 8 * 3600 * 1000), // 8 horas por turno
      ipAddress,
      userAgent,
    });

    const userData = {
      id: user._id.toString(),
      username: user.username,
      email: user.email || user.username,
      name: user.name,
      lastName: user.lastName,
      role: user.role,
      operationalRole: user.operationalRole || 'mesero',
      restaurantId: user.restaurant.toString(),
    };

    const token = this.jwtService.sign({
      sub: userData.id,
      username: userData.username,
      name: userData.name,
      role: userData.role,
      operationalRole: userData.operationalRole,
      restaurantId: userData.restaurantId,
      sessionId: session._id.toString(),
    });

    await this.auditService.log({
      restaurantId: user.restaurant,
      userId: user._id.toString(),
      userName: user.name,
      action: 'login_success',
      targetType: 'user',
      targetId: user._id.toString(),
      details: { role: user.role, operationalRole: user.operationalRole, ipAddress },
      ipAddress,
    });

    return {
      success: true,
      user: userData,
      token,
      access_token: token,
      workerToken: token,
      sessionId: session._id.toString(),
    };
  }

  /**
   * Heartbeat para mantener viva la presencia y revalidar horarios en tiempo real
   */
  async heartbeat(userId: string, sessionId?: string) {
    if (userId === 'root-user-id') {
      return { ok: true, timestamp: Date.now() };
    }

    const user = await this.userModel.findById(userId);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Usuario inactivo o no encontrado');
    }

    user.lastActivity = new Date();
    await user.save();

    if (sessionId && Types.ObjectId.isValid(sessionId)) {
      const session = await this.sessionModel.findById(sessionId);
      if (!session || !session.isActive) {
        throw new UnauthorizedException(
          session?.revokedReason || 'Sesión finalizada o revocada por la administración.',
        );
      }

      session.lastHeartbeat = new Date();

      // Si es worker, revalidar que aún esté dentro de horario permitido
      if (user.role === 'worker' && user.restaurant) {
        const [restaurant, schedule] = await Promise.all([
          this.restaurantModel.findById(user.restaurant),
          this.scheduleModel.findOne({ restaurant: user.restaurant }),
        ]);

        const tz = restaurant?.timezone || schedule?.timezone || 'America/Mexico_City';
        if (schedule) {
          const evalRes = evaluateEffectiveSchedule(
            schedule.weeklySchedule,
            user.individualSchedule,
            new Date(),
            tz,
          );

          if (!evalRes.allowed) {
            session.isActive = false;
            session.revokedAt = new Date();
            session.revokedReason = 'schedule_ended';
            await session.save();

            this.waiterGateway.emitToAll('auth.session.revoked', {
              userIds: [user._id.toString()],
              reason: 'Su horario autorizado de atención ha concluido.',
            });

            throw new ForbiddenException(
              'Su horario autorizado ha concluido. El acceso al sistema se encuentra restringido.',
            );
          }
        }
      }

      await session.save();
    }

    return { ok: true, timestamp: Date.now() };
  }

  async getMe(userId: string) {
    if (userId === 'root-user-id') {
      return {
        id: 'root-user-id',
        username: 'root',
        name: 'Administrador Root',
        role: 'owner' as const,
      };
    }

    const user = await this.userModel.findById(userId).select('-password');
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Usuario inactivo o no encontrado');
    }

    return {
      id: user._id.toString(),
      username: user.username,
      email: user.email || user.username,
      name: user.name,
      lastName: user.lastName,
      role: user.role,
      operationalRole: user.operationalRole,
      restaurantId: user.restaurant?.toString(),
    };
  }

  /**
   * Validar token de invitación para establecer contraseña
   */
  async validateInvitation(token: string) {
    if (!token || typeof token !== 'string') {
      throw new BadRequestException('Token de invitación no proporcionado');
    }

    const user = await this.userModel
      .findOne({
        invitationToken: token,
        invitationUsed: { $ne: true },
        invitationExpiresAt: { $gt: new Date() },
      })
      .populate('restaurant', 'name code');

    if (!user) {
      throw new NotFoundException('La invitación es inválida o ha expirado. Solicite una nueva a su administrador.');
    }

    return {
      valid: true,
      name: user.name,
      lastName: user.lastName,
      email: user.email || user.username,
      role: user.role,
      operationalRole: user.operationalRole,
      restaurantName: (user.restaurant as any)?.name || 'Restaurante POS',
    };
  }

  /**
   * Aceptar invitación y establecer contraseña inicial segura
   */
  async acceptInvitation(dto: AcceptInvitationDto) {
    const user = await this.userModel.findOne({
      invitationToken: dto.token,
      invitationUsed: { $ne: true },
      invitationExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      throw new NotFoundException('La invitación es inválida o ha expirado.');
    }

    user.password = this.hashPassword(dto.password);
    user.invitationUsed = true;
    user.invitationToken = undefined;
    user.status = 'active';
    await user.save();

    await this.auditService.log({
      restaurantId: user.restaurant,
      userId: user._id.toString(),
      userName: user.name,
      action: 'password_set_invitation',
      targetType: 'user',
      targetId: user._id.toString(),
      details: { email: user.email },
    });

    return {
      success: true,
      message: 'Contraseña establecida exitosamente. Ya puede iniciar sesión en el POS.',
      role: user.role,
    };
  }

  /**
   * Solicitar restablecimiento de contraseña (proceso de autorización explícita)
   * No genera enlaces desatendidos: registra la petición en estado 'pending'
   * para revisión del gerente o dueño.
   */
  async submitPasswordResetRequest(dto: RequestPasswordResetDto) {
    if (!dto.identifier) {
      throw new BadRequestException('Usuario o correo es requerido');
    }

    const cleanIdentifier = dto.identifier.toLowerCase().trim();
    const user = await this.userModel.findOne({
      $or: [{ username: cleanIdentifier }, { email: cleanIdentifier }],
      status: 'active',
    });

    const genericResponse = {
      success: true,
      message:
        'Si el usuario está registrado en el sistema, la solicitud de restablecimiento fue enviada al gerente o dueño para su autorización.',
    };

    if (!user) {
      return genericResponse;
    }

    user.passwordResetRequest = {
      status: 'pending',
      requestedAt: new Date(),
      reason: dto.reason?.trim() || 'Solicitud de restablecimiento de contraseña',
    };
    user.passwordResetToken = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    await this.auditService.log({
      restaurantId: user.restaurant,
      userId: user._id.toString(),
      userName: user.name,
      action: 'password_reset_request_submitted',
      targetType: 'user',
      targetId: user._id.toString(),
      details: { username: user.username, email: user.email },
    });

    return genericResponse;
  }

  /**
   * Validar token de restablecimiento de contraseña
   */
  async validatePasswordResetToken(token: string) {
    if (!token) throw new BadRequestException('Token de restablecimiento requerido');

    const user = await this.userModel
      .findOne({
        passwordResetToken: token,
        passwordResetExpiresAt: { $gt: new Date() },
      })
      .populate('restaurant', 'name code');

    if (!user) {
      throw new NotFoundException('El enlace de restablecimiento es inválido o ha expirado.');
    }

    return {
      valid: true,
      name: user.name,
      email: user.email || user.username,
      restaurantName: (user.restaurant as any)?.name,
    };
  }

  /**
   * Confirmar restablecimiento de contraseña
   */
  async confirmPasswordReset(dto: ConfirmPasswordResetDto) {
    const user = await this.userModel.findOne({
      passwordResetToken: dto.token,
      passwordResetExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      throw new NotFoundException('El enlace de restablecimiento es inválido o ha expirado.');
    }

    user.password = this.hashPassword(dto.password);
    user.passwordResetToken = undefined;
    user.passwordResetExpiresAt = undefined;
    if (user.passwordResetRequest) {
      user.passwordResetRequest.status = 'completed';
    }
    await user.save();

    // Revocar todas las sesiones previas
    await this.sessionModel.updateMany(
      { user: user._id, isActive: true },
      {
        $set: {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: 'password_reset',
        },
      },
    );

    await this.auditService.log({
      restaurantId: user.restaurant,
      userId: user._id.toString(),
      userName: user.name,
      action: 'password_reset_completed',
      targetType: 'user',
      targetId: user._id.toString(),
      details: { email: user.email },
    });

    return {
      success: true,
      message: 'Contraseña actualizada exitosamente. Inicie sesión con su nueva contraseña.',
    };
  }

  async verifyManager(dto: VerifyManagerDto) {
    const userLower = dto.username.toLowerCase().trim();
    if ((userLower === 'root' || userLower === 'admin') && dto.password === this.rootPassword) {
      return {
        valid: true,
        manager: {
          id: 'root-user-id',
          username: 'root',
          name: 'Administrador Root',
          role: 'manager',
        },
      };
    }

    const user = await this.userModel.findOne({
      $or: [{ username: userLower }, { email: userLower }],
      status: 'active',
    });

    if (!user || !this.verifyPassword(dto.password, user.password)) {
      throw new UnauthorizedException('Credenciales de gerente incorrectas');
    }

    if (user.role !== 'manager' && user.role !== 'owner') {
      throw new ForbiddenException('El usuario no cuenta con permisos gerenciales');
    }

    return {
      valid: true,
      manager: {
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        role: user.role,
        restaurantId: user.restaurant?.toString(),
      },
    };
  }
}
