import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import { ImportPropertiesDto, UpdateModuleStateDto } from '../property-operations/dto/workspace-record.dto';
import { MODULE_KEYS, MODULE_STATUSES, isModuleKey } from '../property-operations/module-catalog';
import { ModuleStateEntity, ModuleStateRow, OperationsRecordEntity, OperationsRecordRow } from '../database/entities/record.entity';
import { WorkspaceEntity, WorkspaceRow } from '../database/entities/workspace.entity';
import { ActivityLogService } from './activity-log.service';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectRepository(WorkspaceEntity) private readonly workspaces: Repository<WorkspaceRow>,
    @InjectRepository(ModuleStateEntity) private readonly states: Repository<ModuleStateRow>,
    @InjectRepository(OperationsRecordEntity) private readonly records: Repository<OperationsRecordRow>,
    private readonly activity: ActivityLogService,
  ) {}

  async list() {
    const items = await this.workspaces.find({ where: { propertyId: MoreThan(0) }, order: { updatedAt: 'DESC' } });
    const ids = items.map((item) => item.id);
    const states = ids.length ? await this.states.find({ where: { workspaceId: In(ids) } }) : [];
    return items.map((item) => this.map(item, states.filter((state) => state.workspaceId === item.id)));
  }

  async importProperties(dto: ImportPropertiesDto) {
    if (!dto.properties.length) throw new BadRequestException('Select at least one property.');
    for (const property of dto.properties) {
      let workspace = await this.workspaces.findOneBy({ propertyId: property.propertyId });
      const propertySnapshot = {
        title: property.title,
        location: property.location ?? '',
        propertyType: property.propertyType ?? '',
        listingType: property.listingType ?? '',
        propertyStatus: property.propertyStatus ?? '',
        propertySlug: property.propertySlug ?? '',
        thumbnailUrl: property.thumbnailUrl ?? '',
      };
      if (workspace) {
        workspace.propertySnapshot = propertySnapshot;
        workspace = await this.workspaces.save(workspace);
      } else {
        workspace = await this.workspaces.save(this.workspaces.create({ propertyId: property.propertyId, status: 'Active', propertySnapshot }));
        await this.activity.add({ workspaceId: workspace.id, moduleKey: 'portfolio', action: 'property-imported', entityType: 'Workspace', entityId: String(workspace.id), summary: `${property.title} imported.` });
      }
      const existing = new Set((await this.states.findBy({ workspaceId: workspace.id })).map((state) => state.moduleKey));
      const missing = MODULE_KEYS.filter((key) => !existing.has(key)).map((moduleKey) => this.states.create({ workspaceId: workspace.id, moduleKey, status: 'Not started', notes: '' }));
      if (missing.length) await this.states.save(missing);
    }
    return this.list();
  }

  async updateModuleState(dto: UpdateModuleStateDto) {
    if (!isModuleKey(dto.moduleKey)) throw new BadRequestException('Unsupported module.');
    if (!(MODULE_STATUSES as readonly string[]).includes(dto.status)) throw new BadRequestException('Invalid module status.');
    const workspace = await this.findByPropertyId(dto.propertyId);
    let state = await this.states.findOneBy({ workspaceId: workspace.id, moduleKey: dto.moduleKey });
    state = this.states.create({ ...state, workspaceId: workspace.id, moduleKey: dto.moduleKey, status: dto.status, notes: dto.notes ?? state?.notes ?? '' });
    state = await this.states.save(state);
    await this.activity.add({ workspaceId: workspace.id, moduleKey: dto.moduleKey, action: 'module-state-updated', entityType: 'ModuleState', entityId: String(state.id), summary: `${dto.moduleKey} marked ${dto.status}.` });
    return state;
  }

  async remove(propertyId: number) {
    const workspace = await this.findByPropertyId(propertyId);
    await this.records.delete({ workspaceId: workspace.id });
    await this.states.delete({ workspaceId: workspace.id });
    await this.workspaces.delete(workspace.id);
  }

  async findByPropertyId(propertyId: number) {
    const workspace = await this.workspaces.findOneBy({ propertyId });
    if (!workspace) throw new NotFoundException('Import the property first.');
    return workspace;
  }

  async systemWorkspace() {
    let item = await this.workspaces.findOneBy({ propertyId: 0 });
    if (!item) item = await this.workspaces.save(this.workspaces.create({ propertyId: 0, status: 'System', propertySnapshot: { title: 'System' } }));
    return item;
  }

  private map(item: WorkspaceRow, states: ModuleStateRow[]) {
    const property = item.propertySnapshot ?? {};
    return {
      id: String(item.id), propertyId: item.propertyId, status: item.status,
      propertyTitle: String(property.title ?? ''), propertyLocation: String(property.location ?? ''),
      propertyType: String(property.propertyType ?? ''), listingType: String(property.listingType ?? ''),
      propertyStatus: String(property.propertyStatus ?? ''), propertySlug: String(property.propertySlug ?? ''),
      thumbnailUrl: String(property.thumbnailUrl ?? ''), createdAt: item.createdAt, updatedAt: item.updatedAt,
      moduleStates: states.map((state) => ({ id: String(state.id), moduleKey: state.moduleKey, status: state.status, notes: state.notes, updatedAt: state.updatedAt })),
    };
  }
}
