import { Body, Controller, NotFoundException, Post, Request } from '@nestjs/common';
import { TenantChatbotService } from './tenant-chatbot.service';
import type { PublicChatbotMessageInput } from './tenant-chatbot.service';

@Controller('tenant-public/chatbot')
export class TenantChatbotPublicController {
  constructor(private readonly chatbot: TenantChatbotService) {}

  @Post('messages')
  async message(@Request() request: any, @Body() body: PublicChatbotMessageInput) {
    if (!request.tenant?.databaseName) {
      throw new NotFoundException('Tenant hostname is required');
    }
    return this.chatbot.handlePublicMessage(request.tenant, {
      accessToken: body.accessToken,
      sessionId: body.sessionId,
      idempotencyKey: body.idempotencyKey,
      body: body.body,
      showing: body.showing,
    });
  }
}
