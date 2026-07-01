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

export enum ContactRequestStatus { New = 'New', Reviewing = 'Reviewing', Converted = 'Converted' }
const statusValues = Object.values(ContactRequestStatus);
export const contactStatusDb = (value: string | number) => typeof value === 'number' ? value : Math.max(0, statusValues.indexOf(value as ContactRequestStatus));

@Entity('contact_request')
export class ContactRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', default: '' })
  name: string;

  @Column({ type: 'text', default: '' })
  email: string;

  @Column({ type: 'text', default: '' })
  phone: string = '';

  @Column({ type: 'text', default: '' })
  message: string;

  @Column({ type: 'text', default: '' })
  inquiryType: string = '';

  @Column({ type: 'int', nullable: true })
  propertyId: number | null;

  @Column({ type: 'text', default: '' })
  propertyTitle: string = '';

  @Column({ type: 'int', nullable: true })
  agentId: number | null;

  @Column({ type: 'text', default: '' })
  agentName: string = '';

  @Column({ type: 'int', transformer: { to: contactStatusDb, from: (value: number) => statusValues[value] ?? ContactRequestStatus.New } })
  status: string = ContactRequestStatus.New;

  @Column({ type: 'int', nullable: true })
  leadId: number | null;

  @ManyToOne(() => Lead, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
