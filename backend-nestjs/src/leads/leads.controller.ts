import { BadRequestException, Controller, Get, Post, Patch, Delete, Body, Query, UseGuards, HttpCode, Req } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SchedulingSettingsService } from '../settings/scheduling-settings.service';
import { parseDateTimeInZone } from '../common/time-zone';

@ApiTags('Leads')
@Controller('leads')
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly schedulingSettingsService: SchedulingSettingsService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get leads' })
  async find(@Query('id') id?: number, @Query('page') page: number = 1, @Query('pageSize') pageSize: number = 20, @Query('search') search?: string, @Query('stage') stage?: string, @Query('date') date?: string) {
    if (id) return this.leadsService.findOne(id);
    return this.leadsService.findAll(page, pageSize, search, stage, date);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create lead' })
  async create(@Body() createDto: any, @Req() req: any) {
    return this.leadsService.create(await this.normalizeNextAction(createDto), req.user?.email ?? 'CRM');
  }

  @Post('import')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Import mapped leads from CSV rows' })
  async importRows(@Body() payload: any, @Req() req: any) {
    return this.leadsService.importRows(payload, req.user?.email ?? 'CRM');
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update lead' })
  async update(@Body() updateDto: any, @Req() req: any) {
    const dto = await this.normalizeNextAction(updateDto);
    return this.leadsService.update(dto.id, dto, req.user?.email ?? 'CRM');
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete lead' })
  async delete(@Query('id') id: number) {
    await this.leadsService.delete(id);
  }

  private async normalizeNextAction(dto: any) {
    if (!dto || dto.nextActionDate === undefined) return dto;
    if (!dto.nextActionDate) return { ...dto, nextActionDate: null };
    const zone = await this.schedulingSettingsService.getTimeZone();
    const date = parseDateTimeInZone(dto.nextActionDate, zone);
    if (!date) throw new BadRequestException('Next action date and time are invalid.');
    return { ...dto, nextActionDate: date.toISOString() };
  }
}
