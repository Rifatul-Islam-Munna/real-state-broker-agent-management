import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../users/enums/user-role.enum';
import {
  PlatformChatbotKnowledgeService,
} from './platform-chatbot-knowledge.service';
import type {
  PlatformKnowledgeInput,
} from './platform-chatbot-knowledge.service';

@Controller('super-admin-management/chatbot-knowledge')
@UseGuards(JwtAuthGuard)
export class PlatformChatbotKnowledgeController {
  constructor(private readonly knowledge: PlatformChatbotKnowledgeService) {}

  @Get()
  list(@Request() request: any) {
    this.adminId(request);
    return this.knowledge.list();
  }
  @Post()
  create(@Request() request: any, @Body() body: PlatformKnowledgeInput) {
    return this.knowledge.create(body, this.adminId(request));
  }

  @Patch(':id')
  update(
    @Request() request: any,
    @Param('id') id: string,
    @Body() body: Partial<PlatformKnowledgeInput>,
  ) {
    return this.knowledge.update(id, body, this.adminId(request));
  }

  @Delete(':id')
  delete(@Request() request: any, @Param('id') id: string) {
    return this.knowledge.delete(id, this.adminId(request));
  }

  @Post('reindex')
  reindex(@Request() request: any) {
    return this.knowledge.reindex(this.adminId(request));
  }

  private adminId(request: any) {
    if (request.user?.role !== UserRole.Admin) {
      throw new ForbiddenException('Superadmin access is required.');
    }
    return Number(request.user?.userId ?? request.user?.id) || null;
  }
}
