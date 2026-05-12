import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DealPipeline, DealChecklistItem } from './entities/deal-pipeline.entity';
import { LeadsService } from '../leads/leads.service';

@Injectable()
export class DealsService {
  constructor(
    @InjectRepository(DealPipeline)
    private dealRepository: Repository<DealPipeline>,
    @InjectRepository(DealChecklistItem)
    private checklistRepository: Repository<DealChecklistItem>,
    private leadsService: LeadsService,
  ) {}

  async findAll(): Promise<DealPipeline[]> {
    return this.dealRepository.find({
      relations: ['dealOwner', 'sourceLead', 'checklistItems'],
    });
  }

  async findOne(id: number): Promise<DealPipeline> {
    const deal = await this.dealRepository.findOne({
      where: { id },
      relations: ['dealOwner', 'sourceLead', 'checklistItems'],
    });
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  async create(createDto: any): Promise<DealPipeline> {
    const deal = this.dealRepository.create(createDto as object);
    return this.dealRepository.save(deal);
  }

  async update(id: number, updateDto: any): Promise<DealPipeline> {
    const deal = await this.findOne(id);
    Object.assign(deal, updateDto);
    return this.dealRepository.save(deal);
  }

  async delete(id: number): Promise<DealPipeline> {
    const deal = await this.findOne(id);
    return this.dealRepository.remove(deal);
  }

  async convertFromLead(dto: any) {
    const lead = await this.leadsService.findOne(dto.leadId);
    const deal = await this.create({
      title: `Deal for ${lead.name}`,
      client: lead.name,
      sourceLeadId: lead.id,
      agentId: lead.agentId,
    });
    return deal;
  }
}
