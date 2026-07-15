import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LeadCollectionTemplateSourceType {
  InboxEmail = 'InboxEmail',
  PastedHtml = 'PastedHtml',
  PastedText = 'PastedText',
  UploadedHtml = 'UploadedHtml',
}

export enum LeadCollectionSubjectMatchMode {
  Contains = 'Contains',
  Exact = 'Exact',
  Regex = 'Regex',
}

export type LeadCollectionFieldTransform =
  | 'Text'
  | 'Email'
  | 'Phone'
  | 'Number'
  | 'Date';

export type LeadCollectionFieldSource = 'EmailBody' | 'LinkedPage';

export type LeadCollectionFieldMapping = {
  field: string;
  label: string;
  source?: LeadCollectionFieldSource;
  sampleValue: string;
  selectionStart: number;
  selectionEnd: number;
  prefix: string;
  suffix: string;
  occurrence: number;
  required: boolean;
  transform: LeadCollectionFieldTransform;
};

export type LeadCollectionLinkedPageConfig = {
  enabled: boolean;
  allowedHosts: string[];
  urlIncludes: string[];
  linkTextIncludes: string[];
  maxLinks: number;
  selectedUrl?: string;
  openPage?: boolean;
  autoFillContactFields?: boolean;
};

@Index(['name'])
@Index(['providerName'])
@Index(['isActive'])
@Entity('lead_collection_template')
export class LeadCollectionTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', default: '' })
  providerName: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'text', default: LeadCollectionTemplateSourceType.PastedText })
  sourceType: LeadCollectionTemplateSourceType;

  @Column({ type: 'int', nullable: true })
  sourceMailInboxId: number | null;

  @Column({ type: 'text', default: '' })
  sampleFromAddress: string;

  @Column({ type: 'text', default: '' })
  sampleSubject: string;

  @Column({ type: 'jsonb', default: [] })
  senderPatterns: string[];

  @Column({ type: 'jsonb', default: [] })
  mailboxTags: string[];

  @Column({ type: 'text', default: '' })
  subjectPattern: string;

  @Column({ type: 'text', default: LeadCollectionSubjectMatchMode.Contains })
  subjectMatchMode: LeadCollectionSubjectMatchMode;

  @Column({ type: 'jsonb', default: [] })
  bodyFingerprint: string[];

  @Column({ type: 'text', default: '' })
  sourceHtml: string;

  @Column({ type: 'text', default: '' })
  sourceText: string;

  @Column({
    type: 'jsonb',
    default: {
      enabled: false,
      allowedHosts: [],
      urlIncludes: [],
      linkTextIncludes: [],
      maxLinks: 3,
    },
  })
  linkedPageConfig: LeadCollectionLinkedPageConfig;

  @Column({ type: 'text', default: '' })
  linkedPageSampleUrl: string;

  @Column({ type: 'text', default: '' })
  linkedPageSourceHtml: string;

  @Column({ type: 'text', default: '' })
  linkedPageSourceText: string;

  @Column({ type: 'jsonb', default: [] })
  mappings: LeadCollectionFieldMapping[];

  @Column({ type: 'jsonb', default: [] })
  requiredFields: string[];

  @Column({ type: 'double precision', default: 0.82 })
  confidenceThreshold: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  matchCount: number;

  @Column({ type: 'int', default: 0 })
  successCount: number;

  @Column({ type: 'int', default: 0 })
  aiFallbackCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastMatchedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
