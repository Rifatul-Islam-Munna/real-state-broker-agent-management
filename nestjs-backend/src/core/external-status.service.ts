import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperationsRecordEntity, OperationsRecordRow } from '../database/entities/record.entity';
import { ActivityLogService } from './activity-log.service';
import { ExternalPublicService } from './external-public.service';

@Injectable()
export class ExternalStatusService {
  constructor(
    @InjectRepository(OperationsRecordEntity) private records: Repository<OperationsRecordRow>,
    private access: ExternalPublicService,
    private activity: ActivityLogService,
  ) {}

  async get(code: string) {
    const request = await this.access.find(code, true);
    if (!request.parentRecordId) throw new NotFoundException('No operational record is linked to this request.');
    const record = await this.records.findOneBy({ id: request.parentRecordId });
    if (!record) throw new NotFoundException('The linked operational record was not found.');
    return this.map(record, request.status);
  }

  async update(code: string, input: { status?: string; comment?: string; attachmentUrls?: string[] }) {
    const request = await this.access.find(code, true);
    if (!request.parentRecordId) throw new NotFoundException('No operational record is linked to this request.');
    const record = await this.records.findOneBy({ id: request.parentRecordId });
    if (!record) throw new NotFoundException('The linked operational record was not found.');
    if (!['tickets', 'work-orders', 'inspections', 'vendor-quotes'].includes(record.moduleKey)) throw new BadRequestException('Public progress updates are not enabled for this record.');
    const allowed = ['Open', 'In progress', 'Waiting', 'Resolved', 'Completed'];
    if (input.status && !allowed.includes(input.status)) throw new BadRequestException('That status is not allowed.');
    if (input.status) record.status = input.status;
    if (input.status && ['Resolved', 'Completed'].includes(input.status)) record.completedAt = new Date();
    if (input.attachmentUrls?.length) record.attachments = Array.from(new Set([...record.attachments, ...input.attachmentUrls]));
    const history = Array.isArray(record.payload.publicHistory) ? [...record.payload.publicHistory as Array<Record<string, unknown>>] : [];
    history.push({ at: new Date().toISOString(), status: input.status ?? record.status, comment: input.comment ?? '', attachments: input.attachmentUrls ?? [] });
    record.payload = { ...record.payload, publicHistory: history };
    await this.records.save(record);
    await this.activity.add({ workspaceId: record.workspaceId, moduleKey: record.moduleKey, action: 'external-progress-updated', entityType: 'Record', entityId: String(record.id), actorType: 'External', summary: input.comment || `${record.title} updated through secure access.` });
    return this.map(record, request.status);
  }

  private map(record: OperationsRecordRow, requestStatus: string) {
    return {
      id: String(record.id), moduleKey: record.moduleKey, recordType: record.recordType,
      title: record.title, description: record.description, status: record.status,
      priority: record.priority, assignedTo: record.assignedTo, dueAt: record.dueAt,
      amount: record.amount == null ? null : Number(record.amount), attachments: record.attachments,
      history: Array.isArray(record.payload.publicHistory) ? record.payload.publicHistory : [], requestStatus,
    };
  }
}
