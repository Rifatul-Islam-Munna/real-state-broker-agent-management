import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Repository } from 'typeorm';
import { SettingsService } from '../settings/settings.service';
import {
  PropertyOperationsModuleState,
  PropertyOperationsPreferences,
  PropertyOperationsRecord,
  PropertyOperationsWorkspace,
} from './property-operations.entity';

export const PROPERTY_OPERATIONS_MODULES = [
  'portfolio',
  'units',
  'tenants',
  'staff',
  'technicians',
  'vendors',
  'vendor-quotes',
  'tickets',
  'work-orders',
  'recurring-maintenance',
  'inspections',
  'assets',
  'billing',
  'finance',
  'subscriptions',
  'messages',
  'announcements',
  'notifications',
  'documents',
  'public-portals',
  'organization',
  'audit',
  'analytics',
  'ai',
] as const;

const completedStatuses = new Set(['Completed', 'Closed', 'Paid', 'Resolved', 'Archived']);

@Injectable()
export class PropertyOperationsService {
  constructor(
    @InjectRepository(PropertyOperationsWorkspace)
    private readonly workspaceRepository: Repository<PropertyOperationsWorkspace>,
    @InjectRepository(PropertyOperationsModuleState)
    private readonly moduleStateRepository: Repository<PropertyOperationsModuleState>,
    @InjectRepository(PropertyOperationsRecord)
    private readonly recordRepository: Repository<PropertyOperationsRecord>,
    @InjectRepository(PropertyOperationsPreferences)
    private readonly preferencesRepository: Repository<PropertyOperationsPreferences>,
    private readonly settingsService: SettingsService,
  ) {}

  async listWorkspaces() {
    const workspaces = await this.workspaceRepository.find({ order: { updatedAt: 'DESC' } });
    if (!workspaces.length) return [];
    const states = await this.moduleStateRepository.find({
      where: { workspaceId: In(workspaces.map((item) => item.id)) },
      order: { moduleKey: 'ASC' },
    });
    return workspaces.map((workspace) => this.workspaceDto(
      workspace,
      states.filter((state) => state.workspaceId === workspace.id),
    ));
  }

  async importProperties(properties: any[]) {
    if (!Array.isArray(properties) || !properties.length) {
      throw new BadRequestException('At least one property is required.');
    }

    for (const property of properties) {
      const propertyId = Number(property?.propertyId);
      if (!Number.isInteger(propertyId) || propertyId <= 0) continue;
      let workspace = await this.workspaceRepository.findOne({ where: { propertyId } });
      if (!workspace) {
        workspace = this.workspaceRepository.create({
          propertyId,
          status: 'Active',
          propertySnapshot: property,
        });
      } else {
        workspace.status = 'Active';
        workspace.propertySnapshot = property;
      }
      workspace = await this.workspaceRepository.save(workspace);
      const existing = await this.moduleStateRepository.find({ where: { workspaceId: workspace.id } });
      const existingKeys = new Set(existing.map((item) => item.moduleKey));
      const missing = PROPERTY_OPERATIONS_MODULES
        .filter((moduleKey) => !existingKeys.has(moduleKey))
        .map((moduleKey) => this.moduleStateRepository.create({
          workspaceId: workspace.id,
          moduleKey,
          status: 'Not started',
          notes: '',
        }));
      if (missing.length) await this.moduleStateRepository.save(missing);
    }

    await this.addActivity('Properties imported', `${properties.length} property snapshot(s) imported.`);
    return this.listWorkspaces();
  }

  async removeWorkspace(propertyId: number) {
    const workspace = await this.workspaceByPropertyId(propertyId);
    await this.recordRepository.delete({ workspaceId: workspace.id });
    await this.moduleStateRepository.delete({ workspaceId: workspace.id });
    await this.workspaceRepository.delete(workspace.id);
    return { message: 'Property Operations workspace removed.' };
  }

