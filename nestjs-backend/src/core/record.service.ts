import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, LessThanOrEqual, Repository } from 'typeorm';
import { RecordActionDto, SaveRecordDto } from '../property-operations/dto/workspace-record.dto';
import { RECORD_STATUSES, isModuleKey } from '../property-operations/module-catalog';
import { OperationsRecordEntity, OperationsRecordRow } from '../database/entities/record.entity';
import { ActivityLogService } from './activity-log.service';
import { WorkspaceService } from './workspace.service';

const ACTION_STATUS: Record<string, string> = {
  submit: 'Submitted', review: 'Under review', approve: 'Approved', reject: 'Rejected',
  assign: 'Assigned', start: 'In progress', resolve: 'Resolved', complete: 'Completed',
  close: 'Closed', pay: 'Paid', publish: 'Published', send: 'Sent', fail: 'Failed',
  pause: 'Paused', cancel: 'Cancelled', archive: 'Archived', reopen: 'Open',
};

@Injectable()
export class RecordService {
  constructor(
    @InjectRepository(OperationsRecordEntity) private readonly records: Repository<OperationsRecordRow>,
    private readonly workspaces: WorkspaceService,
    private readonly activity: ActivityLogService,
  ) {}

  async list(propertyId: number, moduleKey?: string, status?: string, search?: string) {
    const workspace = await this.workspaces.findByPropertyId(propertyId);
    const where: Record<string, unknown> = { workspaceId: workspace.id };
    if (moduleKey) where.moduleKey = moduleKey;
    if (status) where.status = status;
    if (search) where.title = ILike(`%${search}%`);
    const items = await this.records.find({ where, order: { dueAt: 'ASC', updatedAt: 'DESC' } });
    return items.filter((item) => !['Activity', 'Preferences', 'ShareRequest', 'PublicSubmission'].includes(item.recordType)).map((item) => this.map(item, propertyId));
  }

  async save(dto: SaveRecordDto) {
    if (!isModuleKey(dto.moduleKey)) throw new BadRequestException('Unsupported module.');
    if (dto.status && !(RECORD_STATUSES as readonly string[]).includes(dto.status)) throw new BadRequestException('Invalid status.');
    const workspace = await this.workspaces.findByPropertyId(dto.propertyId);
    const id = dto.id ? Number(dto.id) : undefined;
    const existing = id ? await this.records.findOneBy({ id, workspaceId: workspace.id }) : null;
    if (id && !existing) throw new NotFoundException('Operational record was not found.');
    const item = this.records.create({
      ...existing,
      workspaceId: workspace.id,
      moduleKey: dto.moduleKey,
      recordType: dto.recordType,
      title: dto.title.trim(),
      description: dto.description ?? '',
      status: dto.status ?? 'Open',
      priority: dto.priority ?? 'Normal',
      contactName: dto.contactName ?? '',
      contactEmail: dto.contactEmail ?? '',
      contactPhone: dto.contactPhone ?? '',
      contactLabel: dto.contactLabel ?? '',
      amount: dto.amount == null ? null : String(dto.amount),
      dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      attachments: dto.attachments ?? existing?.attachments ?? [],
      payload: dto.payload ?? existing?.payload ?? {},
      recurrence: dto.recurrence ?? existing?.recurrence ?? null,
      assignedTo: dto.assignedTo ?? existing?.assignedTo ?? '',
      completedAt: ['Completed', 'Closed', 'Paid', 'Resolved'].includes(dto.status ?? '') ? new Date() : existing?.completedAt ?? null,
    });
    const saved = await this.records.save(item);
    await this.activity.add({ workspaceId: workspace.id, moduleKey: dto.moduleKey, action: id ? 'record-updated' : 'record-created', entityType: 'Record', entityId: String(saved.id), summary: `${saved.title} ${id ? 'updated' : 'created'}.` });
    return this.map(saved, dto.propertyId);
  }

  async remove(id: string) {
    const item = await this.records.findOneBy({ id: Number(id) });
    if (!item) return;
    await this.records.delete(item.id);
    await this.activity.add({ workspaceId: item.workspaceId, moduleKey: item.moduleKey, action: 'record-deleted', entityType: 'Record', entityId: id, summary: `${item.title} deleted.` });
  }

  async action(id: string, action: string, dto: RecordActionDto) {
    const item = await this.records.findOneBy({ id: Number(id) });
    if (!item) throw new NotFoundException('Operational record was not found.');
    const status = dto.status ?? ACTION_STATUS[action];
    if (!status || !(RECORD_STATUSES as readonly string[]).includes(status)) throw new BadRequestException('Unsupported record action.');
    item.status = status;
    if (dto.assignedTo !== undefined) item.assignedTo = dto.assignedTo;
    if (dto.payload) item.payload = { ...item.payload, ...dto.payload };
    if (['Completed', 'Closed', 'Paid', 'Resolved'].includes(status)) item.completedAt = new Date();
    const saved = await this.records.save(item);
    await this.activity.add({ workspaceId: item.workspaceId, moduleKey: item.moduleKey, action, entityType: 'Record', entityId: id, summary: dto.note || `${item.title} marked ${status}.`, metadata: dto.payload });
    return this.map(saved);
  }

  async generateRecurring(propertyId?: number) {
    const workspace = propertyId ? await this.workspaces.findByPropertyId(propertyId) : null;
    const schedules = await this.records.find({
      where: { ...(workspace ? { workspaceId: workspace.id } : {}), moduleKey: 'recurring-maintenance', dueAt: LessThanOrEqual(new Date()) },
    });
    const generated: OperationsRecordRow[] = [];
    for (const schedule of schedules.filter((item) => ['Active', 'Due', 'Scheduled'].includes(item.status))) {
      const intervalDays = Math.max(1, Number(schedule.payload.intervalDays ?? 30));
      const workOrder = await this.records.save(this.records.create({
        workspaceId: schedule.workspaceId, moduleKey: 'work-orders', recordType: 'Generated work order',
        title: schedule.title, description: schedule.description, status: 'Scheduled', priority: schedule.priority,
        contactName: schedule.contactName, contactEmail: schedule.contactEmail, contactPhone: schedule.contactPhone,
        contactLabel: schedule.contactLabel, amount: null, dueAt: new Date(), attachments: schedule.attachments,
        payload: { generatedFrom: schedule.id, checklist: schedule.payload.checklist ?? [] }, recurrence: null,
        parentRecordId: schedule.id, assignedTo: schedule.assignedTo, completedAt: null,
      }));
      schedule.dueAt = new Date(Date.now() + intervalDays * 86400000);
      schedule.status = 'Active';
      await this.records.save(schedule);
      generated.push(workOrder);
    }
    return generated.map((item) => this.map(item));
  }

  repository() { return this.records; }

  map(item: OperationsRecordRow, propertyId?: number) {
    return {
      id: String(item.id), propertyId, moduleKey: item.moduleKey, recordType: item.recordType,
      title: item.title, description: item.description, status: item.status, priority: item.priority,
      contactName: item.contactName, contactEmail: item.contactEmail, contactPhone: item.contactPhone,
      amount: item.amount == null ? null : Number(item.amount), dueAt: item.dueAt, attachments: item.attachments,
      payload: item.payload, payloadJson: JSON.stringify({ ...item.payload, contactName: item.contactName, contactEmail: item.contactEmail, contactPhone: item.contactPhone }),
      recurrence: item.recurrence, assignedTo: item.assignedTo, completedAt: item.completedAt,
      createdAt: item.createdAt, updatedAt: item.updatedAt,
    };
  }
}
