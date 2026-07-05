import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OperationsRecord, OperationsRecordDocument, OperationsWorkspace, OperationsWorkspaceDocument } from '../schemas/operations.schema';
import { PublicAccess, PublicAccessDocument, PublicSubmission, PublicSubmissionDocument } from '../schemas/public-access.schema';

@Injectable()
export class InsightsService {
  constructor(
    @InjectModel(OperationsWorkspace.name) private readonly workspaces: Model<OperationsWorkspaceDocument>,
    @InjectModel(OperationsRecord.name) private readonly records: Model<OperationsRecordDocument>,
    @InjectModel(PublicAccess.name) private readonly links: Model<PublicAccessDocument>,
    @InjectModel(PublicSubmission.name) private readonly submissions: Model<PublicSubmissionDocument>,
  ) {}

  async analytics(propertyId?: number) {
    const workspaceIds = propertyId
      ? (await this.workspaces.find({ propertyId }).select('_id').lean()).map((item) => item._id)
      : (await this.workspaces.find().select('_id').lean()).map((item) => item._id);
    const [records, links, submissions] = await Promise.all([
      this.records.find({ workspaceId: { $in: workspaceIds } }).lean(),
      this.links.find({ workspaceId: { $in: workspaceIds } }).lean(),
      this.submissions.countDocuments({ publicAccessId: { $in: await this.links.find({ workspaceId: { $in: workspaceIds } }).distinct('_id') } }),
    ]);
    const now = Date.now();
    const done = new Set(['Completed', 'Closed', 'Paid', 'Resolved', 'Archived']);
    const byModule: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const item of records) {
      byModule[item.moduleKey] = (byModule[item.moduleKey] ?? 0) + 1;
      byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
    }
    const finance = records.filter((item) => item.moduleKey === 'finance');
    const income = finance.filter((item) => /income|deposit|credit/i.test(item.recordType)).reduce((sum, item) => sum + (item.amount ?? 0), 0);
    const expense = finance.filter((item) => /expense|withdrawal|refund/i.test(item.recordType)).reduce((sum, item) => sum + (item.amount ?? 0), 0);
    return {
      importedProperties: workspaceIds.length,
      totalRecords: records.length,
      openRecords: records.filter((item) => !done.has(item.status)).length,
      overdueRecords: records.filter((item) => item.dueAt && item.dueAt.getTime() < now && !done.has(item.status)).length,
      completedRecords: records.filter((item) => done.has(item.status)).length,
      activePublicLinks: links.filter((item) => item.status === 'Active' && item.expiresAt.getTime() > now).length,
      completedPublicLinks: links.filter((item) => item.status === 'Completed').length,
      anonymousSubmissions: submissions,
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

  async assistant(propertyId?: number) {
    const analytics = await this.analytics(propertyId);
    const workspaceIds = propertyId
      ? (await this.workspaces.find({ propertyId }).select('_id').lean()).map((item) => item._id)
      : (await this.workspaces.find().select('_id').lean()).map((item) => item._id);
    const urgent = await this.records.find({
      workspaceId: { $in: workspaceIds },
      status: { $nin: ['Completed', 'Closed', 'Paid', 'Resolved', 'Archived'] },
      $or: [{ priority: 'Urgent' }, { dueAt: { $lt: new Date() } }],
    }).sort({ priority: -1, dueAt: 1 }).limit(10).lean();
    const recommendations: string[] = [];
    if (analytics.overdueRecords) recommendations.push(`Review ${analytics.overdueRecords} overdue operational items.`);
    if (analytics.maintenanceBacklog) recommendations.push(`Prioritize ${analytics.maintenanceBacklog} open tickets and work orders.`);
    if (analytics.pendingQuotes) recommendations.push(`Compare and decide on ${analytics.pendingQuotes} pending vendor quotes.`);
    if (analytics.totalExpense > analytics.totalIncome) recommendations.push('Expenses currently exceed recorded income; review the financial ledger.');
    if (!recommendations.length) recommendations.push('No immediate operational risks were detected from current records.');
    return {
      generatedAt: new Date(),
      summary: `${analytics.importedProperties} properties, ${analytics.openRecords} open records, ${analytics.overdueRecords} overdue, and ${analytics.activePublicLinks} active external requests.`,
      recommendations,
      urgentItems: urgent.map((item) => ({ id: String(item._id), moduleKey: item.moduleKey, title: item.title, status: item.status, priority: item.priority, dueAt: item.dueAt })),
      analytics,
    };
  }
}
