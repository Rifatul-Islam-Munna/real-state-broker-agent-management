import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Property } from '../../properties/entities/property.entity';

export enum ShowingBookingStatus {
  Scheduled = 'Scheduled',
  Completed = 'Completed',
  Canceled = 'Canceled',
  NoShow = 'NoShow',
}

@Entity('showing_booking')
export class ShowingBooking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  leadId: number;

  @Column()
  propertyId: number;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
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
export class LeadAssignmentRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: '' })
  area: string;

  @Column({ nullable: true })
  propertyType: string;

  @Column({ nullable: true })
  listingType: string;

  @Column()
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
export class BrokerageApprovalRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: string;

  @Column({ default: 'Pending' })
  status: string;

  @Column()
  propertyId: number;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property: Property;

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

  @Column({ default: '' })
  reviewedBy: string;

  @Column({ type: 'text', default: '' })
  requestNote: string;

  @Column({ type: 'text', default: '' })
  reviewNote: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
