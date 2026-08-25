import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { ChatbotAudience } from './tenant-chatbot.types';

@Entity('platform_chatbot_knowledge')
export class PlatformChatbotKnowledge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  audience: ChatbotAudience;

  @Column({ type: 'varchar', length: 240 })
  title: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  questionExamples: string[];
  @Column({ type: 'integer', default: 50 })
  priority: number;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'varchar', length: 64 })
  sourceHash: string;

  @Column({ type: 'varchar', length: 80 })
  qdrantPointId: string;

  @Column({ type: 'varchar', length: 40, default: 'PLATFORM_MANUAL' })
  sourceType: string;

  @Column({ type: 'varchar', length: 24, default: 'pending' })
  indexStatus: string;

  @Column({ type: 'text', default: '' })
  lastError: string;

  @Column({ type: 'integer', nullable: true })
  createdByMasterUserId: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
