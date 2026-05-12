import { Controller, Post, UseGuards } from '@nestjs/common';
import { SystemService } from './system.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('System')
@Controller('dev/database')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Post('migrate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Run database migrations' })
  async migrate() {
    return this.systemService.migrate();
  }
}
