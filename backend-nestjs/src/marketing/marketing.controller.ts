import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { MarketingService } from './marketing.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Marketing')
@Controller('marketing-settings')
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Fetch marketing settings' })
  async getSettings() {
    return this.marketingService.getSettings();
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update marketing settings' })
  async updateSettings(@Body() dto: any) {
    return this.marketingService.updateSettings(dto);
  }
}
