import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactRequest } from './entities/contact.entity';
import { LeadsService } from '../leads/leads.service';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(ContactRequest)
    private contactRepo: Repository<ContactRequest>,
    private leadsService: LeadsService,
  ) {}

  async create(dto: any) {
    const request = this.contactRepo.create(dto as object);
    return this.contactRepo.save(request);
  }

  async findAll() {
    return this.contactRepo.find({ relations: ['lead'] });
  }

  async convertToLead(id: number) {
    const request = await this.contactRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Contact request not found');

    const lead = await this.leadsService.create({
      name: request.name,
      email: request.email,
      phone: request.phone,
      source: 'Contact Form',
    });

    request.leadId = lead.id;
    request.status = 'Converted';
    await this.contactRepo.save(request);

    return lead;
  }

  async delete(id: number) {
    const request = await this.contactRepo.findOne({ where: { id } });
    if (request) await this.contactRepo.remove(request);
  }
}
