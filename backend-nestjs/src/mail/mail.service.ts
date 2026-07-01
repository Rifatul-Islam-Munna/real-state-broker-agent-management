import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { MailInboxItem, MailInboxStatus, mailInboxStatusDbValue } from './entities/mail.entity';
import { LeadsService } from '../leads/leads.service';
import { paginated, toInt } from '../common/api-contract';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class MailService {
  constructor(
    @InjectRepository(MailInboxItem)
    private mailRepo: Repository<MailInboxItem>,
    private leadsService: LeadsService,
    private settingsService: SettingsService,
  ) {}

  async findAll(page = 1, pageSize = 20, search?: string, status?: string) {
    page = toInt(page, 1);
    pageSize = toInt(pageSize, 20);
    const qb = this.mailRepo.createQueryBuilder('mail').leftJoinAndSelect('mail.lead', 'lead');
    if (search) {
      qb.andWhere('(mail.subject ILIKE :search OR mail.message ILIKE :search OR mail.email ILIKE :search OR mail.name ILIKE :search)', { search: `%${search}%` });
    }
    if (status) qb.andWhere('mail.status = :status', { status: mailInboxStatusDbValue(status) });
    const [items, total] = await qb.orderBy('mail.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return paginated(items.map((item) => this.mapMail(item)), total, page, pageSize);
  }

  async findOne(id: number) {
    const item = await this.mailRepo.findOne({ where: { id }, relations: ['lead'] });
    if (!item) throw new NotFoundException('Mail not found');
    return this.mapMail(item);
  }

  async create(dto: any) {
      const item = this.mailRepo.create({ ...this.toMailEntity(dto), status: MailInboxStatus.New, leadId: null } as DeepPartial<MailInboxItem>);
      return this.mapMail(await this.mailRepo.save(item));
  }

  async send(dto: any) {
    const to = `${dto.to ?? dto.email ?? ''}`.trim().toLowerCase();
    const subject = `${dto.subject ?? ''}`.trim();
    const message = `${dto.message ?? dto.body ?? ''}`.trim();
    const attachmentUrls = this.stringList(dto.attachmentUrls);
    if (!to) throw new BadRequestException('Recipient email is required.');
    if (!subject) throw new BadRequestException('Subject is required.');
    if (!message && attachmentUrls.length === 0) throw new BadRequestException('Message or attachment is required.');
    const config = await this.settingsService.getSmtpConfig();
    if (!config?.host || !config?.username || !config?.password) throw new BadRequestException('SMTP mail is not configured.');
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port ?? 587,
      secure: !!config.useSsl && Number(config.port ?? 587) === 465,
      auth: { user: config.username, pass: config.password },
    });
    await transporter.sendMail({
      from: config.fromName ? `"${config.fromName}" <${config.fromEmail || config.username}>` : (config.fromEmail || config.username),
      to,
      subject,
      text: message,
      html: message.replace(/\n/g, '<br>'),
      attachments: attachmentUrls.map((url) => ({ filename: url.split('/').pop() || 'attachment', path: url })),
    });
    const item = this.mailRepo.create({
      email: to,
      kind: 'Direct',
      message: this.messageBodyWithAttachments(message, attachmentUrls),
      name: `${dto.name ?? to.split('@')[0]}`.trim(),
      status: MailInboxStatus.Replied,
      subject,
    } as DeepPartial<MailInboxItem>);
    return this.mapMail(await this.mailRepo.save(item));
  }

  async update(id: number, dto: any) {
      const item = await this.findOne(id);
      const entity = await this.mailRepo.findOne({ where: { id } });
      if (!entity) throw new NotFoundException('Mail not found');
      Object.assign(entity, this.toMailEntity(dto));
      return this.mapMail(await this.mailRepo.save(entity));
  }

  async convertToLead(id: number) {
    const mail = await this.findOne(id);
    let lead = mail.leadId ? await this.leadsService.findOne(mail.leadId).catch(() => null) : null;
    if (!lead) lead = await this.leadsService.findByEmail(mail.email);
    if (!lead) {
      const now = new Date();
      lead = await this.leadsService.create({ name: mail.name?.trim() || mail.email.split('@')[0], email: mail.email.trim().toLowerCase(), phone: 'Not provided', source: mail.kind === 'Newsletter' ? 'Mail Signup' : 'Mail Inbox', summary: mail.message, interest: mail.subject, notes: [mail.message], stage: 'New', priority: mail.kind === 'Direct' ? 'Warm' : 'FollowUp', inBoard: false, nextActionDate: new Date(now.getTime() + 2 * 86_400_000), nextActionType: 'Review inbox lead', followUpStatus: 'Open', lastActivityAt: now }, 'CRM', false);
    }

    mail.leadId = lead.id;
    mail.status = 'Converted' as any;
    await this.mailRepo.save(mail);
    return lead;
  }

  async delete(id: number) {
    const mail = await this.mailRepo.findOne({ where: { id } });
    if (mail) await this.mailRepo.remove(mail);
  }

  private mapMail(item: MailInboxItem) {
    return {
      id: item.id,
      email: item.email,
      name: item.name,
      subject: item.subject,
      message: item.message,
      kind: item.kind,
      status: item.status,
      leadId: item.leadId ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private toMailEntity(dto: any) {
    return {
      email: `${dto.email ?? dto.fromAddress ?? ''}`.trim().toLowerCase(),
      name: `${dto.name ?? dto.fromName ?? ''}`.trim(),
      subject: `${dto.subject ?? ''}`.trim(),
      message: dto.message ?? dto.body ?? '',
      kind: dto.kind ?? 'Direct',
      status: dto.status ?? 'New',
      leadId: dto.leadId ?? null,
    };
  }

  private stringList(value: any) {
    return Array.isArray(value) ? [...new Set(value.map((item) => `${item ?? ''}`.trim()).filter(Boolean))] : [];
  }

  private messageBodyWithAttachments(message: string, attachmentUrls: string[]) {
    return [message, ...attachmentUrls.map((url) => `Attachment: ${url}`)].filter(Boolean).join('\n');
  }
}
