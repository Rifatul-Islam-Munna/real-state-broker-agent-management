import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AssistantService } from '../../core/assistant.service';

@Injectable()
export class AutomationService {
  constructor(private readonly assistant: AssistantService) {}

  @Cron(CronExpression.EVERY_HOUR)
  runHourly() {
    return this.assistant.runAutomation();
  }
}
