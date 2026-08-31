import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { ChatbotAudience, ChatbotChannel } from './tenant-chatbot.types';

export type ChatbotLearningKind = 'ANSWER' | 'QUALIFICATION';
export type ChatbotLearningStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

@Entity('platform_chatbot_learning_candidate')
@Index('uq_platform_chatbot_learning_fingerprint', ['fingerprint'], { unique: true })
@Index('idx_platform_chatbot_learning_status_updated', ['status', 'updatedAt'])
@Index('idx_platform_chatbot_learning_tenant_status', ['tenantId', 'status'])
export class PlatformChatbotLearningCandidate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  fingerprint: string;

  @Column({ type: 'integer' })
  tenantId: number;

  @Column({ type: 'varchar', length: 240, default: '' })
  tenantName: string;

  @Column({ type: 'bigint', nullable: true })
  propertyId: number | null;

  @Column({ type: 'varchar', length: 300, default: '' })
  propertyTitle: string;

  @Column({ type: 'varchar', length: 20 })
  audience: ChatbotAudience;

  @Column({ type: 'varchar', length: 20 })
  channel: ChatbotChannel;

  @Column({ type: 'varchar', length: 24 })
  kind: ChatbotLearningKind;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status: ChatbotLearningStatus;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'varchar', length: 64 })
  questionHash: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ type: 'jsonb', nullable: true })
  structuredPayload: Record<string, unknown> | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  evidenceKnowledgeIds: string[];

  @Column({ type: 'varchar', length: 40, default: '' })
  provider: string;

  @Column({ type: 'varchar', length: 180, default: '' })
  model: string;

  @Column({ type: 'double precision', nullable: true })
  confidence: number | null;

  @Column({ type: 'integer', default: 1 })
  occurrences: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  firstSeenAt: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  lastSeenAt: Date;

  @Column({ type: 'integer', nullable: true })
  reviewedByMasterUserId: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  qdrantPointId: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  sourceHash: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
