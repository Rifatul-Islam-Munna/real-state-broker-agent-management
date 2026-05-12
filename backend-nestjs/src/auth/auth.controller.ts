import { Controller, Post, Body, Get, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';

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
      return { success: false, message: 'Invalid email or password' };
    }
    return this.authService.login(user);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() registerDto: any) {
    return this.authService.register(registerDto);
  }

  @Post('refresh-token')
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
    const { passwordHash, refreshToken, refreshTokenExpiry, ...result } = user as any;
    return {
      ...result,
      agentRoutePermissions: user.role === 'Agent' ? (user.hasCustomAgentRoutePermissions ? user.agentRoutePermissions : ['dashboard', 'properties', 'deal-pipeline', 'lead', 'mail', 'settings']) : [],
    };
  }
}
