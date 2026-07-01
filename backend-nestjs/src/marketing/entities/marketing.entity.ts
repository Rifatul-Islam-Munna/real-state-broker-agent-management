import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('marketing_settings')
export class MarketingSettings {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ type: 'text', default: '{}' })
  contentJson: string = '{}';

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
