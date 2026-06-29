import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

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
    if (await this.usersRepository.exists({ where: { email } })) throw new BadRequestException('Email already exists');
    if (dto.phone && await this.usersRepository.exists({ where: { phone: dto.phone } })) throw new BadRequestException('Phone already exists');
    const { password, useCustomAgentRoutePermissions, ...rest } = dto;
    const agent = this.usersRepository.create({
      ...rest,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: UserRole.Agent,
      hasCustomAgentRoutePermissions: !!useCustomAgentRoutePermissions,
      agentRoutePermissions: useCustomAgentRoutePermissions ? (dto.agentRoutePermissions ?? []) : [],
    });
    return this.mapAgent(await this.usersRepository.save(agent));
  }

  async updateAgent(dto: any) {
    const agent = await this.usersRepository.findOne({ where: { id: dto.id, role: UserRole.Agent } });
    if (!agent) throw new BadRequestException('Agent not found');
    Object.assign(agent, dto);
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
    agent.agentRoutePermissions = agent.hasCustomAgentRoutePermissions ? (dto.agentRoutePermissions ?? []) : [];
    return this.mapAgent(await this.usersRepository.save(agent));
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
    if (!user.hasCustomAgentRoutePermissions) return ['dashboard', 'properties', 'deal-pipeline', 'lead', 'mail', 'settings'];
    return user.agentRoutePermissions ?? [];
  }
}
