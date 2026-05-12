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
import { Lead } from '../../leads/entities/lead.entity';

export enum DealStage {
  OfferMade = 'OfferMade',
  OfferAccepted = 'OfferAccepted',
  UnderContract = 'UnderContract',
  Inspection = 'Inspection',
  Financing = 'Financing',
  Closing = 'Closing',
  Completed = 'Completed',
  Canceled = 'Canceled',
}

export enum DealType {
  Residential = 'Residential',
  Commercial = 'Commercial',
  Industrial = 'Industrial',
}

export enum DealCommissionStatus {
  NotReady = 'NotReady',
  Estimated = 'Estimated',
  ReadyToInvoice = 'ReadyToInvoice',
  Invoiced = 'Invoiced',
  Paid = 'Paid',
}

@Entity('deal_pipeline')
export class DealPipeline {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({
    type: 'enum',
    enum: DealType,
    default: DealType.Residential,
  })
  type: DealType;

  @Column()
  client: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  value: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 3 })
  commissionRate: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  commissionAmount: number;

  @Column({
    type: 'enum',
    enum: DealCommissionStatus,
    default: DealCommissionStatus.Estimated,
  })
  commissionStatus: DealCommissionStatus;

  @Column({ default: '' })
  commissionPayoutNote: string;

  @Column({
    type: 'enum',
    enum: DealStage,
    default: DealStage.OfferMade,
  })
  stage: DealStage;

  @Column({ default: '' })
  deadline: string;

  @Column({ type: 'timestamp', nullable: true })
  expectedClosingDate: Date;

  @Column({ type: 'text', default: '' })
  note: string;

  @Column({ default: '' })
  agent: string;

  @Column({ nullable: true })
  agentId: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agent_id' })
  dealOwner: User;

  @Column({ nullable: true })
  sourceLeadId: number;

  @ManyToOne(() => Lead, (lead) => lead.deals, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'source_lead_id' })
  sourceLead: Lead;

  @OneToMany(() => DealChecklistItem, (item) => item.dealPipeline, { cascade: true })
  checklistItems: DealChecklistItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('deal_checklist_item')
export class DealChecklistItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  dealPipelineId: number;

  @ManyToOne(() => DealPipeline, (deal) => deal.checklistItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deal_pipeline_id' })
  dealPipeline: DealPipeline;

  @Column()
  title: string;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
