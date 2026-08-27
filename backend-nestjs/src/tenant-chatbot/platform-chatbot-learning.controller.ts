import { BadRequestException, Body, Controller, ForbiddenException, Get, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../users/enums/user-role.enum';
import { PlatformChatbotLearningService } from './platform-chatbot-learning.service';

@Controller('super-admin-management/chatbot-learning')
@UseGuards(JwtAuthGuard)
export class PlatformChatbotLearningController {
  constructor(private readonly learning: PlatformChatbotLearningService) {}

  @Get()
  list(@Request() request: any, @Query() query: any) {
    this.adminId(request);
    return this.learning.list({
      status: query?.status,
      kind: query?.kind,
      tenantId: Number(query?.tenantId) || undefined,
      page: Number(query?.page) || undefined,
      pageSize: Number(query?.pageSize) || undefined,
    });
  }

  @Patch('review')
  review(@Request() request: any, @Body() body: any) {
    const status = body?.status === 'APPROVED' ? 'APPROVED' : body?.status === 'REJECTED' ? 'REJECTED' : null;
    if (!status) throw new BadRequestException('Review status must be APPROVED or REJECTED.');
    return this.learning.review(Array.isArray(body?.ids) ? body.ids : [], status, this.adminId(request));
  }

  @Get('export')
  export(@Request() request: any) {
    this.adminId(request);
    return this.learning.exportApproved();
  }

  @Post('import')
  import(@Request() request: any, @Body() body: unknown) {
    return this.learning.importApproved(body, this.adminId(request));
  }

  private adminId(request: any) {
    if (request.user?.role !== UserRole.Admin) throw new ForbiddenException('Superadmin access is required.');
    return Number(request.user?.userId ?? request.user?.id) || 0;
  }
}
