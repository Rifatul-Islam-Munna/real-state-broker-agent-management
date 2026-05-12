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
import { DealPipeline } from '../../deals/entities/deal-pipeline.entity';

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

@Entity('lead')
export class Lead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ default: '' })
  phone: string;

  @Column({ type: 'text', default: '' })
  summary: string;

  @Column({ name: 'property_name', default: '' })
  property: string;

  @Column({ default: '' })
  budget: string;

  @Column({
    type: 'enum',
    enum: LeadStage,
    default: LeadStage.New,
  })
  stage: LeadStage;

  @Column({
    type: 'enum',
    enum: LeadPriority,
    default: LeadPriority.Warm,
  })
  priority: LeadPriority;

  @Column({ default: '' })
  agent: string;

  @Column({ nullable: true })
  agentId: number;

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

  @Column({ type: 'timestamp', nullable: true })
  nextActionDate: Date;

  @Column({ default: '' })
  nextActionType: string;

  @Column({
    type: 'enum',
    enum: LeadFollowUpStatus,
    default: LeadFollowUpStatus.Open,
  })
  followUpStatus: LeadFollowUpStatus;

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
}
