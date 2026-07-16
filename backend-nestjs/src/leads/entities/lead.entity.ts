import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Property } from '../../properties/entities/property.entity';
import { DealPipeline } from '../../deals/entities/deal-pipeline.entity';
import { ContactRequest } from '../../contact/entities/contact.entity';
import { MailInboxItem } from '../../mail/entities/mail.entity';
import { numericEnumTransformer } from '../../common/numeric-enum';

export enum LeadStage {
  New = 'New',
  Contacted = 'Contacted',
  Pending = 'Pending',
  Qualified = 'Qualified',
  Visit = 'Visit',
  Negotiation = 'Negotiation',
  Deal = 'Deal',
  Canceled = 'Canceled',
}

export enum LeadPriority {
  HighPriority = 'HighPriority',
  Warm = 'Warm',
  FollowUp = 'FollowUp',
}

export enum LeadFollowUpStatus {
  Open = 'Open',
  Scheduled = 'Scheduled',
  Completed = 'Completed',
  NoActionNeeded = 'NoActionNeeded',
}

export const leadStages = Object.values(LeadStage);
export const leadPriorities = Object.values(LeadPriority);
export const leadFollowUpStatuses = Object.values(LeadFollowUpStatus);

@Entity('lead')
export class Lead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: '' })
  name: string;

  @Column({ default: '' })
  email: string;

  @Column({ default: '' })
  phone: string;

  @Column({ type: 'text', default: '' })
  summary: string;

  @Column({ name: 'property_name', default: '' })
  property: string;

  @Column({ type: 'int', nullable: true })
  propertyId: number | null;

  @ManyToOne(() => Property, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'property_id' })
  linkedProperty: Property | null;

  @Column({ default: '' })
  budget: string;

  @Column({ name: 'credit_score', default: '' })
  creditScore: string;

  @Column({ name: 'combined_credit_score', default: '' })
  combinedCreditScore: string;

  @Column({ type: 'int', transformer: numericEnumTransformer(leadStages, LeadStage.New) })
  stage: LeadStage = LeadStage.New;

  @Column({ type: 'int', transformer: numericEnumTransformer(leadPriorities, LeadPriority.Warm) })
  priority: LeadPriority = LeadPriority.Warm;

  @Column({ default: '' })
  agent: string;

  @Column({ type: 'int', nullable: true })
  agentId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agent_id' })
  assignedAgent: User;

  @Column({ default: '' })
  source: string;

  @Column({ default: '' })
  interest: string;

  @Column({ default: '' })
  timeline: string;

  @Column({ default: false })
  inBoard: boolean;

  @Column({ type: 'text', default: '' })
  intelligenceClassifier: string;

  @Column({ type: 'int', default: 0 })
  intelligenceConfidence: number;

  @Column({ type: 'text', default: '' })
  intelligenceAssignedStage: string;

  @Column({ type: 'text', default: '' })
  intelligenceAssignedPriority: string;

  @Column({ type: 'boolean', default: false })
  intelligenceAssignedInBoard: boolean;

  @Column({ type: 'text', default: '' })
  intelligenceText: string;

  @Column({ type: 'timestamp', nullable: true })
  nextActionDate: Date | null;

  @Column({ default: '' })
  nextActionType: string;

  @Column({ type: 'int', transformer: numericEnumTransformer(leadFollowUpStatuses, LeadFollowUpStatus.Open) })
  followUpStatus: LeadFollowUpStatus = LeadFollowUpStatus.Open;

  @Column({ type: 'jsonb', default: [] })
  notes: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastActivityAt: Date;

  @OneToMany(() => DealPipeline, (deal) => deal.sourceLead)
  deals: DealPipeline[];

  @OneToMany(() => ContactRequest, (request) => request.lead)
  contactRequests: ContactRequest[];

  @OneToMany(() => MailInboxItem, (item) => item.lead)
  mailInboxItems: MailInboxItem[];
}
