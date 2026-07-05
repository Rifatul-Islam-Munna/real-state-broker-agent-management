import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService, private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const bearer = request.header('authorization')?.replace(/^Bearer\s+/i, '');
    const token = request.header('access_token') ?? bearer;
    const secret = this.config.get<string>('Jwt__AccessTokenSecret')
      ?? this.config.get<string>('JWT_ACCESS_TOKEN_SECRET')
      ?? this.config.get<string>('ACCESS_TOKEN');

    if (!token || !secret) throw new UnauthorizedException('Administrator authentication is required.');

    try {
      const payload = this.jwt.verify<Record<string, unknown>>(token, { secret });
      const claim = payload.role
        ?? payload.Role
        ?? payload.roles
        ?? payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      const roles = Array.isArray(claim) ? claim.map(String) : String(claim ?? '').split(',');
      if (!roles.some((role) => role.trim().toLowerCase() === 'admin')) throw new Error('not admin');
      return true;
    } catch {
      throw new UnauthorizedException('Administrator authentication is invalid or expired.');
    }
  }
}
