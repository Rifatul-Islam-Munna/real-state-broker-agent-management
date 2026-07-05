import { Controller, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/admin.guard';
import { AssistantService } from '../../core/assistant.service';
import { DeliveryService } from '../../shared/delivery.service';

@UseGuards(AdminGuard)
@Controller('property-operations/jobs')
export class JobsController {
  constructor(private readonly assistant: AssistantService, private readonly delivery: DeliveryService) {}

  @Post('run')
  run() { return this.assistant.runAutomation(); }

  @Post('deliver/:id')
  deliver(@Param('id') id: string, @Query('channel') channel = 'email') {
    return this.delivery.send(id, channel);
  }
}
