import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '../jwt.service';
import { UserSession, UserSessionDocument } from '../../schemasMongo/user-session.schema';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectModel(UserSession.name) private readonly sessionModel: Model<UserSessionDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] || request.headers['Authorization'];

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException('Token de autenticación no proporcionado en la cabecera');
    }

    const [bearer, token] = authHeader.split(' ');
    if (bearer?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Formato de autorización inválido. Debe ser: Bearer <token>');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch (error: any) {
      throw new UnauthorizedException(error.message || 'Token de autenticación inválido o expirado');
    }

    // Validación autoritativa de la sesión en base de datos
    if (payload.sessionId && payload.sessionId !== 'root-session' && Types.ObjectId.isValid(payload.sessionId)) {
      const session = await this.sessionModel.findById(payload.sessionId).lean();
      if (!session || !session.isActive) {
        throw new UnauthorizedException(
          session?.revokedReason
            ? `Acceso revocado: ${session.revokedReason}`
            : 'Su sesión ha sido revocada o ha finalizado.',
        );
      }
    }

    request.user = payload;
    return true;
  }
}
