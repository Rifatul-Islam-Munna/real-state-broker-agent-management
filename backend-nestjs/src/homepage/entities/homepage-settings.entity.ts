import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('home_page_settings')
export class HomePageSettings {
  @PrimaryColumn({ type: 'int' })
  id: number;

  @Column({ type: 'text', default: '{}' })
  contentJson: string = '{}';

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
