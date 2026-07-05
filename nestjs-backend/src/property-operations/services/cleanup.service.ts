import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OperationsActivity, OperationsActivityDocument } from '../schemas/public-access.schema';
import { OperationsRecord, OperationsRecordDocument } from '../schemas/operations.schema';
import { PublicAccessService } from './public-access.service';
import { WorkspaceService } from './workspace.service';

@Injectable()
export class CleanupService {
  constructor(
    @InjectModel(OperationsRecord.name) private readonly records: Model<OperationsRecordDocument>,
    @InjectModel(OperationsActivity.name) private readonly activities: Model<OperationsActivityDocument>,
    private readonly workspaces: WorkspaceService,
    private readonly publicAccess: PublicAccessService,
  ) {}

  async removeProperty(propertyId: number) {
    const workspace = await this.workspaces.findByPropertyId(propertyId);
    await Promise.all([
      this.publicAccess.deleteByWorkspace(workspace._id),
      this.records.deleteMany({ workspaceId: workspace._id }),
      this.activities.deleteMany({ workspaceId: workspace._id }),
    ]);
    await this.workspaces.remove(propertyId);
  }
}
