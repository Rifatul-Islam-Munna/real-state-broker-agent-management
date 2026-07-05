import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SubmitPublicRequestDto } from '../dto/public-access.dto';
import { PublicAccessService } from '../services/public-access.service';

@Controller('property-operations/public')
export class PublicController {
  constructor(private readonly publicAccess: PublicAccessService) {}

  @Get(':token')
  getRequest(@Param('token') token: string) {
    return this.publicAccess.getPublic(token);
  }

  @Post(':token')
  submit(@Param('token') token: string, @Body() dto: SubmitPublicRequestDto) {
    return this.publicAccess.submit(token, dto);
  }
}
