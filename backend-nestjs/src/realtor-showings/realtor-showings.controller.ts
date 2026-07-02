import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
  findAll(@Query('search') search?: string) {
    return this.realtorShowingsService.findAll(search);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import realtor showings from mapped CSV rows' })
  importRows(@Body() payload: any) {
    return this.realtorShowingsService.importRows(payload);
  }

  @Post()
  @ApiOperation({ summary: 'Create one realtor showing manually' })
  createManual(@Body() payload: any) {
    return this.realtorShowingsService.createManual(payload);
  }

  @Patch('property')
  @ApiOperation({ summary: 'Manually match a realtor showing to a property' })
  updateProperty(@Body() payload: { id: number; propertyId?: number | null }) {
    return this.realtorShowingsService.updateProperty(Number(payload.id), payload.propertyId ? Number(payload.propertyId) : null);
  }

  @Patch('automation')
  @ApiOperation({ summary: 'Update and reschedule outreach for one realtor showing' })
  updateAutomation(@Body() payload: any) {
    return this.realtorShowingsService.updateAutomation(Number(payload.id), payload);
  }
}
