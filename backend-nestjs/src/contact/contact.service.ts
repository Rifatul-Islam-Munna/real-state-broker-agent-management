import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { ContactRequest, contactStatusDb } from './entities/contact.entity';
import { LeadsService } from '../leads/leads.service';
import { paginated, toInt } from '../common/api-contract';
import { Property } from '../properties/entities/property.entity';
import { isPropertyLeadEligible } from '../properties/property-availability';
import { SettingsService } from '../settings/settings.service';
import { normalizePhoneNumber } from '../common/phone-normalizer';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(ContactRequest) private contactRepo: Repository<ContactRequest>,
    @InjectRepository(Property) private propertyRepo: Repository<Property>,
    private leadsService: LeadsService,
    private settingsService: SettingsService,
  ) {}

  async create(dto: any) {
    const request = this.contactRepo.create({ ...(await this.normalizeRequest(dto)), status: 'New', leadId: null } as DeepPartial<ContactRequest>);
    return this.mapContact(await this.contactRepo.save(request));
  }

  async findAll(page = 1, pageSize = 20, search?: string, status?: string) {
    page = toInt(page, 1); pageSize = toInt(pageSize, 20);
    const qb = this.contactRepo.createQueryBuilder('contact');
    if (search) qb.andWhere('(contact.name ILIKE :search OR contact.email ILIKE :search OR contact.message ILIKE :search OR contact.inquiry_type ILIKE :search)', { search: `%${search}%` });
    if (status) qb.andWhere('contact.status = :status', { status: contactStatusDb(status) });
    const [rows, total] = await qb.orderBy('contact.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return paginated(rows.map((item) => this.mapContact(item)), total, page, pageSize);
  }

  async convertToLead(id: number) {
    const request = await this.contactRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Contact request not found');
    const property = request.propertyId ? await this.propertyRepo.findOne({ where: { id: request.propertyId }, relations: ['agent'] }) : null;
    if (request.propertyId && !isPropertyLeadEligible(property)) throw new NotFoundException('Property is not available for new leads.');

    let lead = request.leadId ? await this.leadsService.findOne(request.leadId).catch(() => null) : null;
    if (!lead) lead = await this.leadsService.findByEmail(request.email);
    if (!lead) {
      const now = new Date();
      lead = await this.leadsService.create({
        name: request.name.trim(), email: request.email.trim().toLowerCase(), phone: request.phone.trim(),
        property: property?.title || request.propertyTitle, propertyId: property?.id ?? null,
        agent: property?.agent ? `${property.agent.firstName ?? ''} ${property.agent.lastName ?? ''}`.trim() : request.agentName,
        agentId: property?.agentId ?? request.agentId ?? undefined, source: 'Contact Form', summary: request.message,
        interest: request.inquiryType, notes: [request.message], stage: 'New', priority: 'Warm', inBoard: false,
        nextActionDate: new Date(now.getTime() + 86_400_000), nextActionType: 'First response', followUpStatus: 'Open', lastActivityAt: now,
      });
      await this.leadsService.createHistory({ leadId: lead.id, kind: 'ContactForm', direction: 'Incoming', status: 'Received', title: 'Website contact form', summary: request.message, body: request.message, createdBy: 'Website' });
    }
    request.leadId = lead.id; request.status = 'Converted'; await this.contactRepo.save(request);
    return lead;
  }

  async delete(id: number) {
    const request = await this.contactRepo.findOne({ where: { id } });
    if (request) await this.contactRepo.remove(request);
  }

  async update(dto: any) {
    const request = await this.contactRepo.findOne({ where: { id: dto.id } });
    if (!request) throw new NotFoundException('Contact request not found');
    Object.assign(request, { ...(await this.normalizeRequest(dto)), status: dto.status ?? request.status });
    return this.mapContact(await this.contactRepo.save(request));
  }

  private async normalizeRequest(dto: any) {
    const settings = await this.settingsService.getAdminSettings();
    const property = dto.propertyId ? await this.propertyRepo.findOne({ where: { id: Number(dto.propertyId) }, relations: ['agent'] }) : null;
    if (dto.propertyId && !isPropertyLeadEligible(property)) throw new NotFoundException('Property is not available.');
    return {
      name: `${dto.name ?? ''}`.trim(), email: `${dto.email ?? ''}`.trim().toLowerCase(),
      phone: normalizePhoneNumber(dto.phone, settings.profile?.defaultPhoneCountry ?? 'US'), message: `${dto.message ?? ''}`,
      inquiryType: `${dto.inquiryType ?? ''}`.trim(), propertyId: property?.id ?? null,
      propertyTitle: property?.title ?? `${dto.propertyTitle ?? ''}`.trim(), agentId: property?.agentId ?? (dto.agentId ? Number(dto.agentId) : null),
      agentName: property?.agent ? `${property.agent.firstName ?? ''} ${property.agent.lastName ?? ''}`.trim() : `${dto.agentName ?? ''}`.trim(),
    };
  }

  private mapContact(item: ContactRequest) {
    return { id: item.id, name: item.name, email: item.email, phone: item.phone ?? '', message: item.message, inquiryType: item.inquiryType ?? '', propertyId: item.propertyId ?? null, propertyTitle: item.propertyTitle ?? '', agentId: item.agentId ?? null, agentName: item.agentName ?? '', status: item.status, leadId: item.leadId ?? null, createdAt: item.createdAt, updatedAt: item.updatedAt };
  }
}
