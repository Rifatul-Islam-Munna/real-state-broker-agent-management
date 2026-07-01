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
import { numericEnumTransformer } from '../../common/numeric-enum';

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

export const dealStages = Object.values(DealStage);
export const dealTypes = Object.values(DealType);
export const dealCommissionStatuses = Object.values(DealCommissionStatus);

@Entity('deal_pipeline')
export class DealPipeline {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: '' })
  title: string;

  @Column({ type: 'int', transformer: numericEnumTransformer(dealTypes, DealType.Residential) })
  type: DealType = DealType.Residential;

  @Column({ default: '' })
  client: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  value: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 3 })
  commissionRate: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  commissionAmount: number;

  @Column({ type: 'int', transformer: numericEnumTransformer(dealCommissionStatuses, DealCommissionStatus.Estimated) })
  commissionStatus: DealCommissionStatus = DealCommissionStatus.Estimated;

  @Column({ default: '' })
  commissionPayoutNote: string;

  @Column({ type: 'int', transformer: numericEnumTransformer(dealStages, DealStage.OfferMade) })
  stage: DealStage = DealStage.OfferMade;

  @Column({ default: '' })
  deadline: string;

  @Column({ type: 'timestamp', nullable: true })
  expectedClosingDate: Date;

  @Column({ type: 'text', default: '' })
  note: string;

  @Column({ default: '' })
  agent: string;

  @Column({ type: 'int', nullable: true })
  agentId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agent_id' })
  dealOwner: User;

  @Column({ type: 'int', nullable: true })
  sourceLeadId: number | null;

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

  @Column({ default: 0 })
  dealPipelineId: number;

  @ManyToOne(() => DealPipeline, (deal) => deal.checklistItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deal_pipeline_id' })
  dealPipeline: DealPipeline;

  @Column({ default: '' })
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
