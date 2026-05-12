import { Controller, Get, Post, Delete, Body, Param, UseGuards, Patch } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailInboxSyncBackgroundService } from './mail-sync.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Mail')
@Controller('mail-inbox')
export class MailController {
  constructor(
    private readonly mailService: MailService,
    private readonly syncService: MailInboxSyncBackgroundService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all mail items' })
  async findAll() {
    return this.mailService.findAll();
  }

  @Get('sync-status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get mail sync status' })
  async getSyncStatus() {
    return this.syncService.getSyncStatus();
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Trigger manual mail sync' })
  async sync() {
    return this.syncService.sync();
  }

  @Post('convert-to-lead')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Convert mail to lead' })
  async convertToLead(@Body() dto: any) {
    return this.mailService.convertToLead(dto.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create mail item' })
  async create(@Body() dto: any) {
      // Placeholder
      return dto;
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update mail item' })
  async update(@Body() dto: any) {
    // Placeholder
    return dto;
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete mail item' })
  async delete(@Body() dto: any) {
    return this.mailService.delete(dto.id);
  }
}
