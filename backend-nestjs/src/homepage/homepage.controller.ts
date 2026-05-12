import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { HomepageService } from './homepage.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Homepage')
@Controller()
export class HomepageController {
  constructor(private readonly homepageService: HomepageService) {}

  @Get('homepage-settings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Fetch the editable homepage settings for admin' })
  async getAdminSettings() {
    return this.homepageService.getAdminSettings();
  }

  @Patch('homepage-settings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update the editable homepage settings' })
  async updateSettings(@Body() dto: any) {
    return this.homepageService.updateSettings(dto);
  }

  @Get('public/homepage-settings')
  @ApiOperation({ summary: 'Fetch the public homepage settings' })
  async getPublicSettings() {
    return this.homepageService.getPublicSettings();
  }
}
