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
import { User } from '../../users/entities/user.entity';
import { numericEnumTransformer } from '../../common/numeric-enum';
import { PropertyCategory, PropertyListingType, PropertyStatus, propertyCategories, propertyListingTypes, propertyStatuses } from '../../properties/entities/property.entity';

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
  ListingPublish = 'ListingPublish',
  PriceChange = 'PriceChange',
}

export enum ApprovalStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
}
export const showingStatuses = Object.values(ShowingBookingStatus);
export const approvalTypes = Object.values(ApprovalType);
export const approvalStatuses = Object.values(ApprovalStatus);
const nullableEnum = (values: readonly string[]) => ({ to: (value: string | number | null) => value === null || value === undefined || value === '' ? null : typeof value === 'number' ? value : values.indexOf(value), from: (value: number | null) => value === null ? null : values[value] });

@Entity('showing_booking')
@Index(['leadId'])
@Index(['propertyId'])
@Index(['agentId'])
@Index(['status'])
@Index(['startAt'])
export class ShowingBooking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  leadId: number | null;

  @ManyToOne(() => Lead, { onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'lead_id' })
  lead?: Lead;

  @Column({ default: 0 })
  propertyId: number;

  @ManyToOne(() => Property, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'property_id' })
  property?: Property;

  @Column({ type: 'int', nullable: true })
  agentId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'agent_id' })
  agent?: User;

  @Column({ default: '' })
  contactName: string;

  @Column({ default: '' })
  contactEmail: string;

  @Column({ default: '' })
  contactPhone: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  startAt: Date;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  endAt: Date;

  @Column({ type: 'int', transformer: numericEnumTransformer(showingStatuses, ShowingBookingStatus.Scheduled) })
  status: ShowingBookingStatus = ShowingBookingStatus.Scheduled;

  @Column({ type: 'text', default: '' })
  notes: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

@Entity('lead_assignment_rule')
@Index(['agentId'])
@Index(['area'])
@Index(['isActive'])
export class LeadAssignmentRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: '' })
  area: string;

  @Column({ type: 'int', nullable: true, transformer: nullableEnum(propertyCategories) })
  propertyType: PropertyCategory | null;

  @Column({ type: 'int', nullable: true, transformer: nullableEnum(propertyListingTypes) })
  listingType: PropertyListingType | null;

  @Column({ default: 0 })
  agentId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'agent_id' })
  agent?: User;

  @Column({ default: 100 })
  priorityOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
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

  @Column({ type: 'int', transformer: numericEnumTransformer(approvalTypes, ApprovalType.ListingPublish) })
  type: ApprovalType;

  @Column({ type: 'int', transformer: numericEnumTransformer(approvalStatuses, ApprovalStatus.Pending) })
  status: ApprovalStatus = ApprovalStatus.Pending;

  @Column({ default: 0 })
  propertyId: number;

  @ManyToOne(() => Property, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'property_id' })
  property?: Property;

  @Column({ default: '' })
  oldPrice: string;

  @Column({ default: '' })
  requestedPrice: string;

  @Column({ type: 'int', nullable: true, transformer: nullableEnum(propertyStatuses) })
  oldStatus: PropertyStatus | null;

  @Column({ type: 'int', nullable: true, transformer: nullableEnum(propertyStatuses) })
  requestedStatus: PropertyStatus | null;

  @Column({ default: '' })
  requestedBy: string;

  @Column({ default: '' })
  reviewedBy: string;

  @Column({ type: 'text', default: '' })
  requestNote: string;

  @Column({ type: 'text', default: '' })
  reviewNote: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
