import { Controller, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/admin.guard';
import { AutomationService } from '../services/automation.service';
import { DeliveryService } from '../services/delivery.service';

@UseGuards(AdminGuard)
@Controller('property-operations/jobs')
export class JobsController {
  constructor(private readonly automation: AutomationService, private readonly delivery: DeliveryService) {}

  @Post('run')
  run() {
    return this.automation.runHourly();
  }

  @Post('deliver/:id')
  deliver(@Param('id') id: string, @Query('channel') channel = 'email') {
    return this.delivery.send(id, channel);
  }
}
