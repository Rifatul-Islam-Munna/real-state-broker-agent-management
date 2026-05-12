import { Controller, Get, Post, Delete, Body, Query, UseGuards, Patch } from '@nestjs/common';
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
  @ApiOperation({ summary: 'Get mail items' })
  async find(
    @Query('id') id?: number,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    if (id) return this.mailService.findOne(id);
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
    return this.mailService.convertToLead(dto.mailInboxId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create mail item' })
  async create(@Body() dto: any) {
      return this.mailService.create(dto);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update mail item' })
  async update(@Body() dto: any) {
    return this.mailService.update(dto.id, dto);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete mail item' })
  async delete(@Query('id') id: number) {
    return this.mailService.delete(id);
  }
}
