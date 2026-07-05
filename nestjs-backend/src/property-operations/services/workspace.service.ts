import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ImportPropertiesDto, UpdateModuleStateDto } from '../dto/workspace-record.dto';
import { MODULE_KEYS, MODULE_STATUSES, isModuleKey } from '../module-catalog';
import { OperationsWorkspace, OperationsWorkspaceDocument } from '../schemas/operations.schema';
import { ActivityService } from './activity.service';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectModel(OperationsWorkspace.name) private readonly workspaces: Model<OperationsWorkspaceDocument>,
    private readonly activity: ActivityService,
  ) {}

  async list() {
    const items = await this.workspaces.find().sort({ updatedAt: -1 }).lean();
    return items.map((item) => this.map(item));
  }

  async importProperties(dto: ImportPropertiesDto) {
    if (!dto.properties.length) throw new BadRequestException('Select at least one property.');
    for (const property of dto.properties) {
      const item = await this.workspaces.findOne({ propertyId: property.propertyId });
      const snapshot = {
        title: property.title,
        location: property.location ?? '',
        propertyType: property.propertyType ?? '',
        listingType: property.listingType ?? '',
        propertyStatus: property.propertyStatus ?? '',
        propertySlug: property.propertySlug ?? '',
        thumbnailUrl: property.thumbnailUrl ?? '',
      };
      if (item) {
        item.property = snapshot;
        const known = new Set(item.moduleStates.map((state) => state.moduleKey));
        for (const moduleKey of MODULE_KEYS) {
          if (!known.has(moduleKey)) item.moduleStates.push({ moduleKey, status: 'Not started', notes: '', updatedAt: new Date() });
        }
        await item.save();
      } else {
        const created = await this.workspaces.create({
          propertyId: property.propertyId,
          property: snapshot,
          moduleStates: MODULE_KEYS.map((moduleKey) => ({ moduleKey, status: 'Not started', notes: '', updatedAt: new Date() })),
        });
        await this.activity.add({ workspaceId: created._id, moduleKey: 'portfolio', action: 'property-imported', entityType: 'Workspace', entityId: String(created._id), summary: `${property.title} imported.` });
      }
    }
    return this.list();
  }

  async updateModuleState(dto: UpdateModuleStateDto) {
    if (!isModuleKey(dto.moduleKey)) throw new BadRequestException('Unsupported module.');
    if (!(MODULE_STATUSES as readonly string[]).includes(dto.status)) throw new BadRequestException('Invalid module status.');
    const workspace = await this.findByPropertyId(dto.propertyId);
    const state = workspace.moduleStates.find((item) => item.moduleKey === dto.moduleKey);
    if (state) Object.assign(state, { status: dto.status, notes: dto.notes ?? state.notes, updatedAt: new Date() });
    else workspace.moduleStates.push({ moduleKey: dto.moduleKey, status: dto.status, notes: dto.notes ?? '', updatedAt: new Date() });
    await workspace.save();
    await this.activity.add({ workspaceId: workspace._id, moduleKey: dto.moduleKey, action: 'module-state-updated', entityType: 'ModuleState', summary: `${dto.moduleKey} marked ${dto.status}.` });
    return workspace.moduleStates.find((item) => item.moduleKey === dto.moduleKey);
  }

  async findByPropertyId(propertyId: number) {
    const workspace = await this.workspaces.findOne({ propertyId });
    if (!workspace) throw new NotFoundException('Import the property first.');
    return workspace;
  }

  async remove(propertyId: number) {
    return this.workspaces.findOneAndDelete({ propertyId });
  }

  private map(item: any) {
    return {
      id: String(item._id), propertyId: item.propertyId, status: item.status,
      propertyTitle: item.property.title, propertyLocation: item.property.location,
      propertyType: item.property.propertyType, listingType: item.property.listingType,
      propertyStatus: item.property.propertyStatus, propertySlug: item.property.propertySlug,
      thumbnailUrl: item.property.thumbnailUrl,
      moduleStates: item.moduleStates.map((state: any) => ({ id: `${item._id}:${state.moduleKey}`, ...state })),
      createdAt: item.createdAt, updatedAt: item.updatedAt,
    };
  }
}
