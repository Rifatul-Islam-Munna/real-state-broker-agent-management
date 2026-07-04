import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Index(['templateId'])
@Index(['propertyId'])
@Index(['leadId'])
@Index(['createdAt'])
@Entity('pdf_generation')
export class PdfGeneration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  templateId: number;

  @Column({ type: 'text', default: '' })
  templateName: string;

  @Column({ type: 'text', default: 'Universal' })
  category: string;

  @Column({ type: 'int', nullable: true })
  propertyId: number | null;

  @Column({ type: 'text', default: '' })
  propertyTitle: string;

  @Column({ type: 'int', nullable: true })
  leadId: number | null;

  @Column({ type: 'text', default: '' })
  leadName: string;

  @Column({ type: 'int', nullable: true })
  agentId: number | null;

  @Column({ type: 'text', default: '' })
  agentName: string;

  @Column({ type: 'text' })
  fileName: string;

  @Column({ type: 'text' })
  fileUrl: string;

  @Column({ type: 'text', nullable: true })
  fileObjectName: string | null;

  @Column({ type: 'text', default: 'application/pdf' })
  mimeType: string;

  @Column({ type: 'bigint', default: 0 })
  sizeBytes: number;

  @Column({ type: 'int', default: 0 })
  manualFieldCount: number;

  @Column({ type: 'int', default: 0 })
  missingFieldCount: number;

  @Column({ type: 'jsonb', default: [] })
  variablesUsed: string[];

  @Column({ type: 'jsonb', default: {} })
  context: Record<string, unknown>;

  @Column({ type: 'text', default: '' })
  generatedBy: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
