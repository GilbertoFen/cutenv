import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { User, UserDocument } from '../schemasMongo/user.schema';
import { CreateUserDto, LoginDto, VerifyManagerDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly rootPassword = process.env.ROOT_ADMIN_PASSWORD || 'root';

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

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
    const users = await this.userModel.find().select('-password').sort({ createdAt: -1 });
    return users.map((u) => ({
      id: u._id.toString(),
      username: u.username,
      name: u.name,
      role: u.role,
      status: u.status,
      createdAt: (u as any).createdAt,
    }));
  }

  async createUser(dto: CreateUserDto) {
    const existing = await this.userModel.findOne({ username: dto.username.toLowerCase().trim() });
    if (existing) {
      throw new ConflictException(`El nombre de usuario "${dto.username}" ya está registrado`);
    }

    const hashedPassword = this.hashPassword(dto.password);
    const created = new this.userModel({
      username: dto.username.toLowerCase().trim(),
      name: dto.name.trim(),
      password: hashedPassword,
      role: dto.role,
      status: 'active',
    });

    const saved = await created.save();
    return {
      id: saved._id.toString(),
      username: saved.username,
      name: saved.name,
      role: saved.role,
      status: saved.status,
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

  async login(dto: LoginDto) {
    const userLower = dto.username.toLowerCase().trim();
    if ((userLower === 'root' || userLower === 'admin') && dto.password === 'root') {
      return {
        user: {
          id: 'root-user-id',
          username: 'root',
          name: 'Administrador Root',
          role: 'owner',
        },
      };
    }

    const user = await this.userModel.findOne({
      username: dto.username.toLowerCase().trim(),
      status: 'active',
    });

    if (!user || !this.verifyPassword(dto.password, user.password)) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    if (user.role === 'worker') {
      throw new ForbiddenException(
        'Esta cuenta corresponde al rol de Trabajador Operativo. Debe iniciar sesión en la Estación de Trabajo (/worker/login).'
      );
    }

    return {
      user: {
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        role: user.role, // 'owner' | 'manager'
      },
    };
  }

  async workerLogin(dto: LoginDto) {
    const userLower = dto.username.toLowerCase().trim();
    if ((userLower === 'root' || userLower === 'admin') && dto.password === 'root') {
      throw new ForbiddenException(
        'Las credenciales corresponden al Administrador Root. Para acceder a la Estación de Trabajo debe usar una cuenta con rol Trabajador.'
      );
    }

    const user = await this.userModel.findOne({
      username: userLower,
      status: 'active',
    });

    if (!user || !this.verifyPassword(dto.password, user.password)) {
      throw new UnauthorizedException('Usuario o contraseña de trabajador incorrectos');
    }

    if (user.role !== 'worker') {
      const rolName = user.role === 'owner' ? 'Dueño/Administrador' : 'Gerente';
      throw new ForbiddenException(
        `La cuenta "${user.username}" tiene perfil de ${rolName}, no de Trabajador. Para acceder a las funciones operativas en tablet debe autenticarse con una cuenta de rol Trabajador.`
      );
    }

    return {
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        role: 'worker',
        status: user.status,
      },
      workerToken: `worker-token-${user._id.toString()}-${Date.now()}`,
    };
  }

  async verifyManager(dto: VerifyManagerDto) {
    const userLower = dto.username.toLowerCase().trim();
    if ((userLower === 'root' || userLower === 'admin') && dto.password === 'root') {
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
      username: dto.username.toLowerCase().trim(),
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
      },
    };
  }
}
