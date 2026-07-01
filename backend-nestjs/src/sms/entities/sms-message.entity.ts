import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum SmsMessageDirection { Incoming = 'Incoming', Outgoing = 'Outgoing' }
export enum SmsMessageStatus { Received = 'Received', Sent = 'Sent', Failed = 'Failed' }

const directions = Object.values(SmsMessageDirection);
const statuses = Object.values(SmsMessageStatus);
const transform = (values: string[], fallback: string) => ({
  to: (value: string | number) => typeof value === 'number' ? value : Math.max(0, values.indexOf(value ?? fallback)),
  from: (value: number) => values[value] ?? fallback,
});

@Entity('sms_message')
@Index(['provider', 'providerMessageId'], { unique: true })
export class SmsMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', default: '' })
  provider: string = '';

  @Column({ type: 'text', default: '' })
  providerMessageId: string = '';

  @Column({ type: 'int', nullable: true })
  leadId: number | null;

  @Column({ type: 'text', default: '' })
  leadName: string = '';

  @Column({ type: 'text', default: '' })
  fromNumber: string = '';

  @Column({ type: 'text', default: '' })
  toNumber: string = '';

  @Column({ type: 'text', default: '' })
  body: string = '';

  @Column({ type: 'jsonb', nullable: true })
  mediaUrls: string[] | null;

  @Column({ type: 'int', transformer: transform(directions, SmsMessageDirection.Incoming) })
  direction: string = SmsMessageDirection.Incoming;

  @Column({ type: 'int', transformer: transform(statuses, SmsMessageStatus.Received) })
  status: string = SmsMessageStatus.Received;

  @Column({ type: 'timestamptz', nullable: true })
  occurredAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  rawPayload: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
