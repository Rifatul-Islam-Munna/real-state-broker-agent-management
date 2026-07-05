import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OperationsActivity, OperationsActivityDocument } from '../schemas/public-access.schema';
import { OperationsWorkspace, OperationsWorkspaceDocument } from '../schemas/operations.schema';

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(OperationsActivity.name) private readonly activities: Model<OperationsActivityDocument>,
    @InjectModel(OperationsWorkspace.name) private readonly workspaces: Model<OperationsWorkspaceDocument>,
  ) {}

  async add(input: {
    workspaceId?: Types.ObjectId | null;
    moduleKey?: string;
    action: string;
    entityType: string;
    entityId?: string;
    actorType?: string;
    summary: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.activities.create({
      workspaceId: input.workspaceId ?? null,
      moduleKey: input.moduleKey ?? '',
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? '',
      actorType: input.actorType ?? 'Admin',
      summary: input.summary,
      metadata: input.metadata ?? {},
    });
  }

  async list(propertyId?: number) {
    let workspaceId: Types.ObjectId | undefined;
    if (propertyId) {
      const workspace = await this.workspaces.findOne({ propertyId }).select('_id').lean();
      if (!workspace) return [];
      workspaceId = workspace._id;
    }
    const query = workspaceId ? { workspaceId } : {};
    return this.activities.find(query).sort({ createdAt: -1 }).limit(500).lean();
  }
}
