import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PropertyChatConversation } from '../../property-chat/entities/property-chat.entity';
import { numericEnumTransformer } from '../../common/numeric-enum';

export enum PropertyCategory {
  Residential = 'Residential',
  Commercial = 'Commercial',
}

export enum PropertyListingType {
  ForSale = 'ForSale',
  ForRent = 'ForRent',
}

export enum PropertyStatus {
  Open = 'Open',
  Closed = 'Closed',
  Draft = 'Draft',
  PendingApproval = 'PendingApproval',
  Active = 'Active',
  UnderOffer = 'UnderOffer',
  Sold = 'Sold',
  Rented = 'Rented',
  Unpublished = 'Unpublished',
}
export const propertyCategories = Object.values(PropertyCategory);
export const propertyListingTypes = Object.values(PropertyListingType);
export const propertyStatuses = Object.values(PropertyStatus);

@Entity('property')
export class Property {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  slug: string;

  @Column()
  title: string;

  @Column({ type: 'int', transformer: numericEnumTransformer(propertyCategories, PropertyCategory.Residential) })
  propertyType: PropertyCategory = PropertyCategory.Residential;

  @Column({ type: 'int', transformer: numericEnumTransformer(propertyListingTypes, PropertyListingType.ForSale) })
  listingType: PropertyListingType = PropertyListingType.ForSale;

  @Column()
  price: string;

  @Column({ type: 'int', transformer: numericEnumTransformer(propertyStatuses, PropertyStatus.Open) })
  status: PropertyStatus = PropertyStatus.Open;

  @Column()
  location: string;

  @Column()
  exactLocation: string;

  @Column()
  bedRoom: string;

  @Column()
  bathRoom: string;

  @Column()
  width: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ nullable: true })
  thumbnailObjectName: string;

  @Column({ type: 'jsonb', default: [] })
  imageUrls: string[];

  @Column({ type: 'jsonb', default: [] })
  imageObjectNames: string[];

  @Column({ type: 'jsonb', default: [] })
  keyAmenities: string[];

  @Column({ type: 'jsonb', default: [] })
  documentRepositoryItemIds: number[];

  @Column({ nullable: true })
  agentId: number;

  @ManyToOne(() => User, (user) => user.properties, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agent_id' })
  agent: User;

  @OneToMany(() => NeighborhoodInsight, (insight) => insight.property, { cascade: true })
  neighborhoodInsights: NeighborhoodInsight[];

  @OneToMany(() => PropertyPreQuestion, (question) => question.property, { cascade: true })
  preQuestions: PropertyPreQuestion[];

  @OneToMany(() => PropertyChatConversation, (chat) => chat.property)
  chatConversations: PropertyChatConversation[];

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('neighborhood_insight')
export class NeighborhoodInsight {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  propertyId: number;

  @ManyToOne(() => Property, (property) => property.neighborhoodInsights, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property: Property;
}

@Entity('property_pre_question')
export class PropertyPreQuestion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  prompt: string;

  @Column({ default: '' })
  helperText: string;

  @Column({ default: true })
  isRequired: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: false })
  allowsFileUpload: boolean;

  @Column({ nullable: true })
  attachmentUrl: string;

  @Column({ nullable: true })
  attachmentObjectName: string;

  @Column()
  propertyId: number;

  @ManyToOne(() => Property, (property) => property.preQuestions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
