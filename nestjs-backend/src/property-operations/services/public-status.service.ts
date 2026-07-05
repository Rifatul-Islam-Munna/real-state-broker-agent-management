import { BadRequestException, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'crypto';
import { Model } from 'mongoose';
import { OperationsRecord, OperationsRecordDocument } from '../schemas/operations.schema';
import { PublicAccess, PublicAccessDocument } from '../schemas/public-access.schema';
import { ActivityService } from './activity.service';

@Injectable()
export class PublicStatusService {
  constructor(@InjectModel(PublicAccess.name) private links: Model<PublicAccessDocument>, @InjectModel(OperationsRecord.name) private records: Model<OperationsRecordDocument>, private activity: ActivityService) {}
  async get(token: string) { const { link, record } = await this.resolve(token); return this.map(link, record); }
  async update(token: string, input: { status?: string; comment?: string; attachmentUrls?: string[] }) {
    const { link, record } = await this.resolve(token);
    if (!['tickets', 'work-orders', 'inspections', 'vendor-quotes'].includes(record.moduleKey)) throw new BadRequestException('Public updates are not enabled for this record.');
    if (input.status && !['Open', 'In progress', 'Waiting', 'Resolved', 'Completed'].includes(input.status)) throw new BadRequestException('That status is not allowed.');
    if (input.status) record.status = input.status;
    if (input.status && ['Resolved', 'Completed'].includes(input.status)) record.completedAt = new Date();
    if (input.attachmentUrls?.length) record.attachments = Array.from(new Set([...(record.attachments ?? []), ...input.attachmentUrls]));
    const history = Array.isArray(record.payload?.publicHistory) ? [...record.payload.publicHistory as Array<Record<string, unknown>>] : [];
    history.push({ at: new Date().toISOString(), status: input.status ?? record.status, comment: input.comment ?? '', attachments: input.attachmentUrls ?? [] });
    record.payload = { ...record.payload, publicHistory: history };
    await record.save();
    await this.activity.add({ workspaceId: link.workspaceId, moduleKey: record.moduleKey, action: 'public-status-updated', entityType: 'Record', entityId: String(record._id), actorType: 'External', summary: input.comment || `${record.title} updated through secure link.` });
    return this.map(link, record);
  }
  private async resolve(token: string) {
    const link = await this.links.findOne({ tokenHash: createHash('sha256').update(token).digest('hex') });
    if (!link) throw new NotFoundException('This secure link is invalid.');
    if (link.status === 'Revoked' || link.expiresAt.getTime() <= Date.now()) throw new GoneException('This secure link is no longer active.');
    if (!link.recordId) throw new NotFoundException('No operational record is linked to this request.');
    const record = await this.records.findById(link.recordId); if (!record) throw new NotFoundException('The linked record was not found.');
    return { link, record };
  }
  private map(link: PublicAccessDocument, record: OperationsRecordDocument) { return { id: String(record._id), moduleKey: record.moduleKey, recordType: record.recordType, title: record.title, description: record.description, status: record.status, priority: record.priority, assignedTo: record.assignedTo, dueAt: record.dueAt, amount: record.amount, attachments: record.attachments ?? [], history: Array.isArray(record.payload?.publicHistory) ? record.payload.publicHistory : [], requestStatus: link.status }; }
}
