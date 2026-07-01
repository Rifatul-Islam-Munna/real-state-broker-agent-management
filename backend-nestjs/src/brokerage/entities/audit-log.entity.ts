import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  Create = 'Create',
  Update = 'Update',
  Delete = 'Delete',
  Approve = 'Approve',
  Reject = 'Reject',
  StatusChange = 'StatusChange',
}

export enum AuditEntityType {
  Lead = 'Lead',
  Property = 'Property',
  Deal = 'Deal',
  Showing = 'Showing',
  Approval = 'Approval',
  Commission = 'Commission',
}

@Entity('brokerage_audit_log')
@Index(['entityType', 'entityId'])
@Index(['createdAt'])
@Index(['actor'])
export class BrokerageAuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', default: '' })
  entityType: AuditEntityType;

  @Column({ type: 'int', nullable: true })
  entityId: number | null;

  @Column({ type: 'text', default: '' })
  action: AuditAction;

  @Column({ type: 'text', default: '' })
  fieldName: string;

  @Column({ type: 'text', default: '' })
  oldValue: string;

  @Column({ type: 'text', default: '' })
  newValue: string;

  @Column({ type: 'text', default: '' })
  actor: string;

  @Column({ type: 'text', default: '' })
  note: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

@Entity('website_inquiry')
@Index(['leadId'])
@Index(['status'])
@Index(['source'])
@Index(['createdAt'])
export class WebsiteInquiry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  leadId: number | null;

  @Column({ default: '' })
  name: string;

  @Column({ default: '' })
  email: string;

  @Column({ type: 'text', nullable: true })
  phone: string | null;

  @Column({ type: 'text', default: 'ContactForm' })
  source: 'ContactForm' | 'PropertyChat' | 'ScheduleViewing';

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ default: 'New' })
  status: string;

  @Column({ type: 'timestamptz', nullable: true })
  convertedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
