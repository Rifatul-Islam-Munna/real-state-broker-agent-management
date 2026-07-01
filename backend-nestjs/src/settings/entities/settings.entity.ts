import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('agency_settings')
export class AgencySettings {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ type: 'text', default: '{}' })
  contentJson: string = '{}';

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
