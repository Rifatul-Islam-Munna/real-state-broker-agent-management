import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DocumentAccessLevel { AdminOnly = 'AdminOnly', AgentAccess = 'AgentAccess', Public = 'Public' }
export enum DocumentType {
  System = 'System',
  Property = 'Property',
  Other = 'Other',
  Lead = 'Lead',
  Realtor = 'Realtor',
  OwnerFeedback = 'OwnerFeedback',
}
const accessValues = Object.values(DocumentAccessLevel);
export const documentAccessDb = (value: string | number) => typeof value === 'number' ? value : Math.max(0, accessValues.indexOf(value as DocumentAccessLevel));
const documentTypeValues = Object.values(DocumentType);
export const documentTypeDb = (value: string | number) => typeof value === 'number' ? value : Math.max(0, documentTypeValues.indexOf(value as DocumentType));

@Entity('document_repository_item')
export class DocumentRepositoryItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', default: '' })
  title: string;

  @Column({ type: 'text', default: '' })
  fileName: string;

  @Column({ type: 'text', default: '' })
  fileUrl: string;

  @Column({ type: 'text', nullable: true })
  fileObjectName: string;

  @Column({ type: 'text', default: '' })
  mimeType: string;

  @Column({ type: 'bigint', default: 0 })
  sizeBytes: number;

  @Column({ type: 'text', default: '' })
  category: string;

  @Column({ type: 'int', default: documentTypeDb(DocumentType.Other), transformer: { to: documentTypeDb, from: (value: number) => documentTypeValues[value] ?? DocumentType.Other } })
  documentType: string = DocumentType.Other;

  @Column({ type: 'int', nullable: true })
  propertyId: number | null;

  @Column({ type: 'text', default: '' })
  propertyTitle: string = '';

  @Column({ type: 'text', default: '' })
  folder: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'text', default: '' })
  versionLabel: string;

  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  @Column({ type: 'int', transformer: { to: documentAccessDb, from: (value: number) => accessValues[value] ?? DocumentAccessLevel.AdminOnly } })
  accessLevel: string = DocumentAccessLevel.AdminOnly;

  @Column({ default: false })
  isTemplate: boolean;

  @Column({ default: false })
  requiresSignature: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