  async updateModuleState(input: any) {
    const workspace = await this.workspaceByPropertyId(Number(input?.propertyId));
    const moduleKey = String(input?.moduleKey ?? '');
    if (!PROPERTY_OPERATIONS_MODULES.includes(moduleKey as any)) {
      throw new BadRequestException('Unknown Property Operations module.');
    }
    let state = await this.moduleStateRepository.findOne({ where: { workspaceId: workspace.id, moduleKey } });
    if (!state) state = this.moduleStateRepository.create({ workspaceId: workspace.id, moduleKey });
    state.status = String(input?.status ?? 'Not started');
    state.notes = String(input?.notes ?? '');
    const saved = await this.moduleStateRepository.save(state);
    await this.addActivity('Module updated', `${moduleKey} changed to ${saved.status}.`, workspace.id);
    return this.moduleStateDto(saved);
  }

  async listRecords(propertyId: number, moduleKey?: string) {
    const workspace = await this.workspaceByPropertyId(propertyId);
    const records = await this.recordRepository.find({
      where: moduleKey ? { workspaceId: workspace.id, moduleKey } : { workspaceId: workspace.id },
      order: { updatedAt: 'DESC' },
    });
    return records.map((record) => this.recordDto(record, workspace.propertyId));
  }

  async saveRecord(input: any) {
    const workspace = await this.workspaceByPropertyId(Number(input?.propertyId));
    const id = Number(input?.id);
    let record = Number.isInteger(id) && id > 0
      ? await this.recordRepository.findOne({ where: { id, workspaceId: workspace.id } })
      : null;
    if (!record) record = this.recordRepository.create({ workspaceId: workspace.id });

    record.moduleKey = String(input?.moduleKey ?? 'portfolio');
    record.recordType = String(input?.recordType ?? 'Item');
    record.title = String(input?.title ?? '').trim();
    if (!record.title) throw new BadRequestException('Record title is required.');
    record.description = String(input?.description ?? '');
    record.status = String(input?.status ?? 'Open');
    record.priority = String(input?.priority ?? 'Normal');
    record.contactName = String(input?.contactName ?? '');
    record.contactEmail = String(input?.contactEmail ?? '');
    record.contactPhone = String(input?.contactPhone ?? '');
    record.contactLabel = String(input?.contactLabel ?? '');
    record.amount = input?.amount == null || input.amount === '' ? null : String(Number(input.amount));
    record.dueAt = input?.dueAt ? new Date(input.dueAt) : null;
    record.attachments = Array.isArray(input?.attachments) ? input.attachments.map(String) : record.attachments ?? [];
    record.payload = input?.payload && typeof input.payload === 'object' ? input.payload : {};
    record.recurrence = input?.recurrence && typeof input.recurrence === 'object' ? input.recurrence : null;
    record.parentRecordId = input?.parentRecordId ? Number(input.parentRecordId) : null;
    record.assignedTo = String(input?.assignedTo ?? '');
    record.completedAt = completedStatuses.has(record.status) ? record.completedAt ?? new Date() : null;
    const saved = await this.recordRepository.save(record);
    await this.addActivity('Record saved', `${saved.moduleKey}: ${saved.title}`, workspace.id, saved.id);
    return this.recordDto(saved, workspace.propertyId);
  }

  async deleteRecord(id: number) {
    const record = await this.recordRepository.findOne({ where: { id } });
    if (!record) throw new NotFoundException('Property Operations record was not found.');
    await this.recordRepository.delete(id);
    await this.addActivity('Record deleted', `${record.moduleKey}: ${record.title}`, record.workspaceId, record.id);
    return { message: 'Record deleted.' };
  }

  async runRecordAction(id: number, action: string, input: any = {}) {
    const record = await this.recordRepository.findOne({ where: { id } });
    if (!record) throw new NotFoundException('Property Operations record was not found.');
    const statuses: Record<string, string> = {
      submit: 'Submitted', review: 'Under review', approve: 'Approved', reject: 'Rejected',
      assign: 'Assigned', start: 'In progress', resolve: 'Resolved', complete: 'Completed',
      close: 'Closed', pay: 'Paid', publish: 'Published', send: 'Sent', fail: 'Failed',
      pause: 'Paused', cancel: 'Cancelled', archive: 'Archived', reopen: 'Open',
    };
    const nextStatus = statuses[action];
    if (!nextStatus) throw new BadRequestException('Unknown workflow action.');
    record.status = nextStatus;
    if (input?.assignedTo != null) record.assignedTo = String(input.assignedTo);
    record.completedAt = completedStatuses.has(nextStatus) ? new Date() : null;
    const saved = await this.recordRepository.save(record);
    await this.addActivity('Workflow action', `${action}: ${saved.title}`, saved.workspaceId, saved.id);
    const workspace = await this.workspaceRepository.findOne({ where: { id: saved.workspaceId } });
    return this.recordDto(saved, workspace?.propertyId);
  }

