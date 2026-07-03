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

  @Post('register')
  @HttpCode(201)
  @ApiOperation({ summary: 'Register a new agent account' })
  async register(@Body() registerDto: any) {
    return this.authService.register({
      firstName: `${registerDto.firstName ?? ''}`.trim(),
      lastName: `${registerDto.lastName ?? ''}`.trim(),
      email: `${registerDto.email ?? ''}`.trim(),
      password: `${registerDto.password ?? ''}`,
      phone: `${registerDto.phone ?? ''}`.trim(),
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
