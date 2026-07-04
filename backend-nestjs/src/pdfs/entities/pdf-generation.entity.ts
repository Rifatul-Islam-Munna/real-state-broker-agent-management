import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index(['templateId'])
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

  @Column({ type: 'jsonb', default: {} })
  context: Record<string, unknown>;

  @Column({ type: 'text', default: '' })
  fileName: string;

  @Column({ type: 'int', default: 0 })
  manualFieldCount: number;

  @Column({ type: 'jsonb', default: [] })
  variablesUsed: string[];

  @Column({ type: 'text', default: '' })
  generatedBy: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
