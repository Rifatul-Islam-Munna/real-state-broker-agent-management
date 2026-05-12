import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { UserRole } from '../enums/user-role.enum';
import { Property } from '../../properties/entities/property.entity';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['phone'], { unique: true })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 60 })
  firstName: string;

  @Column({ length: 60 })
  lastName: string;

  @Column({ length: 150 })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.Client,
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ default: false })
  isPhoneVerified: boolean;

  @Column({ nullable: true, select: false })
  refreshToken: string;

  @Column({ type: 'timestamp', nullable: true, select: false })
  refreshTokenExpiry: Date;

  @Column({ nullable: true, select: false })
  passwordResetToken: string;

  @Column({ type: 'timestamp', nullable: true, select: false })
  passwordResetExpiry: Date;

  @Column({ nullable: true, select: false })
  emailVerificationToken: string;

  @Column({ nullable: true })
  licenseNumber: string;

  @Column({ nullable: true })
  agencyName: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionRate: number;

  @Column({ default: false })
  isVerifiedAgent: boolean;

  @Column({ default: false })
  hasCustomAgentRoutePermissions: boolean;

  @Column({ type: 'text', array: true, default: '{}' })
  agentRoutePermissions: string[];

  @Column({ nullable: true })
  nationalId: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  country: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  @OneToMany(() => Property, (property) => property.agent)
  properties: Property[];

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