  async deliverRecord(id: number, channel: string) {
    const record = await this.recordRepository.findOne({ where: { id } });
    if (!record) throw new NotFoundException('Property Operations record was not found.');
    record.status = 'Sent';
    record.payload = { ...(record.payload ?? {}), deliveryChannel: channel, deliveredAt: new Date().toISOString() };
    const saved = await this.recordRepository.save(record);
    await this.addActivity('Delivery queued', `${channel}: ${saved.title}`, saved.workspaceId, saved.id);
    const workspace = await this.workspaceRepository.findOne({ where: { id: saved.workspaceId } });
    return this.recordDto(saved, workspace?.propertyId);
  }

  async runRecurring(propertyId?: number) {
    const workspace = propertyId ? await this.workspaceByPropertyId(propertyId) : null;
    const due = await this.recordRepository.find({
      where: {
        moduleKey: 'recurring-maintenance',
        dueAt: LessThanOrEqual(new Date()),
        ...(workspace ? { workspaceId: workspace.id } : {}),
      },
    });
    const generated: PropertyOperationsRecord[] = [];
    for (const schedule of due) {
      const child = this.recordRepository.create({
        workspaceId: schedule.workspaceId,
        moduleKey: 'work-orders',
        recordType: 'Generated work order',
        title: schedule.title,
        description: schedule.description,
        status: 'Open',
        priority: schedule.priority,
        contactName: schedule.contactName,
        contactEmail: schedule.contactEmail,
        contactPhone: schedule.contactPhone,
        contactLabel: schedule.contactLabel,
        amount: schedule.amount,
        dueAt: schedule.dueAt,
        attachments: [],
        payload: { generatedFromRecurringMaintenance: schedule.id },
        recurrence: null,
        parentRecordId: schedule.id,
        assignedTo: schedule.assignedTo,
        completedAt: null,
      });
      generated.push(await this.recordRepository.save(child));
      schedule.status = 'Active';
      schedule.dueAt = null;
      await this.recordRepository.save(schedule);
    }
    return Promise.all(generated.map(async (record) => {
      const itemWorkspace = await this.workspaceRepository.findOne({ where: { id: record.workspaceId } });
      return this.recordDto(record, itemWorkspace?.propertyId);
    }));
  }

  async getAnalytics(propertyId?: number) {
    const workspace = propertyId ? await this.workspaceByPropertyId(propertyId) : null;
    const workspaces = workspace ? [workspace] : await this.workspaceRepository.find();
    const workspaceIds = workspaces.map((item) => item.id);
    const records = workspaceIds.length ? await this.recordRepository.find({ where: { workspaceId: In(workspaceIds) } }) : [];
    const publicRecords = records.filter((item) => item.moduleKey === 'public-portals');
    const recordsByModule: Record<string, number> = {};
    const recordsByStatus: Record<string, number> = {};
    for (const record of records) {
      recordsByModule[record.moduleKey] = (recordsByModule[record.moduleKey] ?? 0) + 1;
      recordsByStatus[record.status] = (recordsByStatus[record.status] ?? 0) + 1;
    }
    const now = Date.now();
    const income = records.filter((item) => item.moduleKey === 'finance' && String(item.payload?.direction ?? '').toLowerCase() !== 'expense').reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
    const expense = records.filter((item) => item.moduleKey === 'finance' && String(item.payload?.direction ?? '').toLowerCase() === 'expense').reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
    return {
      importedProperties: workspaces.length,
      totalRecords: records.length,
      openRecords: records.filter((item) => !completedStatuses.has(item.status)).length,
      overdueRecords: records.filter((item) => item.dueAt && item.dueAt.getTime() < now && !completedStatuses.has(item.status)).length,
      completedRecords: records.filter((item) => completedStatuses.has(item.status)).length,
      activePublicLinks: publicRecords.filter((item) => item.status === 'Active').length,
      completedPublicLinks: publicRecords.filter((item) => item.status === 'Completed').length,
      anonymousSubmissions: publicRecords.filter((item) => item.status === 'Submitted').length,
      totalIncome: income,
      totalExpense: expense,
      netOperatingAmount: income - expense,
      occupiedUnits: records.filter((item) => item.moduleKey === 'units' && item.status === 'Occupied').length,
      availableUnits: records.filter((item) => item.moduleKey === 'units' && item.status === 'Available').length,
      maintenanceBacklog: records.filter((item) => ['tickets', 'work-orders'].includes(item.moduleKey) && !completedStatuses.has(item.status)).length,
      pendingQuotes: records.filter((item) => item.moduleKey === 'vendor-quotes' && !completedStatuses.has(item.status)).length,
      recordsByModule,
      recordsByStatus,
    };
  }

