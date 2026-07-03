import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('agency_scheduling_settings')
export class AgencySchedulingSettings {
  @PrimaryColumn({ default: 1 })
  id: number;

  @Column({ default: 'UTC' })
  timeZone: string;

  @Column({ type: 'int', default: 9 })
  morningOutreachHour: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
