import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Repository } from 'typeorm';
import { SettingsService } from '../settings/settings.service';
import {
  PropertyOperationsModuleState,
  PropertyOperationsPreferences,
  PropertyOperationsPublicAccess,
  PropertyOperationsRecord,
  PropertyOperationsSubmission,
  PropertyOperationsWorkspace,
} from './property-operations.entity';
import { PropertyOperationsIntegrationService } from './property-operations-integration.service';

export const PROPERTY_OPERATIONS_MODULES = [
  'portfolio', 'units', 'tenants', 'leases', 'staff', 'technicians', 'vendors', 'vendor-quotes',
  'tickets', 'work-orders', 'recurring-maintenance', 'inspections', 'assets', 'billing',
  'finance', 'subscriptions', 'messages', 'announcements', 'notifications', 'documents',
  'public-portals', 'organization', 'users', 'property-health', 'plans', 'audit', 'analytics', 'ai',
] as const;

const moduleCatalog: Record<string, { label: string; category: string; recordTypes: string[] }> = {
  portfolio: { label: 'Portfolio', category: 'Portfolio', recordTypes: ['Property note', 'Ownership update', 'Occupancy update', 'Compliance item', 'Insurance item'] },
  units: { label: 'Units', category: 'Portfolio', recordTypes: ['Unit', 'Availability', 'Move-in', 'Move-out', 'Unit charge', 'Unit condition'] },
  tenants: { label: 'Residents', category: 'People', recordTypes: ['Resident', 'Move-in', 'Move-out', 'Emergency contact', 'Resident request', 'Activity history'] },
  leases: { label: 'Leases', category: 'Portfolio', recordTypes: ['Lease', 'Lease renewal', 'Lease amendment', 'Move-in agreement', 'Move-out agreement', 'Deposit record'] },
  staff: { label: 'Staff', category: 'People', recordTypes: ['Staff profile', 'Assignment', 'Shift', 'Payment', 'Performance note'] },
  technicians: { label: 'Technicians & Workers', category: 'People', recordTypes: ['Technician', 'Worker', 'Assignment', 'Availability', 'Completion report'] },
  vendors: { label: 'Vendors', category: 'People', recordTypes: ['Vendor', 'Service agreement', 'Insurance', 'Performance review', 'Vendor contact'] },
  'vendor-quotes': { label: 'Vendor Quotes', category: 'Maintenance', recordTypes: ['Quote request', 'Vendor quote', 'Quote comparison', 'Approval', 'Rejection'] },
  tickets: { label: 'Tickets', category: 'Maintenance', recordTypes: ['Maintenance request', 'Repair issue', 'Emergency issue', 'Complaint', 'Service request'] },
  'work-orders': { label: 'Work Orders', category: 'Maintenance', recordTypes: ['Work order', 'Labor entry', 'Material entry', 'Completion report', 'Change order'] },
  'recurring-maintenance': { label: 'Recurring Maintenance', category: 'Maintenance', recordTypes: ['Maintenance schedule', 'Checklist', 'Generated task', 'Service cycle', 'Reminder'] },
  inspections: { label: 'Inspections', category: 'Maintenance', recordTypes: ['Move-in inspection', 'Move-out inspection', 'Routine inspection', 'Safety inspection', 'Follow-up'] },
  assets: { label: 'Assets', category: 'Maintenance', recordTypes: ['Asset', 'Warranty', 'Service history', 'Condition review', 'Replacement plan'] },
  billing: { label: 'Billing', category: 'Finance', recordTypes: ['Rent charge', 'Utility charge', 'Late fee', 'Payment', 'Credit', 'Refund'] },
  finance: { label: 'Finance', category: 'Finance', recordTypes: ['Income', 'Expense', 'Deposit', 'Withdrawal', 'Budget item', 'Reconciliation'] },
  subscriptions: { label: 'Service Contracts & Utilities', category: 'Finance', recordTypes: ['Utility service', 'Service contract', 'Insurance renewal', 'Recurring operating cost'] },
  messages: { label: 'Messages', category: 'Communication', recordTypes: ['Incoming message', 'Outgoing message', 'Conversation note', 'Follow-up'] },
  announcements: { label: 'Announcements', category: 'Communication', recordTypes: ['Property notice', 'Emergency notice', 'Service interruption', 'Event', 'Policy update'] },
  notifications: { label: 'Notifications', category: 'Communication', recordTypes: ['Email template', 'SMS template', 'Reminder rule', 'Delivery log', 'Escalation rule'] },
  documents: { label: 'Documents', category: 'Documents', recordTypes: ['Property plan', 'Contract', 'Lease document', 'Compliance document', 'Generated document'] },
  'public-portals': { label: 'Public Portals', category: 'Portals', recordTypes: ['Public form', 'Checkout request', 'Quote request', 'Information request', 'Anonymous submission'] },
  organization: { label: 'Organization', category: 'Administration', recordTypes: ['Setting change', 'Brand asset', 'Integration note', 'Policy', 'Operational preference'] },
  users: { label: 'Users & Access', category: 'Administration', recordTypes: ['User account', 'Role assignment', 'Property assignment', 'Access request', 'Login event', 'Session review'] },
  'property-health': { label: 'Property Health', category: 'Insights', recordTypes: ['Health score', 'Safety risk', 'Compliance gap', 'Deferred maintenance', 'Insurance risk', 'Capital planning item'] },
  plans: { label: 'Operations Plans', category: 'Insights', recordTypes: ['Operations plan', 'Maintenance roadmap', 'Capital plan', 'Milestone', 'Plan phase'] },
  audit: { label: 'Audit', category: 'Administration', recordTypes: ['Activity', 'Change log', 'Access event', 'Submission event', 'Exception'] },
  analytics: { label: 'Analytics', category: 'Insights', recordTypes: ['KPI snapshot', 'Occupancy report', 'Maintenance report', 'Finance report', 'Service report'] },
  ai: { label: 'AI Assistant', category: 'Insights', recordTypes: ['AI summary', 'Suggested priority', 'Risk note', 'Draft response', 'Operational recommendation'] },
};

