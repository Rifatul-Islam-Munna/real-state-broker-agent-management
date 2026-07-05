import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { OperationsRecordEntity, OperationsRecordRow } from '../database/entities/record.entity';
import { WorkspaceEntity, WorkspaceRow } from '../database/entities/workspace.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(WorkspaceEntity) private workspaces: Repository<WorkspaceRow>,
    @InjectRepository(OperationsRecordEntity) private records: Repository<OperationsRecordRow>,
  ) {}

  async get(propertyId?: number) {
    const spaces = propertyId
      ? (await this.workspaces.find()).filter((item) => item.propertyId === propertyId)
      : await this.workspaces.find({ where: { propertyId: MoreThan(0) } });
    const ids = new Set(spaces.map((item) => item.id));
    const all = (await this.records.find()).filter((item) => ids.has(item.workspaceId));
    const links = all.filter((item) => item.recordType === 'ShareRequest');
    const submissions = all.filter((item) => item.recordType === 'PublicSubmission');
    const records = all.filter((item) => !['Activity', 'Preferences', 'ShareRequest', 'PublicSubmission'].includes(item.recordType));
    const done = new Set(['Completed', 'Closed', 'Paid', 'Resolved', 'Archived']);
    const byModule: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const item of records) {
      byModule[item.moduleKey] = (byModule[item.moduleKey] ?? 0) + 1;
      byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
    }
    const finance = records.filter((item) => item.moduleKey === 'finance');
    const income = finance.filter((item) => /income|deposit|credit/i.test(item.recordType)).reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
    const expense = finance.filter((item) => /expense|withdrawal|refund/i.test(item.recordType)).reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
    const now = Date.now();
    return {
      importedProperties: spaces.length,
      totalRecords: records.length,
      openRecords: records.filter((item) => !done.has(item.status)).length,
      overdueRecords: records.filter((item) => item.dueAt && item.dueAt.getTime() < now && !done.has(item.status)).length,
      completedRecords: records.filter((item) => done.has(item.status)).length,
      activePublicLinks: links.filter((item) => item.status === 'Active' && new Date(String(item.payload.expiresAt ?? 0)).getTime() > now).length,
      completedPublicLinks: links.filter((item) => item.status === 'Completed').length,
      anonymousSubmissions: submissions.length,
      totalIncome: income,
      totalExpense: expense,
      netOperatingAmount: income - expense,
      occupiedUnits: records.filter((item) => item.moduleKey === 'units' && item.status === 'Active').length,
      availableUnits: records.filter((item) => item.moduleKey === 'units' && ['Open', 'Available'].includes(item.status)).length,
      maintenanceBacklog: records.filter((item) => ['tickets', 'work-orders'].includes(item.moduleKey) && !done.has(item.status)).length,
      pendingQuotes: records.filter((item) => item.moduleKey === 'vendor-quotes' && !['Approved', 'Rejected', 'Expired'].includes(item.status)).length,
      recordsByModule: byModule,
      recordsByStatus: byStatus,
    };
  }
}
