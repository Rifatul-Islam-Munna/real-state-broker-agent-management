import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './entities/lead.entity';
import { LeadHistoryEntry } from './entities/lead-history.entity';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private leadsRepository: Repository<Lead>,
    @InjectRepository(LeadHistoryEntry)
    private historyRepository: Repository<LeadHistoryEntry>,
  ) {}

  async findAll(): Promise<Lead[]> {
    return this.leadsRepository.find({
      relations: ['assignedAgent', 'deals'],
    });
  }

  async findOne(id: number): Promise<Lead> {
    const lead = await this.leadsRepository.findOne({
      where: { id },
      relations: ['assignedAgent', 'deals'],
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async create(createDto: any): Promise<Lead> {
    const lead = this.leadsRepository.create(createDto as object);
    return this.leadsRepository.save(lead);
  }

  async update(id: number, updateDto: any): Promise<Lead> {
    const lead = await this.findOne(id);
    Object.assign(lead, updateDto);
    return this.leadsRepository.save(lead);
  }

  async delete(id: number): Promise<Lead> {
    const lead = await this.findOne(id);
    return this.leadsRepository.remove(lead);
  }

  async getHistory(leadId: number) {
    return this.historyRepository.find({ where: { leadId }, order: { createdAt: 'DESC' } });
  }

  async createHistory(dto: any) {
    const entry = this.historyRepository.create(dto as object);
    return this.historyRepository.save(entry);
  }
}
