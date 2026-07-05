import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperationsRecordEntity, OperationsRecordRow } from '../database/entities/record.entity';
import { WorkspaceEntity, WorkspaceRow } from '../database/entities/workspace.entity';

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(OperationsRecordEntity) private readonly records: Repository<OperationsRecordRow>,
    @InjectRepository(WorkspaceEntity) private readonly workspaces: Repository<WorkspaceRow>,
  ) {}

  async add(input: {
    workspaceId?: number | null;
    moduleKey?: string;
    action: string;
    entityType: string;
    entityId?: string;
    actorType?: string;
    summary: string;
    metadata?: Record<string, unknown>;
  }) {
    const workspaceId = input.workspaceId ?? (await this.systemWorkspace()).id;
    return this.records.save(this.records.create({
      workspaceId,
      moduleKey: 'audit',
      recordType: 'Activity',
      title: input.summary,
      description: '',
      status: 'Completed',
      priority: 'Normal',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      contactLabel: '',
      amount: null,
      dueAt: null,
      attachments: [],
      payload: {
        sourceModule: input.moduleKey ?? '',
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? '',
        actorType: input.actorType ?? 'Admin',
        metadata: input.metadata ?? {},
      },
      recurrence: null,
      parentRecordId: null,
      assignedTo: '',
      completedAt: new Date(),
    }));
  }

  async list(propertyId?: number) {
    let workspaceId: number | undefined;
    if (propertyId) workspaceId = (await this.workspaces.findOneBy({ propertyId }))?.id;
    const items = await this.records.find({
      where: { ...(workspaceId ? { workspaceId } : {}), moduleKey: 'audit', recordType: 'Activity' },
      order: { createdAt: 'DESC' },
      take: 500,
    });
    return items.map((item) => ({ id: item.id, summary: item.title, moduleKey: item.payload.sourceModule ?? '', createdAt: item.createdAt, ...item.payload }));
  }

  private async systemWorkspace() {
    let item = await this.workspaces.findOneBy({ propertyId: 0 });
    if (!item) item = await this.workspaces.save(this.workspaces.create({ propertyId: 0, status: 'System', propertySnapshot: { title: 'System' } }));
    return item;
  }
}
