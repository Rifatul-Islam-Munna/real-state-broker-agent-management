import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/admin.guard';
import { CreatePublicAccessDto } from '../dto/public-access.dto';
import { PublicAccessService } from '../services/public-access.service';

@UseGuards(AdminGuard)
@Controller('property-operations')
export class PublicAdminController {
  constructor(private readonly publicAccess: PublicAccessService) {}

  @Post('public-access')
  create(@Body() dto: CreatePublicAccessDto) {
    return this.publicAccess.create(dto);
  }

  @Get('public-access')
  list(@Query('propertyId') propertyId?: string) {
    return this.publicAccess.list(propertyId ? Number(propertyId) : undefined);
  }

  @Patch('public-access/revoke')
  revoke(@Query('id') id: string) {
    return this.publicAccess.revoke(id);
  }

  @Get('public-submissions')
  submissions(@Query('accessId') accessId: string) {
    return this.publicAccess.listSubmissions(accessId);
  }
}
