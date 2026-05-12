import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PropertyChatConversation, PropertyChatMessage } from './entities/property-chat.entity';

@Injectable()
export class PropertyChatService {
  constructor(
    @InjectRepository(PropertyChatConversation)
    private conversationRepo: Repository<PropertyChatConversation>,
    @InjectRepository(PropertyChatMessage)
    private messageRepo: Repository<PropertyChatMessage>,
  ) {}

  async createConversation(dto: any) {
    const conversation = this.conversationRepo.create(dto as object);
    return this.conversationRepo.save(conversation);
  }

  async getConversations(page: number, pageSize: number, search?: string, propertyId?: number, leadId?: number) {
    const query = this.conversationRepo.createQueryBuilder('conv')
      .leftJoinAndSelect('conv.property', 'property')
      .leftJoinAndSelect('conv.lead', 'lead')
      .orderBy('conv.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (propertyId) query.andWhere('conv.propertyId = :propertyId', { propertyId });
    if (leadId) query.andWhere('conv.leadId = :leadId', { leadId });

    const [items, total] = await query.getManyAndCount();
    return { items, total, page, pageSize };
  }

  async getConversation(id: number) {
    const conv = await this.conversationRepo.findOne({
      where: { id },
      relations: ['messages', 'property', 'lead'],
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    return conv;
  }
}
