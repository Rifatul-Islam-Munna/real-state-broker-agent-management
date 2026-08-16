import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, IsNull } from 'typeorm';
import { User } from './entities/user.entity';
import { AllAgentRoutePermissions, UserRole } from './enums/user-role.enum';
import { TenantUserRole } from '../security/tenant-user-role.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultAdmin();
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: email.toLowerCase().trim() },
      select: ['id', 'email', 'passwordHash', 'firstName', 'lastName', 'role', 'isActive'],
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.usersRepository.exists({ where: { email: email.toLowerCase().trim() } });
  }

  async existsByPhone(phone: string): Promise<boolean> {
    return this.usersRepository.exists({ where: { phone } });
  }

  async update(id: number, attrs: Partial<User>) {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    Object.assign(user, attrs);
    return this.usersRepository.save(user);
  }

  async create(user: Partial<User>) {
    const newUser = this.usersRepository.create(user);
    return this.usersRepository.save(newUser);
  }

  async findOneByRefreshToken(refreshToken: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { refreshToken },
      select: ['id', 'email', 'passwordHash', 'firstName', 'lastName', 'role', 'isActive', 'refreshToken', 'refreshTokenExpiry'],
    });
  }

  async getAgents(includeInactive: boolean = false) {
    const query: any = { role: UserRole.Agent, deletedAt: IsNull() };
    if (!includeInactive) {
      query.isActive = true;
    }
    const users = await this.usersRepository.find({ where: query, relations: ['properties'], order: { firstName: 'ASC', lastName: 'ASC' } });
    return users.map((user) => this.mapAgent(user));
  }

  async getPublicAgents() {
    const users = await this.usersRepository.find({
      where: { role: UserRole.Agent, isActive: true, deletedAt: IsNull() },
      relations: ['properties'],
    });
    return users
      .sort((a, b) => Number(b.isVerifiedAgent) - Number(a.isVerifiedAgent) || (b.properties?.length ?? 0) - (a.properties?.length ?? 0) || Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
      .map((user) => ({
        id: user.id,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        agencyName: user.agencyName,
        bio: user.bio,
        isVerifiedAgent: user.isVerifiedAgent,
        propertyCount: user.properties?.length ?? 0,
      }));
  }

  async createAgent(dto: any) {
    if (!dto.firstName?.trim()) throw new BadRequestException('First name is required');
    if (!dto.lastName?.trim()) throw new BadRequestException('Last name is required');
    if (!dto.email?.trim()) throw new BadRequestException('Email is required');
    if (!dto.password || dto.password.length < 6) throw new BadRequestException('Password must be at least 6 characters');

    const email = dto.email.toLowerCase().trim();
    const phone = `${dto.phone ?? ''}`.trim() || null;
    if (await this.usersRepository.exists({ where: { email } })) throw new BadRequestException('Email already exists');
    if (phone && await this.usersRepository.exists({ where: { phone } })) throw new BadRequestException('Phone already exists');

    const useCustomPermissions = !!dto.useCustomAgentRoutePermissions;
    const agent = this.usersRepository.create({
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      email,
      passwordHash: await bcrypt.hash(dto.password, 10),
      phone,
      avatarUrl: `${dto.avatarUrl ?? ''}`.trim() || null,
      agencyName: `${dto.agencyName ?? ''}`.trim() || null,
      licenseNumber: `${dto.licenseNumber ?? ''}`.trim() || null,
      commissionRate: dto.commissionRate ?? null,
      bio: `${dto.bio ?? ''}`.trim() || null,
      isActive: dto.isActive !== false,
      isVerifiedAgent: !!dto.isVerifiedAgent,
      role: UserRole.Agent,
      hasCustomAgentRoutePermissions: useCustomPermissions,
      agentRoutePermissions: useCustomPermissions
        ? this.normalizeAgentPermissions(dto.agentRoutePermissions)
        : [],
    } as DeepPartial<User>);

    return this.mapAgent(await this.usersRepository.save(agent));
  }

  async updateAgent(dto: any) {
    const agent = await this.usersRepository.findOne({
      where: { id: Number(dto.id), role: UserRole.Agent, deletedAt: IsNull() },
      relations: ['properties'],
    });
    if (!agent) throw new BadRequestException('Agent not found');

    const firstName = `${dto.firstName ?? agent.firstName}`.trim();
    const lastName = `${dto.lastName ?? agent.lastName}`.trim();
    const email = `${dto.email ?? agent.email}`.trim().toLowerCase();
    const phone = `${dto.phone ?? ''}`.trim() || null;

    if (!firstName) throw new BadRequestException('First name is required');
    if (!lastName) throw new BadRequestException('Last name is required');
    if (!email) throw new BadRequestException('Email is required');

    const emailOwner = await this.usersRepository.findOne({ where: { email } });
    if (emailOwner && emailOwner.id !== agent.id) {
      throw new BadRequestException('Email already exists');
    }

    if (phone) {
      const phoneOwner = await this.usersRepository.findOne({ where: { phone } });
      if (phoneOwner && phoneOwner.id !== agent.id) {
        throw new BadRequestException('Phone already exists');
      }
    }

    agent.firstName = firstName;
    agent.lastName = lastName;
    agent.email = email;
    agent.phone = phone;
    agent.avatarUrl = `${dto.avatarUrl ?? ''}`.trim() || null;
    agent.agencyName = `${dto.agencyName ?? ''}`.trim() || null;
    agent.licenseNumber = `${dto.licenseNumber ?? ''}`.trim() || null;
    agent.commissionRate = dto.commissionRate ?? null;
    agent.bio = `${dto.bio ?? ''}`.trim() || null;
    agent.isActive = dto.isActive !== false;
    agent.isVerifiedAgent = !!dto.isVerifiedAgent;

    if (`${dto.password ?? ''}`.trim()) {
      if (`${dto.password}`.length < 6) {
        throw new BadRequestException('Password must be at least 6 characters');
      }
      agent.passwordHash = await bcrypt.hash(`${dto.password}`, 10);
    }

    if (typeof dto.useCustomAgentRoutePermissions === 'boolean') {
      agent.hasCustomAgentRoutePermissions = dto.useCustomAgentRoutePermissions;
      agent.agentRoutePermissions = agent.hasCustomAgentRoutePermissions
        ? this.normalizeAgentPermissions(dto.agentRoutePermissions)
        : [];
    }

    return this.mapAgent(await this.usersRepository.save(agent));
  }

  async deleteAgent(id: number) {
    const agent = await this.usersRepository.findOne({ where: { id, role: UserRole.Agent } });
    if (!agent) throw new NotFoundException('Agent not found');
    agent.deletedAt = new Date();
    agent.isActive = false;
    await this.usersRepository.save(agent);
  }

  async updateAgentPermissions(dto: any) {
    const agent = await this.usersRepository.findOne({ where: { id: dto.agentId, role: UserRole.Agent, deletedAt: IsNull() }, relations: ['properties'] });
    if (!agent) throw new NotFoundException('Agent not found');
    agent.hasCustomAgentRoutePermissions = !!dto.useCustomAgentRoutePermissions;
    agent.agentRoutePermissions = agent.hasCustomAgentRoutePermissions
      ? this.normalizeAgentPermissions(dto.agentRoutePermissions)
      : [];
    return this.mapAgent(await this.usersRepository.save(agent));
  }

  async getTenantStaff(tenantId: number, includeInactive = false) {
    const where: any = { tenantId, tenantRole: TenantUserRole.Staff, role: UserRole.Agent, deletedAt: IsNull() };
    if (!includeInactive) where.isActive = true;
    const users = await this.usersRepository.find({ where, order: { firstName: 'ASC', lastName: 'ASC' } });
    return users.map((user) => this.mapAgent(user));
  }

  async createTenantStaff(tenantId: number, dto: any) {
    if (!dto.firstName?.trim() || !dto.lastName?.trim()) throw new BadRequestException('First and last name are required');
    if (!dto.email?.trim()) throw new BadRequestException('Email is required');
    if (!dto.password || `${dto.password}`.length < 6) throw new BadRequestException('Password must be at least 6 characters');
    const email = `${dto.email}`.toLowerCase().trim();
    const phone = `${dto.phone ?? ''}`.trim() || null;
    if (await this.usersRepository.exists({ where: { email } })) throw new BadRequestException('Email already exists');
    if (phone && await this.usersRepository.exists({ where: { phone } })) throw new BadRequestException('Phone already exists');
    const user = this.usersRepository.create({
      firstName: `${dto.firstName}`.trim(), lastName: `${dto.lastName}`.trim(), email, phone,
      passwordHash: await bcrypt.hash(`${dto.password}`, 10), role: UserRole.Agent,
      tenantRole: TenantUserRole.Staff, tenantId, isActive: dto.isActive !== false,
      agencyName: `${dto.agencyName ?? ''}`.trim() || null,
      hasCustomAgentRoutePermissions: true,
      agentRoutePermissions: this.normalizeAgentPermissions(dto.agentRoutePermissions),
    } as DeepPartial<User>);
    return this.mapAgent(await this.usersRepository.save(user));
  }

  async updateTenantStaff(tenantId: number, dto: any) {
    const staff = await this.usersRepository.findOne({ where: { id: Number(dto.id), tenantId, tenantRole: TenantUserRole.Staff, role: UserRole.Agent, deletedAt: IsNull() } });
    if (!staff) throw new NotFoundException('Staff member not found');
    if (dto.firstName != null) staff.firstName = `${dto.firstName}`.trim() || staff.firstName;
    if (dto.lastName != null) staff.lastName = `${dto.lastName}`.trim() || staff.lastName;
    if (dto.isActive != null) staff.isActive = dto.isActive !== false;
    if (`${dto.password ?? ''}`.trim()) {
      if (`${dto.password}`.length < 6) throw new BadRequestException('Password must be at least 6 characters');
      staff.passwordHash = await bcrypt.hash(`${dto.password}`, 10);
    }
    staff.hasCustomAgentRoutePermissions = true;
    if (Array.isArray(dto.agentRoutePermissions)) staff.agentRoutePermissions = this.normalizeAgentPermissions(dto.agentRoutePermissions);
    return this.mapAgent(await this.usersRepository.save(staff));
  }

  async deleteTenantStaff(tenantId: number, id: number) {
    const staff = await this.usersRepository.findOne({ where: { id, tenantId, tenantRole: TenantUserRole.Staff, role: UserRole.Agent, deletedAt: IsNull() } });
    if (!staff) throw new NotFoundException('Staff member not found');
    staff.deletedAt = new Date();
    staff.isActive = false;
    await this.usersRepository.save(staff);
  }

  async updateTenantStaffPermissions(tenantId: number, dto: any) {
    return this.updateTenantStaff(tenantId, { id: dto.agentId ?? dto.id, agentRoutePermissions: dto.agentRoutePermissions });
  }

  mapUser(user: User) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      tenantId: user.tenantId,
      tenantRole: user.tenantRole,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      agentRoutePermissions: this.effectivePermissionsForAuth(user),
    };
  }

  private mapAgent(user: User) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      agencyName: user.agencyName,
      licenseNumber: user.licenseNumber,
      commissionRate: user.commissionRate,
      role: user.role,
      tenantId: user.tenantId,
      tenantRole: user.tenantRole,
      isActive: user.isActive,
      isVerifiedAgent: user.isVerifiedAgent,
      bio: user.bio,
      createdAt: user.createdAt,
      propertyCount: user.properties?.length ?? 0,
      hasCustomAgentRoutePermissions: user.hasCustomAgentRoutePermissions,
      agentRoutePermissions: this.effectivePermissionsForAuth(user),
    };
  }

  effectivePermissionsForAuth(user: User) {
    if (user.role !== UserRole.Agent) return [];
    if (user.tenantRole === TenantUserRole.Staff) {
      return user.hasCustomAgentRoutePermissions ? this.normalizeAgentPermissions(user.agentRoutePermissions) : [];
    }
    if (!user.hasCustomAgentRoutePermissions) return ['dashboard', 'properties', 'deal-pipeline', 'lead', 'mail', 'settings'];
    return user.agentRoutePermissions ?? [];
  }

  private normalizeAgentPermissions(value: unknown) {
    if (!Array.isArray(value)) return [];
    const allowed = new Set(AllAgentRoutePermissions);
    return Array.from(new Set(value.map((item) => `${item}`.trim()).filter((item) => allowed.has(item))));
  }

  private async ensureDefaultAdmin() {
    const isProduction = process.env.NODE_ENV === 'production';
    const configuredEmail = `${process.env.DEFAULT_ADMIN_EMAIL ?? ''}`.trim().toLowerCase();
    const configuredPassword = `${process.env.DEFAULT_ADMIN_PASSWORD ?? ''}`;
    const configuredFirstName = `${process.env.DEFAULT_ADMIN_FIRST_NAME ?? 'System'}`.trim() || 'System';
    const configuredLastName = `${process.env.DEFAULT_ADMIN_LAST_NAME ?? 'Admin'}`.trim() || 'Admin';

   

    const email = configuredEmail || 'test@gmail.com';
    const password = configuredPassword || '11111111';
    const existing = await this.usersRepository.findOne({
      where: { email },
      select: ['id', 'email', 'passwordHash', 'firstName', 'lastName', 'role', 'isActive'],
    });

    if (existing) {
      let changed = false;
      if (existing.role !== UserRole.Admin) {
        existing.role = UserRole.Admin;
        changed = true;
      }
      if (!existing.isActive) {
        existing.isActive = true;
        changed = true;
      }
      if (!existing.passwordHash) {
        existing.passwordHash = await bcrypt.hash(password, 10);
        changed = true;
      }
      if (changed) await this.usersRepository.save(existing);
      return;
    }

    await this.usersRepository.save(this.usersRepository.create({
      firstName: configuredFirstName,
      lastName: configuredLastName,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: UserRole.Admin,
      isActive: true,
      isEmailVerified: true,
    } as DeepPartial<User>));
    this.logger.log(`Default admin created: ${email}`);
  }
}
