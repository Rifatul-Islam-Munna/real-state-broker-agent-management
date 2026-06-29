import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactRequest, contactStatusDb } from './entities/contact.entity';
import { LeadsService } from '../leads/leads.service';
import { paginated, toInt } from '../common/api-contract';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(ContactRequest)
    private contactRepo: Repository<ContactRequest>,
    private leadsService: LeadsService,
  ) {}

  async create(dto: any) {
    const request = this.contactRepo.create({ ...dto, name: `${dto.name ?? ''}`.trim(), email: `${dto.email ?? ''}`.trim().toLowerCase(), phone: `${dto.phone ?? ''}`.trim(), message: `${dto.message ?? ''}`, inquiryType: `${dto.inquiryType ?? ''}`.trim(), status: 'New', leadId: null });
    return this.mapContact(await this.contactRepo.save(request));
  }

  async findAll(page = 1, pageSize = 20, search?: string, status?: string) {
    page = toInt(page, 1);
    pageSize = toInt(pageSize, 20);
    const qb = this.contactRepo.createQueryBuilder('contact');
    if (search) {
      qb.andWhere('(contact.name ILIKE :search OR contact.email ILIKE :search OR contact.message ILIKE :search OR contact.inquiry_type ILIKE :search)', { search: `%${search}%` });
    }
    if (status) qb.andWhere('contact.status = :status', { status: contactStatusDb(status) });
    const [rows, total] = await qb.orderBy('contact.created_at', 'DESC').skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return paginated(rows.map((item) => this.mapContact(item)), total, page, pageSize);
  }

  async convertToLead(id: number) {
    const request = await this.contactRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Contact request not found');

    let lead = request.leadId ? await this.leadsService.findOne(request.leadId).catch(() => null) : null;
    if (!lead) lead = await this.leadsService.findByEmail(request.email);
    if (!lead) {
      const now = new Date();
      lead = await this.leadsService.create({ name: request.name.trim(), email: request.email.trim().toLowerCase(), phone: request.phone.trim(), source: 'Contact Form', summary: request.message, interest: request.inquiryType, notes: [request.message], stage: 'New', priority: 'Warm', inBoard: false, nextActionDate: new Date(now.getTime() + 86_400_000), nextActionType: 'First response', followUpStatus: 'Open', lastActivityAt: now });
      await this.leadsService.createHistory({ leadId: lead.id, kind: 'ContactForm', direction: 'Incoming', status: 'Received', title: 'Website contact form', summary: request.message, body: request.message, createdBy: 'Website' });
    }

    request.leadId = lead.id;
    request.status = 'Converted';
    await this.contactRepo.save(request);

    return lead;
  }

  async delete(id: number) {
    const request = await this.contactRepo.findOne({ where: { id } });
    if (request) await this.contactRepo.remove(request);
  }

  async update(dto: any) {
    const request = await this.contactRepo.findOne({ where: { id: dto.id } });
    if (!request) throw new NotFoundException('Contact request not found');
    Object.assign(request, { name: `${dto.name ?? ''}`.trim(), email: `${dto.email ?? ''}`.trim().toLowerCase(), phone: `${dto.phone ?? ''}`.trim(), message: `${dto.message ?? ''}`, inquiryType: `${dto.inquiryType ?? ''}`.trim(), status: dto.status ?? request.status });
    return this.mapContact(await this.contactRepo.save(request));
  }

  private mapContact(item: ContactRequest) {
    return {
      id: item.id,
      name: item.name,
      email: item.email,
      phone: item.phone ?? '',
      message: item.message,
      inquiryType: item.inquiryType ?? '',
      status: item.status,
      leadId: item.leadId ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
