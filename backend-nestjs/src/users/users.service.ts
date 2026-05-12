import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: ['id', 'email', 'passwordHash', 'firstName', 'lastName', 'role', 'isActive'],
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
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
    });
  }

  async getAgents(includeInactive: boolean = false) {
    const query: any = { role: UserRole.Agent, deletedAt: IsNull() };
    if (!includeInactive) {
      query.isActive = true;
    }
    return this.usersRepository.find({ where: query });
  }

  async getPublicAgents() {
    return this.usersRepository.find({
      where: { role: UserRole.Agent, isActive: true, deletedAt: IsNull() },
    });
  }

  async createAgent(dto: any) {
    const agent = this.usersRepository.create({ ...dto, role: UserRole.Agent });
    return this.usersRepository.save(agent);
  }

  async updateAgent(dto: any) {
    const agent = await this.usersRepository.findOne({ where: { id: dto.id, role: UserRole.Agent } });
    if (!agent) throw new Error('Agent not found');
    Object.assign(agent, dto);
    return this.usersRepository.save(agent);
  }

  async deleteAgent(id: number) {
    const agent = await this.usersRepository.findOne({ where: { id, role: UserRole.Agent } });
    if (!agent) throw new Error('Agent not found');
    agent.deletedAt = new Date();
    agent.isActive = false;
    return this.usersRepository.save(agent);
  }
}
