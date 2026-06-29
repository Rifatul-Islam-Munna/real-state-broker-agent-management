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

  @Column({ type: 'text' })
  email: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  subject: string;

  @Column({ type: 'text' })
  message: string;

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

  @Column({ nullable: true })
  leadId: number | null;

  @ManyToOne(() => Lead, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
