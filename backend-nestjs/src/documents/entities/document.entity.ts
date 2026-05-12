import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('document_repository_item')
export class DocumentRepositoryItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  fileName: string;

  @Column()
  fileUrl: string;

  @Column({ nullable: true })
  fileObjectName: string;

  @Column()
  mimeType: string;

  @Column({ type: 'bigint' })
  sizeBytes: number;

  @Column({ default: '' })
  category: string;

  @Column({ default: '' })
  folder: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ default: 'v1.0' })
  versionLabel: string;

  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  @Column({ default: 'AdminOnly' })
  accessLevel: string;

  @Column({ default: false })
  isTemplate: boolean;

  @Column({ default: false })
  requiresSignature: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
