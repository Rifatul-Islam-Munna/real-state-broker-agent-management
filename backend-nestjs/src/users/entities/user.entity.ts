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
import { numericEnumTransformer } from '../../common/numeric-enum';

const userRoles = Object.values(UserRole);

@Entity('users')
@Index(['email'], { unique: true })
@Index(['phone'], { unique: true })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 60, default: '' })
  firstName: string;

  @Column({ length: 60, default: '' })
  lastName: string;

  @Column({ length: 150, default: '' })
  email: string;

  @Column({ default: '', select: false })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'int', transformer: numericEnumTransformer(userRoles, UserRole.Client) })
  role: UserRole = UserRole.Client;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ default: false })
  isPhoneVerified: boolean;

  @Column({ type: 'text', nullable: true, select: false })
  refreshToken: string | null;

  @Column({ type: 'timestamp', nullable: true, select: false })
  refreshTokenExpiry: Date;

  @Column({ type: 'text', nullable: true, select: false })
  passwordResetToken: string | null;

  @Column({ type: 'timestamp', nullable: true, select: false })
  passwordResetExpiry: Date;

  @Column({ type: 'text', nullable: true, select: false })
  emailVerificationToken: string | null;

  @Column({ type: 'text', nullable: true })
  licenseNumber: string | null;

  @Column({ type: 'text', nullable: true })
  agencyName: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionRate: number | null;

  @Column({ default: false })
  isVerifiedAgent: boolean;

  @Column({ default: false })
  hasCustomAgentRoutePermissions: boolean;

  @Column({ type: 'text', array: true, default: '{}' })
  agentRoutePermissions: string[];

  @Column({ type: 'text', nullable: true })
  nationalId: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'text', nullable: true })
  city: string | null;

  @Column({ type: 'text', nullable: true })
  country: string | null;

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
