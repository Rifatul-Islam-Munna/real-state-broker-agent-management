import { BadRequestException, Controller, Post, Body, Get, UseGuards, Request, NotFoundException, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/enums/user-role.enum';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Login' })
  async login(@Body() loginDto: any) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new BadRequestException('Invalid email or password');
    }
    return this.authService.login(user);
  }

  @Post('super-admin/login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login to the separate Super Admin portal' })
  async superAdminLogin(@Body() loginDto: any) {
    const user = await this.authService.validateSuperAdmin(loginDto.email, loginDto.password);
    if (!user) {
      throw new BadRequestException('Invalid Super Admin email or password');
    }
    return this.authService.login(user);
  }

  @Post('register')
  @HttpCode(201)
  @ApiOperation({ summary: 'Register a new agent account' })
  async register(@Body() registerDto: any) {
    const firstName = `${registerDto.firstName ?? ''}`.trim();
    const lastName = `${registerDto.lastName ?? ''}`.trim();
    const email = `${registerDto.email ?? ''}`.trim();
    const password = `${registerDto.password ?? ''}`;
    const phone = `${registerDto.phone ?? ''}`.trim() || null;

    if (!firstName) throw new BadRequestException('First name is required');
    if (!lastName) throw new BadRequestException('Last name is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Enter a valid email address');
    }
    if (password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    return this.authService.register({
      firstName,
      lastName,
      email,
      password,
      phone,
      role: UserRole.Agent,
    });
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.usersService.mapUser(user);
  }
}
