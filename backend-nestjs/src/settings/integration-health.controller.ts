import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IntegrationHealthService } from './integration-health.service';

@Controller('settings/integrations/health')
@UseGuards(JwtAuthGuard)
export class IntegrationHealthController {
  constructor(private readonly health: IntegrationHealthService) {}

  @Post()
  run() {
    return this.health.testAll();
  }
}
