import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RecordActionDto, SaveRecordDto } from '../dto/workspace-record.dto';
import { RECORD_STATUSES, isModuleKey } from '../module-catalog';
import { OperationsRecord, OperationsRecordDocument } from '../schemas/operations.schema';
import { ActivityService } from './activity.service';
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
    @InjectModel(OperationsRecord.name) private readonly records: Model<OperationsRecordDocument>,
    private readonly workspaces: WorkspaceService,
    private readonly activity: ActivityService,
  ) {}

  async list(propertyId: number, moduleKey?: string, status?: string, search?: string) {
    const workspace = await this.workspaces.findByPropertyId(propertyId);
    const query: Record<string, unknown> = { workspaceId: workspace._id };
    if (moduleKey) query.moduleKey = moduleKey;
    if (status) query.status = status;
    if (search) query.$or = [{ title: new RegExp(search, 'i') }, { description: new RegExp(search, 'i') }, { recordType: new RegExp(search, 'i') }];
    const items = await this.records.find(query).sort({ dueAt: 1, updatedAt: -1 }).lean();
    return items.map((item) => this.map(item, propertyId));
  }

  async save(dto: SaveRecordDto) {
    if (!isModuleKey(dto.moduleKey)) throw new BadRequestException('Unsupported module.');
    if (dto.status && !(RECORD_STATUSES as readonly string[]).includes(dto.status)) throw new BadRequestException('Invalid status.');
    const workspace = await this.workspaces.findByPropertyId(dto.propertyId);
    const values = {
      workspaceId: workspace._id,
      moduleKey: dto.moduleKey,
      recordType: dto.recordType,
      title: dto.title.trim(),
      description: dto.description ?? '',
      status: dto.status ?? 'Open',
      priority: dto.priority ?? 'Normal',
      contact: { name: dto.contactName ?? '', email: dto.contactEmail ?? '', phone: dto.contactPhone ?? '', label: dto.contactLabel ?? '' },
      amount: dto.amount ?? null,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      attachments: dto.attachments ?? [],
      payload: dto.payload ?? {},
      recurrence: dto.recurrence ?? null,
      assignedTo: dto.assignedTo ?? '',
    };
    const item = dto.id
      ? await this.records.findOneAndUpdate({ _id: dto.id, workspaceId: workspace._id }, values, { new: true })
      : await this.records.create(values);
    if (!item) throw new NotFoundException('Operational record was not found.');
    await this.activity.add({ workspaceId: workspace._id, moduleKey: dto.moduleKey, action: dto.id ? 'record-updated' : 'record-created', entityType: 'Record', entityId: String(item._id), summary: `${dto.title} ${dto.id ? 'updated' : 'created'}.` });
    return this.map(item.toObject(), dto.propertyId);
  }

  async remove(id: string) {
    const item = await this.records.findByIdAndDelete(id);
    if (item) await this.activity.add({ workspaceId: item.workspaceId, moduleKey: item.moduleKey, action: 'record-deleted', entityType: 'Record', entityId: id, summary: `${item.title} deleted.` });
  }

  async action(id: string, action: string, dto: RecordActionDto) {
    const item = await this.records.findById(id);
    if (!item) throw new NotFoundException('Operational record was not found.');
    const status = dto.status ?? ACTION_STATUS[action];
    if (!status || !(RECORD_STATUSES as readonly string[]).includes(status)) throw new BadRequestException('Unsupported record action.');
    item.status = status;
    if (dto.assignedTo !== undefined) item.assignedTo = dto.assignedTo;
    if (dto.payload) item.payload = { ...item.payload, ...dto.payload };
    if (['Completed', 'Closed', 'Paid', 'Resolved'].includes(status)) item.completedAt = new Date();
    await item.save();
    await this.activity.add({ workspaceId: item.workspaceId, moduleKey: item.moduleKey, action, entityType: 'Record', entityId: id, summary: dto.note || `${item.title} marked ${status}.`, metadata: dto.payload });
    return this.map(item.toObject());
  }

  async generateRecurring(propertyId?: number) {
    const now = new Date();
    const query: Record<string, unknown> = { moduleKey: 'recurring-maintenance', status: { $in: ['Active', 'Due', 'Scheduled'] }, dueAt: { $lte: now } };
    if (propertyId) query.workspaceId = (await this.workspaces.findByPropertyId(propertyId))._id;
    const schedules = await this.records.find(query);
    const generated = [];
    for (const schedule of schedules) {
      const intervalDays = Math.max(1, Number(schedule.payload?.intervalDays ?? 30));
      const workOrder = await this.records.create({
        workspaceId: schedule.workspaceId, moduleKey: 'work-orders', recordType: 'Generated work order',
        title: schedule.title, description: schedule.description, status: 'Scheduled', priority: schedule.priority,
        contact: schedule.contact, assignedTo: schedule.assignedTo, payload: { generatedFrom: String(schedule._id), checklist: schedule.payload?.checklist ?? [] },
        parentRecordId: schedule._id, dueAt: now,
      });
      schedule.dueAt = new Date(now.getTime() + intervalDays * 86400000);
      schedule.status = 'Active';
      await schedule.save();
      generated.push(workOrder);
      await this.activity.add({ workspaceId: schedule.workspaceId, moduleKey: 'work-orders', action: 'recurring-work-generated', entityType: 'Record', entityId: String(workOrder._id), summary: `Work order generated from ${schedule.title}.` });
    }
    return generated.map((item) => this.map(item.toObject()));
  }

  async deleteByWorkspace(workspaceId: Types.ObjectId) {
    await this.records.deleteMany({ workspaceId });
  }

  private map(item: any, propertyId?: number) {
    return {
      id: String(item._id), propertyId, moduleKey: item.moduleKey, recordType: item.recordType,
      title: item.title, description: item.description, status: item.status, priority: item.priority,
      contactName: item.contact?.name ?? '', contactEmail: item.contact?.email ?? '', contactPhone: item.contact?.phone ?? '',
      amount: item.amount ?? null, dueAt: item.dueAt ?? null, attachments: item.attachments ?? [],
      payload: item.payload ?? {}, payloadJson: JSON.stringify({ ...(item.payload ?? {}), contactName: item.contact?.name ?? '', contactEmail: item.contact?.email ?? '', contactPhone: item.contact?.phone ?? '' }),
      recurrence: item.recurrence ?? null, assignedTo: item.assignedTo ?? '', completedAt: item.completedAt ?? null,
      createdAt: item.createdAt, updatedAt: item.updatedAt,
    };
  }
}
