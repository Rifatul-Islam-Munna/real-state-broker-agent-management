import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { OperationsRecord, OperationsRecordDocument } from '../schemas/operations.schema';
import { ActivityService } from './activity.service';
import { RecordService } from './record.service';

@Injectable()
export class AutomationService {
  constructor(
    @InjectModel(OperationsRecord.name) private readonly records: Model<OperationsRecordDocument>,
    private readonly recordService: RecordService,
    private readonly activity: ActivityService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async runHourly() {
    const result = await this.records.updateMany(
      {
        dueAt: { $lt: new Date() },
        status: { $nin: ['Overdue', 'Completed', 'Closed', 'Paid', 'Resolved', 'Cancelled', 'Archived'] },
      },
      { $set: { status: 'Overdue' } },
    );
    const generated = await this.recordService.generateRecurring();
    if (result.modifiedCount || generated.length) {
      await this.activity.add({
        moduleKey: 'notifications',
        action: 'automation-run',
        entityType: 'Automation',
        summary: `Automation marked ${result.modifiedCount} records overdue and generated ${generated.length} work orders.`,
        metadata: { overdue: result.modifiedCount, generated: generated.length },
      });
    }
    return { overdue: result.modifiedCount, generated: generated.length };
  }
}
