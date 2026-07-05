import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/admin.guard';
import { ExternalAdminService } from '../../core/external-admin.service';
import { CreatePublicAccessDto } from '../dto/public-access.dto';

@UseGuards(AdminGuard)
@Controller('property-operations')
export class ExternalAdminController {
  constructor(private readonly external: ExternalAdminService) {}

  @Post('public-access')
  create(@Body() dto: CreatePublicAccessDto) { return this.external.create(dto); }

  @Get('public-access')
  list(@Query('propertyId') propertyId?: string) { return this.external.list(propertyId ? Number(propertyId) : undefined); }

  @Patch('public-access/revoke')
  revoke(@Query('id') id: string) { return this.external.revoke(id); }

  @Get('public-submissions')
  submissions(@Query('accessId') accessId: string) { return this.external.responses(accessId); }
}
