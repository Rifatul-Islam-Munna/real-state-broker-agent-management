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
import { numericEnumTransformer } from '../../common/numeric-enum';

export enum PropertyChatConversationStatus {
  New = 'New',
  LeadCreated = 'LeadCreated',
  NeedsReview = 'NeedsReview',
}

export enum PropertyChatSenderRole {
  System = 'System',
  Visitor = 'Visitor',
  Agent = 'Agent',
}

const conversationStatuses = Object.values(PropertyChatConversationStatus);
const senderRoles = Object.values(PropertyChatSenderRole);

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

  @Column({ type: 'text', default: '' })
  summary: string;

  @Column({ default: '' })
  contactName: string;

  @Column({ default: '' })
  contactEmail: string;

  @Column({ default: '' })
  contactPhone: string;

  @Column({ default: '' })
  propertyTitle: string;

  @Column({ default: '' })
  assignedAgent: string;

  @Column({ default: '' })
  budget: string;

  @Column({ default: '' })
  timeline: string;

  @Column({ default: '' })
  interest: string;

  @Column({ type: 'float', default: 0 })
  qualificationScore: number;

  @Column({ default: false })
  autoQualified: boolean;

  @Column({ type: 'int', transformer: numericEnumTransformer(conversationStatuses, PropertyChatConversationStatus.New) })
  status: PropertyChatConversationStatus = PropertyChatConversationStatus.New;

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

  @Column({ type: 'text', default: '' })
  message: string;

  @Column({ type: 'int', transformer: numericEnumTransformer(senderRoles, PropertyChatSenderRole.Visitor) })
  senderRole: PropertyChatSenderRole = PropertyChatSenderRole.Visitor;

  @Column({ nullable: true })
  attachmentUrl: string;

  @Column({ nullable: true })
  attachmentObjectName: string;

  @CreateDateColumn()
  createdAt: Date;
}
