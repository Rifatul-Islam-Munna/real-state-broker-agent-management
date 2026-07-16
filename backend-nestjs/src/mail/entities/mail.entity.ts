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

export enum MailInboxStatus {
  New = 'New',
  Replied = 'Replied',
  Converted = 'Converted',
}

export enum MailInboxKind {
  Newsletter = 'Newsletter',
  Direct = 'Direct',
}

const statusDbValues: Record<MailInboxStatus, number> = {
  [MailInboxStatus.New]: 0,
  [MailInboxStatus.Replied]: 1,
  [MailInboxStatus.Converted]: 2,
};

const kindDbValues: Record<MailInboxKind, number> = {
  [MailInboxKind.Newsletter]: 0,
  [MailInboxKind.Direct]: 1,
};

export function mailInboxStatusDbValue(value: MailInboxStatus | string | number) {
  if (typeof value === 'number') return value;
  return statusDbValues[value as MailInboxStatus] ?? statusDbValues[MailInboxStatus.New];
}

function mailInboxKindDbValue(value: MailInboxKind | string | number) {
  if (typeof value === 'number') return value;
  return kindDbValues[value as MailInboxKind] ?? kindDbValues[MailInboxKind.Direct];
}

@Entity('mail_inbox')
export class MailInboxItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', default: '' })
  email: string;

  @Column({ type: 'text', default: '' })
  name: string;

  @Column({ type: 'text', default: '' })
  subject: string;

  @Column({ type: 'text', default: '' })
  message: string;

  @Column({ type: 'text', default: '' })
  htmlBody: string;

  @Column({ type: 'text', default: '' })
  messageId: string;

  @Column({ type: 'text', default: '' })
  inReplyTo: string;

  @Column({ type: 'text', array: true, default: '{}' })
  references: string[];

  @Column({ type: 'text', default: '' })
  mailboxTag: string;

  @Column({ type: 'jsonb', default: {} })
  extractedLead: Record<string, any>;

  @Column({ type: 'text', default: '' })
  extractionMethod: string;

  @Column({ type: 'double precision', default: 0 })
  extractionConfidence: number;

  @Column({ type: 'int', nullable: true })
  leadCollectionTemplateId: number | null;

  @Column({ type: 'text', default: '' })
  leadCollectionTemplateName: string;

  @Column({ default: false })
  aiFallbackUsed: boolean;

  @Column({ type: 'boolean', default: false })
  isRead: boolean = false;

  @Column({ type: 'boolean', default: false })
  isStarred: boolean = false;

  @Column({ type: 'jsonb', default: {} })
  extractionDetails: Record<string, any>;

  @Column({
    type: 'int',
    transformer: {
      to: mailInboxKindDbValue,
      from: (value: number) => value === 0 ? MailInboxKind.Newsletter : MailInboxKind.Direct,
    },
  })
  kind: MailInboxKind = MailInboxKind.Direct;

  @Column({
    type: 'int',
    transformer: {
      to: mailInboxStatusDbValue,
      from: (value: number) => [MailInboxStatus.New, MailInboxStatus.Replied, MailInboxStatus.Converted][value] ?? MailInboxStatus.New,
    },
  })
  status: MailInboxStatus = MailInboxStatus.New;

  @Column({ type: 'int', nullable: true })
  leadId: number | null;

  @ManyToOne(() => Lead, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
