import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('property_operations_workspace')
export class PropertyOperationsWorkspace {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'int' })
  propertyId: number;

  @Column({ default: 'Active' })
  status: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  propertySnapshot: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

@Entity('property_operations_module_state')
@Index(['workspaceId', 'moduleKey'], { unique: true })
export class PropertyOperationsModuleState {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  workspaceId: number;

  @Column({ length: 80 })
  moduleKey: string;

  @Column({ length: 40, default: 'Not started' })
  status: string;

  @Column({ type: 'text', default: '' })
  notes: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

@Entity('property_operations_record')
@Index(['workspaceId', 'moduleKey'])
@Index(['status'])
@Index(['dueAt'])
export class PropertyOperationsRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  workspaceId: number;

  @Column({ length: 80 })
  moduleKey: string;

  @Column({ length: 80, default: 'Item' })
  recordType: string;

  @Column({ length: 240 })
  title: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ length: 60, default: 'Open' })
  status: string;

  @Column({ length: 40, default: 'Normal' })
  priority: string;

  @Column({ length: 160, default: '' })
  contactName: string;

  @Column({ length: 240, default: '' })
  contactEmail: string;

  @Column({ length: 80, default: '' })
  contactPhone: string;

  @Column({ length: 120, default: '' })
  contactLabel: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true })
  amount: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  dueAt: Date | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  attachments: string[];

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  payload: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  recurrence: Record<string, unknown> | null;

  @Column({ type: 'int', nullable: true })
  parentRecordId: number | null;

  @Column({ length: 240, default: '' })
  assignedTo: string;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

@Entity('property_operations_public_access')
@Index(['tokenHash'], { unique: true })
export class PropertyOperationsPublicAccess {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  workspaceId: number;

  @Column({ type: 'int', nullable: true })
  recordId: number | null;

  @Column({ length: 80 })
  moduleKey: string;

  @Column({ length: 64 })
  tokenHash: string;

  @Column({ length: 240 })
  title: string;

  @Column({ type: 'text', default: '' })
  instructions: string;

  @Column({ length: 120, default: '' })
  recipientLabel: string;

  @Column({ length: 160, default: '' })
  recipientName: string;

  @Column({ length: 240, default: '' })
  recipientEmail: string;

  @Column({ length: 80, default: '' })
  recipientPhone: string;

  @Column({ length: 40, default: 'Active' })
  status: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  formSchema: unknown[];

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'int', default: 1 })
  maxUses: number;

  @Column({ type: 'int', default: 0 })
  useCount: number;

  @Column({ default: true })
  oneTime: boolean;

  @Column({ default: true })
  allowFileUploads: boolean;

  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true })
  paymentAmount: string | null;

  @Column({ length: 12, default: 'USD' })
  paymentCurrency: string;

  @Column({ default: false })
  paymentVerified: boolean;

  @Column({ length: 120, nullable: true })
  paymentSessionId: string | null;

  @Column({ length: 64, nullable: true })
  paymentTokenHash: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastAccessedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}

@Entity('property_operations_submission')
export class PropertyOperationsSubmission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  accessId: number;

  @Column({ length: 160, default: '' })
  responderName: string;

  @Column({ length: 240, default: '' })
  responderEmail: string;

  @Column({ length: 80, default: '' })
  responderPhone: string;

  @Column({ type: 'text', default: '' })
  notes: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  response: Record<string, unknown>;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  attachmentUrls: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

@Entity('property_operations_preferences')
export class PropertyOperationsPreferences {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  content: Record<string, unknown>;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
