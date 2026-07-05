import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { PublicStatusService } from '../services/public-status.service';

@Controller('property-operations/public/:token/status')
export class PublicStatusController {
  constructor(private readonly status: PublicStatusService) {}

  @Get()
  get(@Param('token') token: string) {
    return this.status.get(token);
  }

  @Patch()
  update(
    @Param('token') token: string,
    @Body() dto: { status?: string; comment?: string; attachmentUrls?: string[] },
  ) {
    return this.status.update(token, dto);
  }
}
