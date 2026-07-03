import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) => request?.headers?.access_token as string,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-super-secret-key-min-32-chars!!',
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findById(Number(payload.sub));

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Account is inactive or no longer available.');
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      agentRoutePermissions: this.usersService.effectivePermissionsForAuth(user),
    };
  }
}
