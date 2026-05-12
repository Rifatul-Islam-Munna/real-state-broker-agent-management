import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('homepage_settings')
export class HomePageSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'Welcome to Elite Estates' })
  heroTitle: string;

  @Column({ type: 'text', nullable: true })
  heroSubtitle: string;

  @Column({ nullable: true })
  heroImageUrl: string;

  @Column({ type: 'jsonb', default: [] })
  featuredPropertyIds: number[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
