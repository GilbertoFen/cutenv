import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

export interface JwtPayload {
  sub: string;
  username: string;
  name: string;
  role: 'owner' | 'manager' | 'worker';
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtService {
  private readonly secret: string;
  private readonly expiresInSeconds: number = 8 * 60 * 60; // 8 horas por turno

  constructor() {
    this.secret = process.env.JWT_SECRET || 'pos_jwt_secret_key_restaurant_2026_local_first_secure';
  }

  sign(payload: Omit<JwtPayload, 'iat' | 'exp'>, customExpiresInSeconds?: number): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (customExpiresInSeconds || this.expiresInSeconds);

    const fullPayload: JwtPayload = {
      ...payload,
      iat: now,
      exp,
    };

    const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const dataToSign = `${header}.${payloadB64}`;
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(dataToSign)
      .digest('base64url');

    return `${dataToSign}.${signature}`;
  }

  verify(token: string): JwtPayload {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Token no proporcionado');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Formato de token inválido');
    }

    const [headerB64, payloadB64, signature] = parts;
    const dataToVerify = `${headerB64}.${payloadB64}`;

    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(dataToVerify)
      .digest('base64url');

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      throw new UnauthorizedException('Firma de token no válida o token alterado');
    }

    let payload: JwtPayload;
    try {
      const decodedJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
      payload = JSON.parse(decodedJson);
    } catch {
      throw new UnauthorizedException('Contenido de token corrupto');
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new UnauthorizedException('El token de sesión ha expirado');
    }

    if (!payload.sub || !payload.role || !payload.username) {
      throw new UnauthorizedException('El token no contiene los reclamos de identidad requeridos');
    }

    return payload;
  }
}
