import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PdfTemplateStatus {
  Draft = 'Draft',
  Active = 'Active',
  Archived = 'Archived',
}

export enum PdfTemplateSourceType {
  Blank = 'Blank',
  UploadedPdf = 'UploadedPdf',
}

@Index(['name'])
@Index(['category'])
@Index(['status'])
@Entity('pdf_template')
export class PdfTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'text', default: 'Universal' })
  category: string;

  @Column({ type: 'text', default: PdfTemplateStatus.Draft })
  status: PdfTemplateStatus;

  @Column({ type: 'text', default: PdfTemplateSourceType.Blank })
  sourceType: PdfTemplateSourceType;

  @Column({ type: 'jsonb', default: {} })
  templateJson: Record<string, unknown>;

  @Column({ type: 'jsonb', default: [] })
  requiredVariables: string[];

  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  @Column({ type: 'text', default: 'document-{{property.slug}}' })
  fileNamePattern: string;

  @Column({ type: 'text', default: '' })
  sourceFileName: string;

  @Column({ type: 'text', default: '' })
  sourceFileUrl: string;

  @Column({ type: 'text', nullable: true })
  sourceFileObjectName: string | null;

  @Column({ type: 'text', default: '' })
  sourceMimeType: string;

  @Column({ type: 'bigint', default: 0 })
  sourceSizeBytes: number;

  @Column({ type: 'jsonb', default: [] })
  importedFields: Array<{
    name: string;
    type: string;
    pageIndex: number;
    position?: { x: number; y: number; width: number; height: number };
    options?: string[];
  }>;

  @Column({ type: 'int', default: 1 })
  schemaVersion: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
