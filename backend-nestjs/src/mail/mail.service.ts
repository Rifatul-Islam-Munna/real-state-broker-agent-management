import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailInboxItem } from './entities/mail.entity';
import { LeadsService } from '../leads/leads.service';
import { AiIntelligenceService } from '../common/ai-intelligence.service';

@Injectable()
export class MailService {
  constructor(
    @InjectRepository(MailInboxItem)
    private mailRepo: Repository<MailInboxItem>,
    private leadsService: LeadsService,
    private aiService: AiIntelligenceService,
  ) {}

  async findAll() {
    return this.mailRepo.find({ relations: ['lead'] });
  }

  async findOne(id: number) {
    const item = await this.mailRepo.findOne({ where: { id }, relations: ['lead'] });
    if (!item) throw new NotFoundException('Mail not found');
    return item;
  }

  async create(dto: any) {
      const item = this.mailRepo.create(dto as object);
      return this.mailRepo.save(item);
  }

  async update(id: number, dto: any) {
      const item = await this.findOne(id);
      Object.assign(item, dto);
      return this.mailRepo.save(item);
  }

  async convertToLead(id: number) {
    const mail = await this.findOne(id);

    const analysis = await this.aiService.analyzeEmail(mail.body);

    const lead = await this.leadsService.create({
      name: mail.fromName,
      email: mail.fromAddress,
      source: 'Email',
      summary: analysis.summary,
    });

    mail.leadId = lead.id;
    await this.mailRepo.save(mail);
    return lead;
  }

  async delete(id: number) {
    const mail = await this.mailRepo.findOne({ where: { id } });
    if (mail) await this.mailRepo.remove(mail);
  }
}
