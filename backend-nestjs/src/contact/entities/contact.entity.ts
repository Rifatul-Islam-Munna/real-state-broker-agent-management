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

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  email: string;

  @Column({ type: 'text' })
  phone: string = '';

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'text' })
  inquiryType: string = '';

  @Column({ type: 'int', transformer: { to: contactStatusDb, from: (value: number) => statusValues[value] ?? ContactRequestStatus.New } })
  status: string = ContactRequestStatus.New;

  @Column({ nullable: true })
  leadId: number | null;

  @ManyToOne(() => Lead, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
