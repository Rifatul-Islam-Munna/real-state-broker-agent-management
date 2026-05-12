import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Property } from '../../properties/entities/property.entity';
import { Lead } from '../../leads/entities/lead.entity';

@Entity('property_chat_conversation')
export class PropertyChatConversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  propertyId: number;

  @ManyToOne(() => Property, (property) => property.chatConversations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({ nullable: true })
  leadId: number;

  @ManyToOne(() => Lead, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ default: 'Active' })
  status: string;

  @OneToMany(() => PropertyChatMessage, (message) => message.conversation, { cascade: true })
  messages: PropertyChatMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('property_chat_message')
export class PropertyChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  conversationId: number;

  @ManyToOne(() => PropertyChatConversation, (conv) => conv.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: PropertyChatConversation;

  @Column({ type: 'text' })
  content: string;

  @Column()
  role: string; // 'user' or 'assistant'

  @CreateDateColumn()
  createdAt: Date;
}
