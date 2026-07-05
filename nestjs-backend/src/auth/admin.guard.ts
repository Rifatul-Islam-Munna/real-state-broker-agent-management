import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService, private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const adminKey = this.config.get<string>('PROPERTY_OPERATIONS_ADMIN_KEY');
    if (adminKey && request.header('x-admin-key') === adminKey) return true;

    const bearer = request.header('authorization')?.replace(/^Bearer\s+/i, '');
    const token = request.header('access_token') ?? bearer;
    if (!token) throw new UnauthorizedException('Administrator authentication is required.');

    try {
      const payload = this.jwt.verify<Record<string, unknown>>(token);
      const role = String(payload.role ?? payload.Role ?? '');
      if (role.toLowerCase() !== 'admin') throw new Error('not admin');
      return true;
    } catch {
      throw new UnauthorizedException('Administrator authentication is invalid or expired.');
    }
  }
}
