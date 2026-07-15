import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('sticky_notes')
@Index(['userId', 'updatedAt'])
export class StickyNote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ length: 160, default: 'New note' })
  title: string;

  @Column({ type: 'text', default: '' })
  body: string;

  @Column({ type: 'float', default: 24 })
  x: number;

  @Column({ type: 'float', default: 24 })
  y: number;

  @Column({ length: 20, default: 'amber' })
  color: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
