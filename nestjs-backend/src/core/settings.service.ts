import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperationsRecordEntity, OperationsRecordRow } from '../database/entities/record.entity';
import { UpdateSettingsDto } from '../property-operations/dto/settings.dto';
import { PlatformSettingsService } from '../shared/platform-settings.service';
import { ActivityLogService } from './activity-log.service';
import { WorkspaceService } from './workspace.service';

const defaults = {
  defaultExpiryHours: 168,
  defaultMaxUses: 1,
  defaultOneTime: true,
  requireName: true,
  requireEmail: false,
  requirePhone: false,
  allowFileUploads: true,
  showPropertyAddress: true,
  autoCloseRecordOnSubmit: false,
  notifyAdminOnSubmit: true,
  welcomeMessage: 'Please review the request and submit the requested information.',
  termsText: '',
  emailSubjectTemplate: 'Property request: {{title}}',
  emailBodyTemplate: 'Open this secure link to complete the property request: {{link}}',
  smsTemplate: 'Property request: {{title}} {{link}}',
};

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(OperationsRecordEntity) private readonly records: Repository<OperationsRecordRow>,
    private readonly workspaces: WorkspaceService,
    private readonly platform: PlatformSettingsService,
    private readonly activity: ActivityLogService,
  ) {}

  async get() {
    const [shared, item] = await Promise.all([this.platform.get(), this.preferences()]);
    return {
      businessName: shared.businessName,
      logoUrl: shared.logoUrl,
      brandColor: shared.brandColor,
      publicBaseUrl: shared.publicBaseUrl,
      currency: shared.currency,
      ...defaults,
      ...item.payload,
      updatedAt: item.updatedAt,
      sharedFromMainDashboard: true,
    };
  }

  async update(dto: UpdateSettingsDto) {
    const item = await this.preferences();
    const next = { ...item.payload };
    for (const key of Object.keys(defaults)) {
      const value = (dto as Record<string, unknown>)[key];
      if (value !== undefined) next[key] = value;
    }
    item.payload = next;
    await this.records.save(item);
    await this.activity.add({ moduleKey: 'organization', action: 'preferences-updated', entityType: 'Preferences', entityId: String(item.id), summary: 'Property Operations preferences updated.' });
    return this.get();
  }

  private async preferences() {
    const workspace = await this.workspaces.systemWorkspace();
    let item = await this.records.findOneBy({ workspaceId: workspace.id, moduleKey: 'organization', recordType: 'Preferences' });
    if (!item) {
      item = await this.records.save(this.records.create({
        workspaceId: workspace.id, moduleKey: 'organization', recordType: 'Preferences',
        title: 'Property Operations preferences', description: '', status: 'Active', priority: 'Normal',
        contactName: '', contactEmail: '', contactPhone: '', contactLabel: '', amount: null,
        dueAt: null, attachments: [], payload: defaults, recurrence: null,
        parentRecordId: null, assignedTo: '', completedAt: null,
      }));
    }
    return item;
  }
}
