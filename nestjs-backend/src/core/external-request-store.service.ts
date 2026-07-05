import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperationsRecordEntity, OperationsRecordRow } from '../database/entities/record.entity';
import { WorkspaceService } from './workspace.service';

@Injectable()
export class ExternalRequestStoreService {
  constructor(
    @InjectRepository(OperationsRecordEntity) private readonly records: Repository<OperationsRecordRow>,
    private readonly workspaces: WorkspaceService,
  ) {}

  async create(input: {
    propertyId: number;
    linkedRecordId?: number | null;
    moduleKey: string;
    title: string;
    instructions?: string;
    recipientLabel?: string;
    recipientName?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    accessChecksum: string;
    formSchema?: Array<Record<string, unknown>>;
    expiresAt: Date;
    maxUses: number;
    oneTime: boolean;
    allowFileUploads: boolean;
  }) {
    const workspace = await this.workspaces.findByPropertyId(input.propertyId);
    const item = this.records.create({
      workspaceId: workspace.id,
      moduleKey: 'public-portals',
      recordType: 'ExternalRequest',
      title: input.title,
      description: input.instructions ?? '',
      status: 'Active',
      priority: 'Normal',
      contactName: input.recipientName ?? '',
      contactEmail: input.recipientEmail ?? '',
      contactPhone: input.recipientPhone ?? '',
      contactLabel: input.recipientLabel ?? 'External participant',
      amount: null,
      dueAt: input.expiresAt,
      attachments: [],
      payload: {
        accessChecksum: input.accessChecksum,
        targetModuleKey: input.moduleKey,
        formSchema: input.formSchema ?? [],
        expiresAt: input.expiresAt.toISOString(),
        maxUses: input.maxUses,
        useCount: 0,
        oneTime: input.oneTime,
        allowFileUploads: input.allowFileUploads,
      },
      recurrence: null,
      parentRecordId: input.linkedRecordId ?? null,
      assignedTo: '',
      completedAt: null,
    });
    return { item: await this.records.save(item), workspace };
  }

  async list(propertyId?: number) {
    const spaces = await this.workspaces.list();
    const map = new Map(spaces.map((item) => [Number(item.id), item]));
    const requests = (await this.records.find({ where: { recordType: 'ExternalRequest' }, order: { createdAt: 'DESC' } }))
      .filter((item) => !propertyId || map.get(item.workspaceId)?.propertyId === propertyId);
    const responses = await this.records.find({ where: { recordType: 'ExternalResponse' } });
    return requests.map((item) => ({ item, workspace: map.get(item.workspaceId), responseCount: responses.filter((entry) => entry.parentRecordId === item.id).length }));
  }

  get(id: number) {
    return this.records.findOneBy({ id, recordType: 'ExternalRequest' });
  }

  responses(id: number) {
    return this.records.find({ where: { recordType: 'ExternalResponse', parentRecordId: id }, order: { createdAt: 'DESC' } });
  }

  repository() {
    return this.records;
  }
}
