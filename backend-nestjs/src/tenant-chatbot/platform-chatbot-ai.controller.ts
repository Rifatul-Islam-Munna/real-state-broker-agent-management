import { Body, Controller, ForbiddenException, Get, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { PlatformChatbotAiService } from './platform-chatbot-ai.service';

@Controller('super-admin-management/chatbot-ai')
@UseGuards(JwtAuthGuard)
export class PlatformChatbotAiController {
  constructor(private readonly ai: PlatformChatbotAiService) {}

  @Get()
  settings(@Request() request: any) {
    this.adminId(request);
    return this.ai.getSettings();
  }

  @Patch()
  update(@Request() request: any, @Body() body: unknown) {
    return this.ai.updateSettings(body, this.adminId(request));
  }

  @Post('test')
  test(@Request() request: any) {
    this.adminId(request);
    return this.ai.testConnection();
  }

  private adminId(request: any) {
    if (request.user?.role !== UserRole.Admin) throw new ForbiddenException('Superadmin access is required.');
    return Number(request.user?.userId ?? request.user?.id) || 0;
  }
}
