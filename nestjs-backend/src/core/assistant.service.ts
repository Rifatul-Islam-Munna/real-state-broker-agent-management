import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperationsRecordEntity, OperationsRecordRow } from '../database/entities/record.entity';
import { ActivityLogService } from './activity-log.service';
import { AnalyticsService } from './analytics.service';
import { RecordService } from './record.service';

@Injectable()
export class AssistantService {
  constructor(
    @InjectRepository(OperationsRecordEntity) private records: Repository<OperationsRecordRow>,
    private analyticsService: AnalyticsService,
    private recordService: RecordService,
    private activity: ActivityLogService,
  ) {}

  async summary(propertyId?: number) {
    const analytics = await this.analyticsService.get(propertyId);
    const items = (await this.records.find()).filter((item) => !['Completed', 'Closed', 'Paid', 'Resolved', 'Archived'].includes(item.status));
    const urgentItems = items
      .filter((item) => item.priority === 'Urgent' || (item.dueAt && item.dueAt < new Date()))
      .sort((a, b) => (a.dueAt?.getTime() ?? 9e15) - (b.dueAt?.getTime() ?? 9e15))
      .slice(0, 10)
      .map((item) => this.recordService.map(item));
    const recommendations: string[] = [];
    if (analytics.overdueRecords) recommendations.push(`Review ${analytics.overdueRecords} overdue operational items.`);
    if (analytics.maintenanceBacklog) recommendations.push(`Prioritize ${analytics.maintenanceBacklog} open tickets and work orders.`);
    if (analytics.pendingQuotes) recommendations.push(`Compare and decide on ${analytics.pendingQuotes} pending vendor quotes.`);
    if (analytics.totalExpense > analytics.totalIncome) recommendations.push('Expenses exceed recorded income; review the financial ledger.');
    if (!recommendations.length) recommendations.push('No immediate operational risks were detected.');
    return { generatedAt: new Date(), summary: `${analytics.importedProperties} properties, ${analytics.openRecords} open records, and ${analytics.overdueRecords} overdue.`, recommendations, urgentItems, analytics };
  }

  async runAutomation() {
    const items = await this.records.find();
    const now = new Date();
    const overdue = items.filter((item) => item.dueAt && item.dueAt < now && !['Overdue', 'Completed', 'Closed', 'Paid', 'Resolved', 'Cancelled', 'Archived'].includes(item.status));
    for (const item of overdue) item.status = 'Overdue';
    if (overdue.length) await this.records.save(overdue);
    const generated = await this.recordService.generateRecurring();
    await this.activity.add({ moduleKey: 'notifications', action: 'automation-run', entityType: 'Automation', summary: `Automation marked ${overdue.length} records overdue and generated ${generated.length} work orders.` });
    return { overdue: overdue.length, generated: generated.length };
  }
}
