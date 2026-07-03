import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import {
  DealPipeline,
  DealChecklistItem,
  dealStages,
} from './entities/deal-pipeline.entity';
import { numericEnumValue } from '../common/numeric-enum';
import { LeadsService } from '../leads/leads.service';
import { paginated, toInt } from '../common/api-contract';

@Injectable()
export class DealsService {
  constructor(
    @InjectRepository(DealPipeline)
    private dealRepository: Repository<DealPipeline>,
    @InjectRepository(DealChecklistItem)
    private checklistRepository: Repository<DealChecklistItem>,
    private leadsService: LeadsService,
  ) {}

  async findAll(page = 1, pageSize = 20, search?: string, stage?: string): Promise<any> {
    page = toInt(page, 1);
    pageSize = toInt(pageSize, 20);
    const qb = this.dealRepository.createQueryBuilder('deal')
      .leftJoinAndSelect('deal.dealOwner', 'dealOwner')
      .leftJoinAndSelect('deal.sourceLead', 'sourceLead')
      .leftJoinAndSelect('deal.checklistItems', 'checklistItems');

    if (search) {
      qb.andWhere('(deal.title ILIKE :search OR deal.client ILIKE :search OR deal.agent ILIKE :search OR deal.note ILIKE :search)', { search: `%${search}%` });
    }
    if (stage) qb.andWhere('deal.stage = :stage', { stage: numericEnumValue(dealStages, stage) });

    const [rows, total] = await qb
      .orderBy('deal.updatedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return paginated(rows.map((deal) => this.mapDeal(deal)), total, page, pageSize);
  }

  async findOne(id: number): Promise<any> {
    const deal = await this.dealRepository.findOne({
      where: { id },
      relations: ['dealOwner', 'sourceLead', 'checklistItems'],
    });
    if (!deal) throw new NotFoundException('Deal not found');
    return this.mapDeal(deal);
  }

  async create(createDto: any): Promise<any> {
    const { checklistItems, ...fields } = this.writeFields(createDto);
    const deal = this.dealRepository.create(fields as DeepPartial<DealPipeline>);
    const saved = await this.dealRepository.save(deal);

    if (Array.isArray(checklistItems)) {
      await this.replaceChecklist(saved.id, checklistItems);
    }

    return this.findOne(saved.id);
  }

  async update(id: number, updateDto: any): Promise<any> {
    const deal = await this.dealRepository.findOne({ where: { id } });
    if (!deal) throw new NotFoundException('Deal not found');

    const { checklistItems, ...fields } = this.writeFields(updateDto);
    Object.assign(deal, fields);
    await this.dealRepository.save(deal);

    if (Array.isArray(checklistItems)) {
      await this.replaceChecklist(id, checklistItems);
    }

    return this.findOne(id);
  }

  async delete(id: number): Promise<DealPipeline> {
    const deal = await this.dealRepository.findOne({ where: { id } });
    if (!deal) throw new NotFoundException('Deal not found');
    return this.dealRepository.remove(deal);
  }

  async convertFromLead(dto: any) {
    const lead = await this.leadsService.findOne(dto.leadId);
    return this.create({
      title: `Deal for ${lead.name}`,
      client: lead.name,
      sourceLeadId: lead.id,
      agentId: lead.agentId,
    });
  }

  private writeFields(dto: any) {
    const {
      id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      sourceLeadName: _sourceLeadName,
      dealOwnerName: _dealOwnerName,
      checklistItems,
      ...fields
    } = dto ?? {};

    if ('expectedClosingDate' in fields) {
      fields.expectedClosingDate = fields.expectedClosingDate
        ? new Date(fields.expectedClosingDate)
        : null;
    }

    return { checklistItems, ...fields };
  }

  private async replaceChecklist(dealPipelineId: number, items: any[]) {
    await this.checklistRepository.delete({ dealPipelineId });

    const checklistItems = items
      .map((item, index) => ({
        dealPipelineId,
        title: `${item?.title ?? ''}`.trim(),
        isCompleted: !!item?.isCompleted,
        sortOrder: Number.isFinite(Number(item?.sortOrder))
          ? Number(item.sortOrder)
          : index + 1,
      }))
      .filter((item) => item.title.length > 0);

    if (checklistItems.length === 0) return;

    await this.checklistRepository.save(
      checklistItems.map((item) => this.checklistRepository.create(item)),
    );
  }

  private mapDeal(deal: DealPipeline) {
    return {
      id: deal.id,
      title: deal.title,
      type: deal.type,
      client: deal.client,
      value: Number(deal.value ?? 0),
      commissionRate: Number(deal.commissionRate ?? 0),
      commissionAmount: Number(deal.commissionAmount ?? 0),
      commissionStatus: deal.commissionStatus,
      commissionPayoutNote: deal.commissionPayoutNote,
      stage: deal.stage,
      deadline: deal.deadline,
      expectedClosingDate: deal.expectedClosingDate ?? null,
      note: deal.note,
      agent: deal.agent,
      agentId: deal.agentId ?? null,
      dealOwnerName: deal.dealOwner ? `${deal.dealOwner.firstName ?? ''} ${deal.dealOwner.lastName ?? ''}`.trim() : null,
      sourceLeadId: deal.sourceLeadId ?? null,
      sourceLeadName: deal.sourceLead?.name ?? null,
      checklistItems: (deal.checklistItems ?? [])
        .sort((a, b) => (a.sortOrder - b.sortOrder) || (a.id - b.id))
        .map((item) => ({
          id: item.id,
          title: item.title,
          isCompleted: item.isCompleted,
          sortOrder: item.sortOrder,
        })),
      createdAt: deal.createdAt,
      updatedAt: deal.updatedAt,
    };
  }
}
