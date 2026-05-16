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

  @Column({
    type: 'enum',
    enum: AuditEntityType,
  })
  entityType: AuditEntityType;

  @Column()
  entityId: number;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({ nullable: true })
  fieldName: string;

  @Column({ type: 'text', nullable: true })
  oldValue: string;

  @Column({ type: 'text', nullable: true })
  newValue: string;

  @Column()
  actor: string;

  @Column({ nullable: true })
  actorUserId: number;

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn()
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

  @Column({
    type: 'enum',
    enum: ['ContactForm', 'PropertyChat', 'ScheduleViewing'],
  })
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
