import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Property } from '../../properties/entities/property.entity';
import { Lead } from '../../leads/entities/lead.entity';

export enum ShowingBookingStatus {
  Scheduled = 'Scheduled',
  Completed = 'Completed',
  Canceled = 'Canceled',
  NoShow = 'NoShow',
}

export enum AssignmentRuleType {
  Agent = 'agent',
  Area = 'area',
  Workload = 'workload',
}

export enum ApprovalType {
  ListingApproval = 'ListingApproval',
  PriceChange = 'PriceChange',
  DealCommission = 'DealCommission',
}

export enum ApprovalStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

@Entity('showing_booking')
@Index(['leadId'])
@Index(['propertyId'])
@Index(['agentId'])
@Index(['status'])
@Index(['startAt'])
export class ShowingBooking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  leadId: number;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'lead_id' })
  lead?: Lead;

  @Column()
  propertyId: number;

  @ManyToOne(() => Property, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({ nullable: true })
  agentId: number;

  @Column({ default: '' })
  contactName: string;

  @Column({ default: '' })
  contactEmail: string;

  @Column({ default: '' })
  contactPhone: string;

  @Column({ type: 'timestamp' })
  startAt: Date;

  @Column({ type: 'timestamp' })
  endAt: Date;

  @Column({
    type: 'enum',
    enum: ShowingBookingStatus,
    default: ShowingBookingStatus.Scheduled,
  })
  status: ShowingBookingStatus;

  @Column({ type: 'text', default: '' })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('lead_assignment_rule')
@Index(['agentId'])
@Index(['area'])
@Index(['isActive'])
export class LeadAssignmentRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  agencyId: number;

  @Column({
    type: 'enum',
    enum: AssignmentRuleType,
  })
  type: AssignmentRuleType;

  @Column({ default: '' })
  area: string;

  @Column({ nullable: true })
  propertyType: string;

  @Column({ nullable: true })
  listingType: string;

  @Column({ nullable: true })
  agentId: number;

  @Column({ default: 100 })
  priorityOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('brokerage_approval_request')
@Index(['propertyId'])
@Index(['status'])
@Index(['type'])
@Index(['createdAt'])
export class BrokerageApprovalRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ApprovalType,
  })
  type: ApprovalType;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.Pending,
  })
  status: ApprovalStatus;

  @Column()
  propertyId: number;

  @ManyToOne(() => Property, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({ nullable: true })
  dealId: number;

  @Column({ default: '' })
  oldPrice: string;

  @Column({ default: '' })
  requestedPrice: string;

  @Column({ nullable: true })
  oldStatus: string;

  @Column({ nullable: true })
  requestedStatus: string;

  @Column({ default: '' })
  requestedBy: string;

  @Column({ nullable: true })
  requestedByUserId: number;

  @Column({ default: '' })
  reviewedBy: string;

  @Column({ nullable: true })
  reviewedByUserId: number;

  @Column({ type: 'text', default: '' })
  requestNote: string;

  @Column({ type: 'text', default: '' })
  reviewNote: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
