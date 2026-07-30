import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RealtorShowingsService } from './realtor-showings.service';

@ApiTags('Realtor Showings')
@Controller('realtor-showings')
@UseGuards(JwtAuthGuard)
export class RealtorShowingsController {
  constructor(private readonly realtorShowingsService: RealtorShowingsService) {}

  @Get()
  @ApiOperation({ summary: 'List imported realtor showings' })
  findAll(@Query('search') search?: string, @Query('page') page = 1, @Query('pageSize') pageSize = 25) {
    return this.realtorShowingsService.findAll(search, Number(page), Number(pageSize));
  }

  @Get('sequences/summary')
  @ApiOperation({ summary: 'Get live realtor showing sequence metrics and optimization insights' })
  getSequenceSummary(@Query('search') search?: string) {
    return this.realtorShowingsService.getSequenceSummary(search);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import realtor showings from mapped CSV rows' })
  importRows(@Body() payload: any) {
    return this.realtorShowingsService.importRows(
      this.validateAutomation(payload),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create one realtor showing manually' })
  createManual(@Body() payload: any) {
    return this.realtorShowingsService.createManual(
      this.validateAutomation(payload),
    );
  }

  @Patch(':id/sequence')
  updateSequence(@Param('id') id: string, @Body('status') status: 'active' | 'paused' | 'cancelled') {
    if (!['active', 'paused', 'cancelled'].includes(status)) throw new BadRequestException('Invalid sequence status.');
    return this.realtorShowingsService.updateSequence(Number(id), status);
  }

  @Post(':id/send-message')
  @ApiOperation({ summary: 'Manually send the first showing message' })
  sendFirstMessage(@Param('id') id: string) {
    return this.realtorShowingsService.sendManualFirstMessage(Number(id));
  }

  @Patch('property')
  @ApiOperation({ summary: 'Manually match a realtor showing to a property' })
  updateProperty(@Body() payload: { id: number; propertyId?: number | null }) {
    return this.realtorShowingsService.updateProperty(
      Number(payload.id),
      payload.propertyId ? Number(payload.propertyId) : null,
    );
  }

  @Patch('automation')
  @ApiOperation({ summary: 'Update and reschedule outreach for one realtor showing' })
  updateAutomation(@Body() payload: any) {
    const normalized = this.validateAutomation(payload);
    return this.realtorShowingsService.updateAutomation(
      Number(normalized.id),
      normalized,
    );
  }

  private validateAutomation(payload: any) {
    const followUpEnabled = payload?.followUpEnabled === true;
    const followUpTemplateId = `${payload?.followUpTemplateId ?? ''}`.trim();
    const followUpGapDays = Math.max(
      0,
      Number(payload?.followUpGapDays ?? 0) || 0,
    );

    if (followUpEnabled && !followUpTemplateId) {
      throw new BadRequestException(
        'Choose a follow-up template or disable follow-up.',
      );
    }
    if (followUpEnabled && followUpGapDays < 1) {
      throw new BadRequestException(
        'Follow-up gap must be at least one day.',
      );
    }

    return {
      ...payload,
      followUpEnabled,
      followUpTemplateId,
      followUpGapDays,
    };
  }
}
