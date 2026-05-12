import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Lead } from '../../leads/entities/lead.entity';

@Entity('lead_history')
export class LeadHistoryEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  leadId: number;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ default: 'Note' })
  kind: string;

  @Column({ default: 'Internal' })
  direction: string;

  @Column({ default: 'Logged' })
  status: string;

  @Column({ default: '' })
  title: string;

  @Column({ type: 'text', default: '' })
  summary: string;

  @Column({ type: 'text', default: '' })
  body: string;

  @Column({ default: '' })
  provider: string;

  @Column({ default: '' })
  createdBy: string;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  occurredAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
