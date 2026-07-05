import { EntitySchema } from 'typeorm';

export type ModuleStateRow = {
  id: number;
  workspaceId: number;
  moduleKey: string;
  status: string;
  notes: string;
  updatedAt: Date;
};

export type OperationsRecordRow = {
  id: number;
  workspaceId: number;
  moduleKey: string;
  recordType: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactLabel: string;
  amount: string | null;
  dueAt: Date | null;
  attachments: string[];
  payload: Record<string, unknown>;
  recurrence: Record<string, unknown> | null;
  parentRecordId: number | null;
  assignedTo: string;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const ModuleStateEntity = new EntitySchema<ModuleStateRow>({
  name: 'ModuleStateRow',
  tableName: 'property_operations_module_state',
  uniques: [{ columns: ['workspaceId', 'moduleKey'] }],
  columns: {
    id: { type: Number, primary: true, generated: true },
    workspaceId: { name: 'workspace_id', type: Number },
    moduleKey: { name: 'module_key', type: String, length: 80 },
    status: { type: String, length: 40, default: 'Not started' },
    notes: { type: 'text', default: '' },
    updatedAt: { name: 'updated_at', type: 'timestamptz', updateDate: true },
  },
});

export const OperationsRecordEntity = new EntitySchema<OperationsRecordRow>({
  name: 'OperationsRecordRow',
  tableName: 'property_operations_record',
  indices: [
    { columns: ['workspaceId', 'moduleKey'] },
    { columns: ['status'] },
    { columns: ['dueAt'] },
  ],
  columns: {
    id: { type: Number, primary: true, generated: true },
    workspaceId: { name: 'workspace_id', type: Number },
    moduleKey: { name: 'module_key', type: String, length: 80 },
    recordType: { name: 'record_type', type: String, length: 80, default: 'Item' },
    title: { type: String, length: 240 },
    description: { type: 'text', default: '' },
    status: { type: String, length: 60, default: 'Open' },
    priority: { type: String, length: 40, default: 'Normal' },
    contactName: { name: 'contact_name', type: String, length: 160, default: '' },
    contactEmail: { name: 'contact_email', type: String, length: 240, default: '' },
    contactPhone: { name: 'contact_phone', type: String, length: 80, default: '' },
    contactLabel: { name: 'contact_label', type: String, length: 120, default: '' },
    amount: { type: 'numeric', precision: 18, scale: 2, nullable: true },
    dueAt: { name: 'due_at', type: 'timestamptz', nullable: true },
    attachments: { type: 'jsonb', default: [] },
    payload: { name: 'payload_json', type: 'jsonb', default: {} },
    recurrence: { name: 'recurrence_json', type: 'jsonb', nullable: true },
    parentRecordId: { name: 'parent_record_id', type: Number, nullable: true },
    assignedTo: { name: 'assigned_to', type: String, length: 240, default: '' },
    completedAt: { name: 'completed_at', type: 'timestamptz', nullable: true },
    createdAt: { name: 'created_at', type: 'timestamptz', createDate: true },
    updatedAt: { name: 'updated_at', type: 'timestamptz', updateDate: true },
  },
});
