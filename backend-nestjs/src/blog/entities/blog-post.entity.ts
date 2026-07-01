import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('blog_post')
export class BlogPost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: '' })
  title: string;

  @Column({ default: '' })
  slug: string;

  @Column({ default: '' })
  excerpt: string;

  @Column({ default: '' })
  category: string;

  @Column({ default: '' })
  coverImageUrl: string;

  @Column({ nullable: true })
  coverImageObjectName: string;

  @Column({ default: '' })
  authorName: string;

  @Column({ default: 5 })
  readTimeMinutes: number;

  @Column({ default: false })
  isFeatured: boolean;

  @Column({ default: true })
  isPublished: boolean;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  @Column({ type: 'jsonb', default: [] })
  highlights: string[];

  @Column({ type: 'jsonb', default: [] })
  paragraphs: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
