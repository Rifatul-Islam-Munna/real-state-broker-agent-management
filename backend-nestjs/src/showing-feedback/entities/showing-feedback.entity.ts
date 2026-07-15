import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Property } from '../../properties/entities/property.entity';
import { RealtorShowing } from '../../realtor-showings/entities/realtor-showing.entity';

@Entity('showing_feedback')
@Index(['channel', 'sourceMessageId'], { unique: true })
export class ShowingFeedback {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  realtorShowingId: number;

  @ManyToOne(() => RealtorShowing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'realtor_showing_id' })
  realtorShowing: RealtorShowing;

  @Column()
  propertyId: number;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({ type: 'int', nullable: true })
  leadId: number | null;

  @Column({ default: '' })
  realtorName: string;

  @Column({ default: '' })
  realtorContact: string;

  @Column({ default: '' })
  channel: string;

  @Column({ default: '' })
  sourceMessageId: string;

  @Column({ type: 'text' })
  feedbackText: string;

  @Column({ default: 'neutral' })
  sentiment: string;

  @Column({ type: 'float', default: 0 })
  confidence: number;

  @Column({ default: 'AI' })
  classifier: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'float', default: 0 })
  priorityScore: number;

  @Column({ default: 'unknown' })
  intent: string;

  @Column({ type: 'float', default: 0 })
  applyLikelihood: number;

  @Column({ type: 'timestamptz' })
  firstMessageAt: Date;

  @Column({ type: 'timestamptz' })
  receivedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
