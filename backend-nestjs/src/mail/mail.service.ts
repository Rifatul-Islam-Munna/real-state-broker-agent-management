import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailInboxItem } from './entities/mail.entity';
import { LeadsService } from '../leads/leads.service';

@Injectable()
export class MailService {
  constructor(
    @InjectRepository(MailInboxItem)
    private mailRepo: Repository<MailInboxItem>,
    private leadsService: LeadsService,
  ) {}

  async findAll() {
    return this.mailRepo.find({ relations: ['lead'] });
  }

  async convertToLead(id: number) {
    const mail = await this.mailRepo.findOne({ where: { id } });
    if (!mail) throw new NotFoundException('Mail not found');

    const lead = await this.leadsService.create({
      name: mail.fromName,
      email: mail.fromAddress,
      source: 'Email',
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
