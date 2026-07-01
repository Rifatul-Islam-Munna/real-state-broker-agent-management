import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Lead } from './lead.entity';

export enum LeadHistoryKind { Note = 'Note', Email = 'Email', Sms = 'Sms', Call = 'Call', PropertyChat = 'PropertyChat', ContactForm = 'ContactForm', MailInbox = 'MailInbox', System = 'System' }
export enum LeadHistoryDirection { Incoming = 'Incoming', Outgoing = 'Outgoing', Internal = 'Internal', Scheduled = 'Scheduled', System = 'System' }
export enum LeadHistoryStatus { Logged = 'Logged', Scheduled = 'Scheduled', Sent = 'Sent', Received = 'Received', Completed = 'Completed', Failed = 'Failed' }

const kinds = Object.values(LeadHistoryKind);
const directions = Object.values(LeadHistoryDirection);
const statuses = Object.values(LeadHistoryStatus);
const transform = (values: string[], fallback: string) => ({
  to: (value: string | number) => typeof value === 'number' ? value : Math.max(0, values.indexOf(value ?? fallback)),
  from: (value: number) => values[value] ?? fallback,
});

export const leadHistoryKindDb = (value: string) => Math.max(0, kinds.indexOf(value as LeadHistoryKind));
export const leadHistoryStatusDb = (value: string) => Math.max(0, statuses.indexOf(value as LeadHistoryStatus));

@Entity('lead_history')
export class LeadHistoryEntry {
  @PrimaryGeneratedColumn() id: number;
  @Column({ type: 'int', default: 0 }) leadId: number;
  @ManyToOne(() => Lead, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'lead_id' }) lead: Lead;
  @Column({ type: 'int', transformer: transform(kinds, LeadHistoryKind.Note) }) kind: string = LeadHistoryKind.Note;
  @Column({ type: 'int', transformer: transform(directions, LeadHistoryDirection.Internal) }) direction: string = LeadHistoryDirection.Internal;
  @Column({ type: 'int', transformer: transform(statuses, LeadHistoryStatus.Logged) }) status: string = LeadHistoryStatus.Logged;
  @Column({ type: 'text', default: '' }) title: string = '';
  @Column({ type: 'text', default: '' }) summary: string = '';
  @Column({ type: 'text', default: '' }) body: string = '';
  @Column({ type: 'text', default: '' }) provider: string = '';
  @Column({ type: 'text', default: '' }) createdBy: string = '';
  @Column({ type: 'timestamptz', nullable: true }) scheduledAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) occurredAt: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}
