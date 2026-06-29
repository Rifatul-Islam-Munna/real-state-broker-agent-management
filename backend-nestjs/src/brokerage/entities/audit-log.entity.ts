import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
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

  @Column({ type: 'text' })
  entityType: AuditEntityType;

  @Column({ nullable: true })
  entityId: number | null;

  @Column({ type: 'text' })
  action: AuditAction;

  @Column({ type: 'text' })
  fieldName: string;

  @Column({ type: 'text' })
  oldValue: string;

  @Column({ type: 'text' })
  newValue: string;

  @Column({ type: 'text' })
  actor: string;

  @Column({ type: 'text' })
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

  @Column({ nullable: true })
  leadId: number;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'text' })
  source: 'ContactForm' | 'PropertyChat' | 'ScheduleViewing';

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ default: 'New' })
  status: string;

  @Column({ nullable: true })
  convertedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