const completedStatuses = new Set(['Completed', 'Closed', 'Paid', 'Resolved', 'Archived', 'Cancelled', 'Rejected']);

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
    @InjectRepository(PropertyOperationsPublicAccess)
    private readonly accessRepository: Repository<PropertyOperationsPublicAccess>,
    @InjectRepository(PropertyOperationsSubmission)
    private readonly submissionRepository: Repository<PropertyOperationsSubmission>,
    private readonly settingsService: SettingsService,
    private readonly integrations: PropertyOperationsIntegrationService,
  ) {}

  listModules() {
    return PROPERTY_OPERATIONS_MODULES.map((id) => ({ id, ...moduleCatalog[id] }));
  }

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
    if (!Array.isArray(properties) || !properties.length) throw new BadRequestException('At least one property is required.');
    let imported = 0;
    for (const property of properties) {
      const propertyId = Number(property?.propertyId);
      if (!Number.isInteger(propertyId) || propertyId <= 0) continue;
      let workspace = await this.workspaceRepository.findOne({ where: { propertyId } });
      if (!workspace) workspace = this.workspaceRepository.create({ propertyId, status: 'Active', propertySnapshot: property });
      else Object.assign(workspace, { status: 'Active', propertySnapshot: property });
      workspace = await this.workspaceRepository.save(workspace);
      const existing = await this.moduleStateRepository.find({ where: { workspaceId: workspace.id } });
      const existingKeys = new Set(existing.map((item) => item.moduleKey));
      const missing = PROPERTY_OPERATIONS_MODULES
        .filter((moduleKey) => !existingKeys.has(moduleKey))
        .map((moduleKey) => this.moduleStateRepository.create({ workspaceId: workspace.id, moduleKey, status: 'Not started', notes: '' }));
      if (missing.length) await this.moduleStateRepository.save(missing);
      imported++;
    }
    await this.logActivity('Properties imported', `${imported} property snapshot(s) imported.`);
    return this.listWorkspaces();
  }

  async removeWorkspace(propertyId: number) {
    const workspace = await this.workspaceByPropertyId(propertyId);
    const accesses = await this.accessRepository.find({ where: { workspaceId: workspace.id } });
    if (accesses.length) await this.submissionRepository.delete({ accessId: In(accesses.map((item) => item.id)) });
    await this.accessRepository.delete({ workspaceId: workspace.id });
    await this.recordRepository.delete({ workspaceId: workspace.id });
    await this.moduleStateRepository.delete({ workspaceId: workspace.id });
    await this.workspaceRepository.delete(workspace.id);
    return { message: 'Property Operations workspace removed.' };
  }

  async updateModuleState(input: any) {
    const workspace = await this.workspaceByPropertyId(Number(input?.propertyId));
    const moduleKey = String(input?.moduleKey ?? '');
    if (!PROPERTY_OPERATIONS_MODULES.includes(moduleKey as any)) throw new BadRequestException('Unknown Property Operations module.');
    let state = await this.moduleStateRepository.findOne({ where: { workspaceId: workspace.id, moduleKey } });
    if (!state) state = this.moduleStateRepository.create({ workspaceId: workspace.id, moduleKey });
    state.status = String(input?.status ?? 'Not started');
    state.notes = String(input?.notes ?? '');
    const saved = await this.moduleStateRepository.save(state);
    await this.logActivity('Module updated', `${moduleKey} changed to ${saved.status}.`, workspace.id);
    return this.moduleStateDto(saved);
  }

  async listRecords(propertyId: number, moduleKey?: string) {
    const workspace = await this.workspaceByPropertyId(propertyId);
    const records = await this.recordRepository.find({
      where: moduleKey ? { workspaceId: workspace.id, moduleKey } : { workspaceId: workspace.id },
      order: { dueAt: 'ASC', updatedAt: 'DESC' },
    });
    return records.filter((item) => item.recordType !== 'Activity').map((record) => this.recordDto(record, workspace.propertyId));
  }

  async saveRecord(input: any) {
    const workspace = await this.workspaceByPropertyId(Number(input?.propertyId));
    const id = Number(input?.id);
    let record = Number.isInteger(id) && id > 0
      ? await this.recordRepository.findOne({ where: { id, workspaceId: workspace.id } })
      : null;
    if (id && !record) throw new NotFoundException('Property Operations record was not found.');
    if (!record) record = this.recordRepository.create({ workspaceId: workspace.id });
    const moduleKey = String(input?.moduleKey ?? 'portfolio');
    if (!PROPERTY_OPERATIONS_MODULES.includes(moduleKey as any)) throw new BadRequestException('Unknown Property Operations module.');
    record.moduleKey = moduleKey;
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
    record.payload = input?.payload && typeof input.payload === 'object' ? input.payload : record.payload ?? {};
    record.recurrence = input?.recurrence && typeof input.recurrence === 'object' ? input.recurrence : record.recurrence ?? null;
    record.parentRecordId = input?.parentRecordId ? Number(input.parentRecordId) : record.parentRecordId ?? null;
    record.assignedTo = String(input?.assignedTo ?? record.assignedTo ?? '');
    record.completedAt = completedStatuses.has(record.status) ? record.completedAt ?? new Date() : null;
    const saved = await this.recordRepository.save(record);
    await this.logActivity('Record saved', `${saved.moduleKey}: ${saved.title}`, workspace.id, saved.id);
    return this.recordDto(saved, workspace.propertyId);
  }

  async deleteRecord(id: number) {
    const record = await this.recordRepository.findOne({ where: { id } });
    if (!record) throw new NotFoundException('Property Operations record was not found.');
    await this.recordRepository.delete(id);
    await this.logActivity('Record deleted', `${record.moduleKey}: ${record.title}`, record.workspaceId, record.id);
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
    const nextStatus = String(input?.status ?? statuses[action] ?? '');
    if (!nextStatus) throw new BadRequestException('Unknown workflow action.');
    record.status = nextStatus;
    if (input?.assignedTo != null) record.assignedTo = String(input.assignedTo);
    if (input?.payload && typeof input.payload === 'object') record.payload = { ...(record.payload ?? {}), ...input.payload };
    record.completedAt = completedStatuses.has(nextStatus) ? new Date() : null;
    const saved = await this.recordRepository.save(record);
    await this.logActivity('Workflow action', `${action}: ${saved.title}`, saved.workspaceId, saved.id, { status: nextStatus, note: input?.note });
    const workspace = await this.workspaceRepository.findOne({ where: { id: saved.workspaceId } });
    return this.recordDto(saved, workspace?.propertyId);
  }

  async deliverRecord(id: number, channel: string) {
    const record = await this.recordRepository.findOne({ where: { id } });
    if (!record) throw new NotFoundException('Property Operations record was not found.');
    try {
      const delivery = await this.integrations.deliver(record, channel);
      record.status = 'Sent';
      record.payload = { ...(record.payload ?? {}), ...delivery };
      const saved = await this.recordRepository.save(record);
      await this.logActivity('Notification sent', `${channel}: ${saved.title}`, saved.workspaceId, saved.id, delivery);
      const workspace = await this.workspaceRepository.findOne({ where: { id: saved.workspaceId } });
      return this.recordDto(saved, workspace?.propertyId);
    } catch (error) {
      record.status = 'Failed';
      record.payload = { ...(record.payload ?? {}), deliveryChannel: channel, deliveryError: error instanceof Error ? error.message : 'Delivery failed' };
      await this.recordRepository.save(record);
      throw error;
    }
  }

  async runRecurring(propertyId?: number) {
    const workspace = propertyId ? await this.workspaceByPropertyId(propertyId) : null;
    const schedules = await this.recordRepository.find({
      where: {
        moduleKey: 'recurring-maintenance',
        dueAt: LessThanOrEqual(new Date()),
        ...(workspace ? { workspaceId: workspace.id } : {}),
      },
    });
    const generated: PropertyOperationsRecord[] = [];
    for (const schedule of schedules.filter((item) => ['Active', 'Due', 'Scheduled', 'Overdue'].includes(item.status))) {
      const intervalDays = Math.max(1, Number(schedule.recurrence?.intervalDays ?? schedule.payload?.intervalDays ?? 30));
      const child = await this.recordRepository.save(this.recordRepository.create({
        workspaceId: schedule.workspaceId,
        moduleKey: 'work-orders',
        recordType: 'Generated work order',
        title: schedule.title,
        description: schedule.description,
        status: 'Scheduled',
        priority: schedule.priority,
        contactName: schedule.contactName,
        contactEmail: schedule.contactEmail,
        contactPhone: schedule.contactPhone,
        contactLabel: schedule.contactLabel,
        amount: schedule.amount,
        dueAt: new Date(),
        attachments: schedule.attachments ?? [],
        payload: { generatedFromRecurringMaintenance: schedule.id, checklist: schedule.payload?.checklist ?? [] },
        recurrence: null,
        parentRecordId: schedule.id,
        assignedTo: schedule.assignedTo,
        completedAt: null,
      }));
      generated.push(child);
      schedule.status = 'Active';
      schedule.dueAt = new Date(Date.now() + intervalDays * 86_400_000);
      await this.recordRepository.save(schedule);
    }
    return Promise.all(generated.map(async (record) => {
      const itemWorkspace = await this.workspaceRepository.findOne({ where: { id: record.workspaceId } });
      return this.recordDto(record, itemWorkspace?.propertyId);
    }));
  }

  async runAutomation() {
    const now = new Date();
    const records = await this.recordRepository.find();
    const overdue = records.filter((item) => item.dueAt && item.dueAt < now && !completedStatuses.has(item.status) && item.status !== 'Overdue');
    for (const record of overdue) record.status = 'Overdue';
    if (overdue.length) await this.recordRepository.save(overdue);
    const generated = await this.runRecurring();
    const expiring = await this.accessRepository.find({ where: { status: 'Active', expiresAt: LessThanOrEqual(now) } });
    for (const access of expiring) access.status = 'Expired';
    if (expiring.length) await this.accessRepository.save(expiring);
    await this.logActivity('Automation run', `Marked ${overdue.length} records overdue, generated ${generated.length} work orders, and expired ${expiring.length} public links.`);
    return { overdue: overdue.length, generated: generated.length, expiredLinks: expiring.length };
  }

  async getAnalytics(propertyId?: number) {
    const workspace = propertyId ? await this.workspaceByPropertyId(propertyId) : null;
    const workspaces = workspace ? [workspace] : await this.workspaceRepository.find();
    const workspaceIds = workspaces.map((item) => item.id);
    const records = workspaceIds.length ? await this.recordRepository.find({ where: { workspaceId: In(workspaceIds) } }) : [];
    const accesses = workspaceIds.length ? await this.accessRepository.find({ where: { workspaceId: In(workspaceIds) } }) : [];
    const submissions = accesses.length ? await this.submissionRepository.find({ where: { accessId: In(accesses.map((item) => item.id)) } }) : [];
    const operationalRecords = records.filter((item) => item.recordType !== 'Activity');
    const recordsByModule: Record<string, number> = {};
    const recordsByStatus: Record<string, number> = {};
    for (const record of operationalRecords) {
      recordsByModule[record.moduleKey] = (recordsByModule[record.moduleKey] ?? 0) + 1;
      recordsByStatus[record.status] = (recordsByStatus[record.status] ?? 0) + 1;
    }
    const now = Date.now();
    const finance = operationalRecords.filter((item) => item.moduleKey === 'finance');
    const income = finance.filter((item) => !/expense|withdrawal|refund/i.test(`${item.recordType} ${String(item.payload?.direction ?? '')}`)).reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
    const expense = finance.filter((item) => /expense|withdrawal|refund/i.test(`${item.recordType} ${String(item.payload?.direction ?? '')}`)).reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
    return {
      importedProperties: workspaces.length,
      totalRecords: operationalRecords.length,
      openRecords: operationalRecords.filter((item) => !completedStatuses.has(item.status)).length,
      overdueRecords: operationalRecords.filter((item) => item.dueAt && item.dueAt.getTime() < now && !completedStatuses.has(item.status)).length,
      completedRecords: operationalRecords.filter((item) => completedStatuses.has(item.status)).length,
      activePublicLinks: accesses.filter((item) => item.status === 'Active' && item.expiresAt.getTime() > now).length,
      completedPublicLinks: accesses.filter((item) => item.status === 'Completed').length,
      anonymousSubmissions: submissions.length,
      totalIncome: income,
      totalExpense: expense,
      netOperatingAmount: income - expense,
      occupiedUnits: operationalRecords.filter((item) => item.moduleKey === 'units' && item.status === 'Occupied').length,
      availableUnits: operationalRecords.filter((item) => item.moduleKey === 'units' && ['Available', 'Open'].includes(item.status)).length,
      maintenanceBacklog: operationalRecords.filter((item) => ['tickets', 'work-orders'].includes(item.moduleKey) && !completedStatuses.has(item.status)).length,
      pendingQuotes: operationalRecords.filter((item) => item.moduleKey === 'vendor-quotes' && !['Approved', 'Rejected', 'Expired'].includes(item.status)).length,
      recordsByModule,
      recordsByStatus,
    };
  }

  async getAssistant(propertyId?: number) {
    const analytics = await this.getAnalytics(propertyId);
    const workspace = propertyId ? await this.workspaceByPropertyId(propertyId) : null;
    const records = await this.recordRepository.find({ where: workspace ? { workspaceId: workspace.id } : {} });
    const urgentItems = records
      .filter((item) => item.recordType !== 'Activity' && !completedStatuses.has(item.status) && (item.priority === 'Urgent' || item.status === 'Overdue' || (item.dueAt && item.dueAt < new Date())))
      .sort((a, b) => (a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER))
      .slice(0, 10)
      .map((item) => this.recordDto(item));
    const recommendations: string[] = [];
    if (analytics.overdueRecords) recommendations.push(`Review ${analytics.overdueRecords} overdue operational items.`);
    if (analytics.maintenanceBacklog) recommendations.push(`Prioritize ${analytics.maintenanceBacklog} open tickets and work orders.`);
    if (analytics.pendingQuotes) recommendations.push(`Compare and decide on ${analytics.pendingQuotes} pending vendor quotes.`);
    if (analytics.totalExpense > analytics.totalIncome) recommendations.push('Expenses exceed recorded income; review the financial ledger.');
    if (!recommendations.length) recommendations.push('No immediate operational risks were detected.');
    return {
      generatedAt: new Date().toISOString(),
      summary: `${analytics.importedProperties} properties, ${analytics.openRecords} open records and ${analytics.overdueRecords} overdue items.`,
      recommendations,
      urgentItems,
      analytics,
    };
  }

  async getActivity(propertyId?: number) {
    const workspace = propertyId ? await this.workspaceByPropertyId(propertyId) : null;
    const records = await this.recordRepository.find({
      where: workspace ? { workspaceId: workspace.id, moduleKey: 'audit' } : { moduleKey: 'audit' },
      order: { createdAt: 'DESC' },
      take: 500,
    });
    return records.map((item) => ({
      id: String(item.id),
      summary: item.title,
      title: item.title,
      description: item.description,
      moduleKey: String(item.payload?.sourceModule ?? ''),
      action: String(item.payload?.action ?? ''),
      createdAt: item.createdAt.toISOString(),
      payload: item.payload,
    }));
  }

  async getSettings() {
    const agency = await this.settingsService.getAdminSettings();
    const preference = await this.ensurePreferences();
    const profile = agency?.profile ?? {};
    const legacyProfile = profile as typeof profile & {
      brandColor?: unknown;
      primaryColor?: unknown;
      currency?: unknown;
    };
    const legacyAgency = agency as typeof agency & { currency?: unknown };
    return {
      businessName: String(profile.agencyName ?? 'Property Operations'),
      logoUrl: String(profile.logo?.url ?? ''),
      brandColor: String(legacyProfile.brandColor ?? legacyProfile.primaryColor ?? '#111827'),
      publicBaseUrl: String(process.env.FRONTEND_URL ?? process.env.APP_URL ?? 'http://localhost:3000'),
      currency: String(legacyProfile.currency ?? legacyAgency.currency ?? 'USD').toUpperCase(),
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
      sharedFromMainDashboard: true,
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
    await this.logActivity('Preferences updated', 'Property Operations preferences updated.');
    return this.getSettings();
  }

  paymentProviderStatus() { return this.integrations.getPaymentStatus(); }
  updatePaymentProvider(input: any) { return this.integrations.updatePaymentConfig(input); }

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
      id: String(record.id), propertyId, moduleKey: record.moduleKey, recordType: record.recordType,
      title: record.title, description: record.description, status: record.status, priority: record.priority,
      contactName: record.contactName, contactEmail: record.contactEmail, contactPhone: record.contactPhone,
      contactLabel: record.contactLabel, amount: record.amount == null ? null : Number(record.amount),
      dueAt: record.dueAt?.toISOString() ?? null, attachments: record.attachments ?? [],
      payload: record.payload ?? {}, payloadJson: JSON.stringify(record.payload ?? {}), recurrence: record.recurrence,
      parentRecordId: record.parentRecordId == null ? null : String(record.parentRecordId),
      assignedTo: record.assignedTo, completedAt: record.completedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(),
    };
  }

  async logActivity(title: string, description: string, workspaceId?: number, recordId?: number, metadata: Record<string, unknown> = {}) {
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
      contactName: '', contactEmail: '', contactPhone: '', contactLabel: '', amount: null, dueAt: null,
      attachments: [],
      payload: { sourceModule: metadata.sourceModule ?? '', action: metadata.action ?? title, recordId: recordId ?? null, ...metadata },
      recurrence: null,
      parentRecordId: recordId ?? null,
      assignedTo: '',
      completedAt: new Date(),
    }));
  }

  private workspaceDto(workspace: PropertyOperationsWorkspace, states: PropertyOperationsModuleState[]) {
    const snapshot: any = workspace.propertySnapshot ?? {};
    return {
      id: String(workspace.id), propertyId: workspace.propertyId, status: workspace.status,
      propertyTitle: String(snapshot.title ?? `Property ${workspace.propertyId}`),
      propertyLocation: String(snapshot.location ?? ''), propertyType: String(snapshot.propertyType ?? ''),
      listingType: String(snapshot.listingType ?? ''), propertyStatus: String(snapshot.propertyStatus ?? snapshot.status ?? ''),
      propertySlug: String(snapshot.propertySlug ?? snapshot.slug ?? ''), thumbnailUrl: String(snapshot.thumbnailUrl ?? ''),
      createdAt: workspace.createdAt.toISOString(), updatedAt: workspace.updatedAt.toISOString(),
      moduleStates: states.map((state) => this.moduleStateDto(state)),
    };
  }

  private moduleStateDto(state: PropertyOperationsModuleState) {
    return { id: String(state.id), moduleKey: state.moduleKey, status: state.status, notes: state.notes, updatedAt: state.updatedAt.toISOString() };
  }

  private async ensurePreferences() {
    let preference = await this.preferencesRepository.findOne({ where: { id: 1 } });
    if (!preference) preference = await this.preferencesRepository.save(this.preferencesRepository.create({ id: 1, content: {} }));
    return preference;
  }
}
