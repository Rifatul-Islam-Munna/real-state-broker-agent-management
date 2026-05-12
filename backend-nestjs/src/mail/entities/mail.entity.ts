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

@Entity('mail_inbox_item')
export class MailInboxItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  messageId: string;

  @Column()
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column()
  fromAddress: string;

  @Column()
  fromName: string;

  @Column({ type: 'timestamp' })
  receivedAt: Date;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  leadId: number;

  @ManyToOne(() => Lead, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
