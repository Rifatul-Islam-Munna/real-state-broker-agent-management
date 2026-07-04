import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PdfTemplateCategory {
  Universal = 'Universal',
  Property = 'Property',
  Tenant = 'Tenant',
  Lead = 'Lead',
  Lease = 'Lease',
  Contract = 'Contract',
  Agreement = 'Agreement',
  Disclosure = 'Disclosure',
  Offer = 'Offer',
  Inspection = 'Inspection',
  Custom = 'Custom',
}

export enum PdfTemplateStatus {
  Draft = 'Draft',
  Active = 'Active',
  Archived = 'Archived',
}

@Index(['name'])
@Index(['category'])
@Index(['status'])
@Entity('pdf_template')
export class PdfTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', default: '' })
  name: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'text', default: PdfTemplateCategory.Universal })
  category: PdfTemplateCategory = PdfTemplateCategory.Universal;

  @Column({ type: 'text', default: PdfTemplateStatus.Draft })
  status: PdfTemplateStatus = PdfTemplateStatus.Draft;

  @Column({ type: 'jsonb', default: {} })
  templateJson: Record<string, unknown>;

  @Column({ type: 'jsonb', default: [] })
  requiredVariables: string[];

  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  @Column({ type: 'text', default: 'document-{{property.slug}}' })
  fileNamePattern: string;

  @Column({ type: 'int', default: 1 })
  schemaVersion: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
