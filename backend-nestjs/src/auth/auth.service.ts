import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(`${email ?? ''}`);
    if (user && !user.isActive) {
      throw new BadRequestException('Account is deactivated');
    }
    if (user && (await bcrypt.compare(`${pass ?? ''}`, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: User) {
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: `${user.firstName} ${user.lastName}`,
    };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = crypto.randomBytes(64).toString('base64');
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 10);

    await this.usersService.update(user.id, {
      refreshToken,
      refreshTokenExpiry,
      lastLoginAt: new Date(),
    });

    return {
      id: user.id,
      fullName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
      accessToken,
      refreshToken,
      accessTokenExpiry: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    };
  }

  async register(registerDto: any) {
    const email = `${registerDto.email ?? ''}`.toLowerCase().trim();
    const phone = `${registerDto.phone ?? ''}`.trim() || null;
    const password = `${registerDto.password ?? ''}`;

    if (await this.usersService.existsByEmail(email)) {
      throw new BadRequestException('Email already exists');
    }
    if (phone && await this.usersService.existsByPhone(phone)) {
      throw new BadRequestException('Phone already exists');
    }

    const user = await this.usersService.create({
      firstName: `${registerDto.firstName ?? ''}`.trim(),
      lastName: `${registerDto.lastName ?? ''}`.trim(),
      email,
      phone,
      role: registerDto.role,
      isActive: true,
      passwordHash: await bcrypt.hash(password, 10),
    });

    return this.login(user);
  }

  async refresh(refreshToken: string) {
    const user = await this.usersService.findOneByRefreshToken(`${refreshToken ?? ''}`);
    if (
      !user ||
      !user.isActive ||
      !user.refreshTokenExpiry ||
      user.refreshTokenExpiry < new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    return this.login(user);
  }
}
