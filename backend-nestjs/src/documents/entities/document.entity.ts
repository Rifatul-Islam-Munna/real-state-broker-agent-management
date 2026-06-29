import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DocumentAccessLevel { AdminOnly = 'AdminOnly', AgentAccess = 'AgentAccess', Public = 'Public' }
const accessValues = Object.values(DocumentAccessLevel);
export const documentAccessDb = (value: string | number) => typeof value === 'number' ? value : Math.max(0, accessValues.indexOf(value as DocumentAccessLevel));

@Entity('document_repository_item')
export class DocumentRepositoryItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  fileName: string;

  @Column({ type: 'text' })
  fileUrl: string;

  @Column({ type: 'text', nullable: true })
  fileObjectName: string;

  @Column({ type: 'text' })
  mimeType: string;

  @Column({ type: 'bigint' })
  sizeBytes: number;

  @Column({ type: 'text' })
  category: string;

  @Column({ type: 'text' })
  folder: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text' })
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
