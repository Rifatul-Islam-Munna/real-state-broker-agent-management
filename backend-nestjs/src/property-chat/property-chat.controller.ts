import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { PropertyChatService } from './property-chat.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('PropertyChat')
@Controller('property-chats')
export class PropertyChatController {
  constructor(private readonly chatService: PropertyChatService) {}

  @Post()
  @ApiOperation({ summary: 'Create a property chat conversation' })
  async create(@Body() dto: any) {
    return this.chatService.createConversation(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get property chat conversations' })
  async find(
    @Query('id') id?: number,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('search') search?: string,
    @Query('propertyId') propertyId?: number,
    @Query('leadId') leadId?: number,
  ) {
    if (id) return this.chatService.getConversation(id);
    return this.chatService.getConversations(page, pageSize, search, propertyId, leadId);
  }
}
