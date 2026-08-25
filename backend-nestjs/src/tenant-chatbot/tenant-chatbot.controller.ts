import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRoleGuard } from '../security/tenant-role.guard';
import { AuthenticatedTenantGuard } from '../tenant-dashboard/authenticated-tenant.guard';
import { TenantPlanPermissionGuard } from '../tenant-dashboard/tenant-plan-permission.guard';
import { TenantPlanPermissions } from '../tenant-dashboard/tenant-plan-permissions.decorator';
import { TenantStaffPermissionGuard } from '../tenant-dashboard/tenant-staff-permission.guard';
import { TenantChatbotService } from './tenant-chatbot.service';
import type {
  ChatbotSettingsPatch,
  CreateTenantKnowledgeInput,
  TestChatbotQuestionInput,
  UpdateTenantKnowledgeInput,
} from './tenant-chatbot.service';

@Controller('tenant-chatbot')
@UseGuards(
  JwtAuthGuard,
  AuthenticatedTenantGuard,
  TenantStaffPermissionGuard,
  TenantPlanPermissionGuard,
  TenantRoleGuard,
)
@TenantPlanPermissions('normal-dashboard', 'property-management-dashboard')
export class TenantChatbotController {
  constructor(private readonly chatbot: TenantChatbotService) {}

  @Get('settings')
  settings(@Req() request: any) {
    return this.chatbot.getSettings(request.tenant);
  }

  @Post('settings')
  updateSettings(
    @Req() request: any,
    @Body() body: ChatbotSettingsPatch,
  ) {
    return this.chatbot.updateSettings(
      request.tenant,
      body,
      request.user?.userId ?? request.user?.id,
    );
  }

  @Get('knowledge')
  knowledge(@Req() request: any) {
    return this.chatbot.listKnowledge(request.tenant);
  }

  @Post('knowledge')
  createKnowledge(
    @Req() request: any,
    @Body() body: CreateTenantKnowledgeInput,
  ) {
    return this.chatbot.createKnowledge(
      request.tenant,
      body,
      request.user?.userId ?? request.user?.id,
    );
  }

  @Patch('knowledge/:id')
  updateKnowledge(
    @Req() request: any,
    @Param('id') id: string,
    @Body() body: UpdateTenantKnowledgeInput,
  ) {
    return this.chatbot.updateKnowledge(
      request.tenant,
      Number(id),
      body,
      request.user?.userId ?? request.user?.id,
    );
  }

  @Delete('knowledge/:id')
  deleteKnowledge(@Req() request: any, @Param('id') id: string) {
    return this.chatbot.deleteKnowledge(
      request.tenant,
      Number(id),
      request.user?.userId ?? request.user?.id,
    );
  }

  @Post('reindex')
  reindex(@Req() request: any) {
    return this.chatbot.reindexKnowledge(request.tenant);
  }

  @Post('test')
  test(@Req() request: any, @Body() body: TestChatbotQuestionInput) {
    return this.chatbot.testQuestion(request.tenant, body);
  }

  @Get('leads/:leadId/activity')
  activity(@Req() request: any, @Param('leadId') leadId: string) {
    return this.chatbot.listLeadActivity(request.tenant, Number(leadId));
  }

  @Post('leads/:leadId/stop')
  stop(@Req() request: any, @Param('leadId') leadId: string) {
    return this.chatbot.stopLead(
      request.tenant,
      Number(leadId),
      request.user?.userId ?? request.user?.id,
    );
  }

  @Post('leads/:leadId/resume')
  resume(@Req() request: any, @Param('leadId') leadId: string) {
    return this.chatbot.resumeLead(
      request.tenant,
      Number(leadId),
      request.user?.userId ?? request.user?.id,
    );
  }
}