  async getAssistant(propertyId?: number) {
    const analytics = await this.getAnalytics(propertyId);
    return {
      summary: `${analytics.importedProperties} properties, ${analytics.openRecords} open records and ${analytics.overdueRecords} overdue items.`,
      recommendations: [
        analytics.overdueRecords ? 'Review overdue operational records.' : 'No overdue operational records.',
        analytics.maintenanceBacklog ? 'Prioritize the maintenance backlog.' : 'Maintenance backlog is clear.',
        analytics.pendingQuotes ? 'Review pending vendor quotes.' : 'No vendor quotes are waiting.',
      ],
      analytics,
    };
  }

  async getActivity(propertyId?: number) {
    const workspace = propertyId ? await this.workspaceByPropertyId(propertyId) : null;
    const records = await this.recordRepository.find({
      where: workspace ? { workspaceId: workspace.id, moduleKey: 'audit' } : { moduleKey: 'audit' },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return records.map((item) => ({
      id: String(item.id), title: item.title, description: item.description,
      createdAt: item.createdAt.toISOString(), payload: item.payload,
    }));
  }

  async getSettings() {
    const agency = await this.settingsService.getAdminSettings();
    const preference = await this.ensurePreferences();
    const profile = agency?.profile ?? {};
    return {
      businessName: String(profile.agencyName ?? 'Property Operations'),
      logoUrl: String(profile.logo ?? ''),
      brandColor: String(profile.brandColor ?? profile.primaryColor ?? '#111827'),
      publicBaseUrl: String(process.env.FRONTEND_URL ?? process.env.APP_URL ?? 'http://localhost:3000'),
      defaultExpiryHours: Number(preference.content.defaultExpiryHours ?? 168),
      defaultMaxUses: Number(preference.content.defaultMaxUses ?? 1),
      defaultOneTime: preference.content.defaultOneTime !== false,
      requireName: preference.content.requireName !== false,
      requireEmail: preference.content.requireEmail === true,
      requirePhone: preference.content.requirePhone === true,
      allowFileUploads: preference.content.allowFileUploads !== false,
      showPropertyAddress: preference.content.showPropertyAddress !== false,
      autoCloseRecordOnSubmit: preference.content.autoCloseRecordOnSubmit === true,
      notifyAdminOnSubmit: preference.content.notifyAdminOnSubmit !== false,
      welcomeMessage: String(preference.content.welcomeMessage ?? 'Please review the request and submit the requested information.'),
      termsText: String(preference.content.termsText ?? ''),
      emailSubjectTemplate: String(preference.content.emailSubjectTemplate ?? 'Property request: {{title}}'),
      emailBodyTemplate: String(preference.content.emailBodyTemplate ?? 'Open this secure link to complete the property request: {{link}}'),
      smsTemplate: String(preference.content.smsTemplate ?? 'Property request: {{title}} {{link}}'),
      updatedAt: preference.updatedAt?.toISOString() ?? new Date(0).toISOString(),
    };
  }

  async updateSettings(input: any) {
    const preference = await this.ensurePreferences();
    const allowed = [
      'defaultExpiryHours', 'defaultMaxUses', 'defaultOneTime', 'requireName', 'requireEmail',
      'requirePhone', 'allowFileUploads', 'showPropertyAddress', 'autoCloseRecordOnSubmit',
      'notifyAdminOnSubmit', 'welcomeMessage', 'termsText', 'emailSubjectTemplate',
      'emailBodyTemplate', 'smsTemplate',
    ];
    preference.content = allowed.reduce((result, key) => {
      if (input?.[key] !== undefined) result[key] = input[key];
      else if (preference.content?.[key] !== undefined) result[key] = preference.content[key];
      return result;
    }, {} as Record<string, unknown>);
    await this.preferencesRepository.save(preference);
    return this.getSettings();
  }

  async workspaceByPropertyId(propertyId: number) {
    if (!Number.isInteger(propertyId) || propertyId <= 0) throw new BadRequestException('A valid property ID is required.');
    const workspace = await this.workspaceRepository.findOne({ where: { propertyId } });
    if (!workspace) throw new NotFoundException('Import this property into Property Operations first.');
    return workspace;
  }

  async workspaceById(id: number) {
    const workspace = await this.workspaceRepository.findOne({ where: { id } });
    if (!workspace) throw new NotFoundException('Property Operations workspace was not found.');
    return workspace;
  }

  recordDto(record: PropertyOperationsRecord, propertyId?: number) {
    return {
      id: String(record.id),
      propertyId,
      moduleKey: record.moduleKey,
      recordType: record.recordType,
      title: record.title,
      description: record.description,
      status: record.status,
      priority: record.priority,
      contactName: record.contactName,
      contactEmail: record.contactEmail,
      contactPhone: record.contactPhone,
      amount: record.amount == null ? null : Number(record.amount),
      dueAt: record.dueAt?.toISOString() ?? null,
      attachments: record.attachments ?? [],
      payload: record.payload ?? {},
      payloadJson: JSON.stringify(record.payload ?? {}),
      assignedTo: record.assignedTo,
      completedAt: record.completedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private workspaceDto(workspace: PropertyOperationsWorkspace, states: PropertyOperationsModuleState[]) {
    const snapshot: any = workspace.propertySnapshot ?? {};
    return {
      id: String(workspace.id),
      propertyId: workspace.propertyId,
      status: workspace.status,
      propertyTitle: String(snapshot.title ?? `Property ${workspace.propertyId}`),
      propertyLocation: String(snapshot.location ?? ''),
      propertyType: String(snapshot.propertyType ?? ''),
      listingType: String(snapshot.listingType ?? ''),
      propertyStatus: String(snapshot.propertyStatus ?? ''),
      propertySlug: String(snapshot.propertySlug ?? ''),
      thumbnailUrl: String(snapshot.thumbnailUrl ?? ''),
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
      moduleStates: states.map((state) => this.moduleStateDto(state)),
    };
  }

  private moduleStateDto(state: PropertyOperationsModuleState) {
    return {
      id: String(state.id), moduleKey: state.moduleKey, status: state.status,
      notes: state.notes, updatedAt: state.updatedAt.toISOString(),
    };
  }

  private async ensurePreferences() {
    let preference = await this.preferencesRepository.findOne({ where: { id: 1 } });
    if (!preference) {
      preference = this.preferencesRepository.create({ id: 1, content: {} });
      preference = await this.preferencesRepository.save(preference);
    }
    return preference;
  }

  private async addActivity(title: string, description: string, workspaceId?: number, recordId?: number) {
    let targetWorkspaceId = workspaceId;
    if (!targetWorkspaceId) {
      const first = await this.workspaceRepository.findOne({ order: { id: 'ASC' } });
      if (!first) return;
      targetWorkspaceId = first.id;
    }
    await this.recordRepository.save(this.recordRepository.create({
      workspaceId: targetWorkspaceId,
      moduleKey: 'audit',
      recordType: 'Activity',
      title,
      description,
      status: 'Completed',
      priority: 'Normal',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      contactLabel: '',
      amount: null,
      dueAt: null,
      attachments: [],
      payload: recordId ? { recordId } : {},
      recurrence: null,
      parentRecordId: recordId ?? null,
      assignedTo: '',
      completedAt: new Date(),
    }));
  }
}
