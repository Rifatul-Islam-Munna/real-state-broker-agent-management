import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('marketing_settings')
export class MarketingSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: true })
  enableEmailMarketing: boolean;

  @Column({ default: false })
  enableSmsMarketing: boolean;

  @Column({ nullable: true })
  mailchimpApiKey: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
