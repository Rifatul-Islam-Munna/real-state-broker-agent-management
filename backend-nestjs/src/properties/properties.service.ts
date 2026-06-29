import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property, PropertyStatus, NeighborhoodInsight, PropertyPreQuestion, propertyCategories, propertyListingTypes, propertyStatuses } from './entities/property.entity';
import { numericEnumValue } from '../common/numeric-enum';
import { PredictionService } from '../prediction/prediction.service';
import { paginated, text, toInt } from '../common/api-contract';
import { BrokerageService } from '../brokerage/brokerage.service';
import { ApprovalType } from '../brokerage/entities/brokerage.entity';
import { AuditAction, AuditEntityType } from '../brokerage/entities/audit-log.entity';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
    @InjectRepository(NeighborhoodInsight)
    private insightRepository: Repository<NeighborhoodInsight>,
    @InjectRepository(PropertyPreQuestion)
    private questionRepository: Repository<PropertyPreQuestion>,
    private predictionService: PredictionService,
    private brokerageService: BrokerageService,
  ) {}

  async findAll(page = 1, pageSize = 10, search?: string, propertyType?: string, listingType?: string, status?: string, agent?: string): Promise<any> {
    page = toInt(page, 1);
    pageSize = toInt(pageSize, 10);
    const qb = this.propertyRepository.createQueryBuilder('property')
      .leftJoinAndSelect('property.neighborhoodInsights', 'neighborhoodInsights')
      .leftJoinAndSelect('property.preQuestions', 'preQuestions')
      .leftJoinAndSelect('property.agent', 'agent');

    if (search) {
      qb.andWhere('(property.title ILIKE :search OR property.location ILIKE :search OR property.exact_location ILIKE :search OR property.description ILIKE :search)', { search: `%${search}%` });
    }
    if (propertyType) qb.andWhere('property.property_type = :propertyType', { propertyType: numericEnumValue(propertyCategories, propertyType) });
    if (listingType) qb.andWhere('property.listing_type = :listingType', { listingType: numericEnumValue(propertyListingTypes, listingType) });
    if (status) qb.andWhere('property.status = :status', { status: numericEnumValue(propertyStatuses, status) });
    if (agent) qb.andWhere("concat(agent.first_name, ' ', agent.last_name) ILIKE :agent", { agent: `%${agent}%` });

    const [properties, total] = await qb
      .orderBy('property.updated_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const items = await Promise.all(properties.map(p => this.mapProperty(p)));
    return paginated(items, total, page, pageSize);
  }

  async getFilters() {
    const rows = await this.propertyRepository.find({
      select: ['propertyType', 'listingType', 'location'],
      where: [{ status: 'Open' as any }, { status: 'Active' as any }, { status: 'UnderOffer' as any }],
    });
    return {
      propertyTypes: [...new Set(rows.map((item) => item.propertyType).filter(Boolean))].sort(),
      listingTypes: [...new Set(rows.map((item) => item.listingType).filter(Boolean))].sort(),
      locations: [...new Set(rows.map((item) => text(item.location).trim()).filter(Boolean))].sort().slice(0, 12),
    };
  }

  async findRawAll(): Promise<any[]> {
    const properties = await this.propertyRepository.find({
      relations: ['neighborhoodInsights', 'preQuestions', 'agent'],
    });
    return Promise.all(properties.map(p => this.mapProperty(p)));
  }

  async findOne(id: number): Promise<any> {
    const property = await this.propertyRepository.findOne({
      where: { id },
      relations: ['neighborhoodInsights', 'preQuestions', 'agent'],
    });
    if (!property) throw new NotFoundException('Property not found');
    return this.mapProperty(property);
  }

  async findBySlug(slug: string): Promise<any> {
    const property = await this.propertyRepository.findOne({
      where: { slug },
      relations: ['neighborhoodInsights', 'preQuestions', 'agent'],
    });
    if (!property) throw new NotFoundException('Property not found');
    return this.mapProperty(property);
  }

  async create(createDto: any, actor = 'CRM', isAdmin = true): Promise<any> {
    const normalized = this.normalizeDto(createDto);
    const requestedStatus = normalized.status ?? PropertyStatus.Open;
    const requestedLiveStatus = this.requestedLiveStatus(requestedStatus);
    if (!isAdmin && requestedLiveStatus) normalized.status = PropertyStatus.PendingApproval;

    const property = this.propertyRepository.create(normalized as object);
    property.slug = this.slug(createDto.title);
    const saved = await this.propertyRepository.save(property);

    if (!isAdmin && requestedLiveStatus) {
      await this.brokerageService.createApprovalRequest({
        type: ApprovalType.ListingPublish,
        propertyId: saved.id,
        oldPrice: saved.price,
        requestedPrice: saved.price,
        oldStatus: PropertyStatus.Draft,
        requestedStatus: requestedLiveStatus,
        requestedBy: actor,
        requestNote: 'Listing publish requested.',
      });
    }
    await this.brokerageService.logAudit({
      entityType: AuditEntityType.Property,
      entityId: saved.id,
      action: AuditAction.Create,
      newValue: saved.title,
      actor,
    });
    return this.findOne(saved.id);
  }

  async update(id: number, updateDto: any, actor = 'CRM', isAdmin = true): Promise<any> {
    const property = await this.propertyRepository.findOne({
      where: { id },
      relations: ['neighborhoodInsights', 'preQuestions', 'agent'],
    });
    if (!property) throw new NotFoundException('Property not found');

    const normalized = this.normalizeDto(updateDto);
    const oldPrice = property.price;
    const oldStatus = property.status;
    const requestedStatus = normalized.status ?? property.status;
    const needsPriceApproval = !isAdmin && this.isLiveStatus(oldStatus) && oldPrice !== normalized.price;
    const requestedLiveStatus = this.requestedLiveStatus(requestedStatus);
    const needsPublishApproval = !isAdmin && !!requestedLiveStatus && !this.isLiveStatus(oldStatus);

    if (property.neighborhoodInsights?.length) await this.insightRepository.remove(property.neighborhoodInsights);
    if (property.preQuestions?.length) await this.questionRepository.remove(property.preQuestions);

    Object.assign(property, normalized, {
      id: property.id,
      price: needsPriceApproval ? oldPrice : normalized.price,
      status: needsPublishApproval ? PropertyStatus.PendingApproval : requestedStatus,
      slug: this.slug(normalized.title),
      closedAt: this.resolveClosedAt(property.closedAt, needsPublishApproval ? PropertyStatus.PendingApproval : requestedStatus),
    });
    const saved = await this.propertyRepository.save(property);

    if (needsPriceApproval) {
      await this.brokerageService.createApprovalRequest({
        type: ApprovalType.PriceChange,
        propertyId: saved.id,
        oldPrice,
        requestedPrice: normalized.price,
        oldStatus,
        requestedStatus: oldStatus,
        requestedBy: actor,
        requestNote: 'Active listing price change requested.',
      });
    }
    if (needsPublishApproval) {
      await this.brokerageService.createApprovalRequest({
        type: ApprovalType.ListingPublish,
        propertyId: saved.id,
        oldPrice: saved.price,
        requestedPrice: saved.price,
        oldStatus,
        requestedStatus: requestedLiveStatus,
        requestedBy: actor,
        requestNote: 'Listing publish requested.',
      });
    }
    if (oldPrice !== saved.price) await this.brokerageService.logAudit({ entityType: AuditEntityType.Property, entityId: saved.id, action: AuditAction.Update, fieldName: 'price', oldValue: oldPrice, newValue: saved.price, actor });
    if (oldStatus !== saved.status) await this.brokerageService.logAudit({ entityType: AuditEntityType.Property, entityId: saved.id, action: AuditAction.Update, fieldName: 'status', oldValue: oldStatus, newValue: saved.status, actor });

    return this.findOne(saved.id);
  }

  async delete(id: number): Promise<any> {
    const property = await this.propertyRepository.findOne({ where: { id } });
    if (property) return this.propertyRepository.remove(property);
  }

  private async mapProperty(property: Property) {
    const prediction = await this.predictionService.predictPropertySales(property);
    return {
      id: property.id,
      title: property.title,
      slug: property.slug,
      propertyType: property.propertyType,
      listingType: property.listingType,
      price: property.price,
      status: property.status,
      location: property.location,
      exactLocation: property.exactLocation,
      bedRoom: property.bedRoom,
      bathRoom: property.bathRoom,
      width: property.width,
      description: property.description,
      thumbnailUrl: property.thumbnailUrl,
      thumbnailObjectName: property.thumbnailObjectName,
      imageUrls: property.imageUrls ?? [],
      imageObjectNames: property.imageObjectNames ?? [],
      keyAmenities: property.keyAmenities ?? [],
      neighborhoodInsights: (property.neighborhoodInsights ?? []).map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        propertyId: item.propertyId,
      })),
      preQuestions: (property.preQuestions ?? []).map((item: any) => ({
        id: item.id,
        prompt: item.prompt ?? item.question ?? '',
        helperText: item.helperText ?? '',
        isRequired: item.isRequired ?? false,
        sortOrder: item.sortOrder ?? 0,
        allowsFileUpload: item.allowsFileUpload ?? false,
        attachmentUrl: item.attachmentUrl ?? null,
        attachmentObjectName: item.attachmentObjectName ?? null,
      })),
      documentRepositoryItemIds: property.documentRepositoryItemIds ?? [],
      agentId: property.agentId ?? null,
      agent: property.agent ? {
        id: property.agent.id,
        fullName: `${property.agent.firstName ?? ''} ${property.agent.lastName ?? ''}`.trim(),
        phone: property.agent.phone ?? null,
        email: property.agent.email ?? null,
        avatarUrl: property.agent.avatarUrl ?? null,
        agencyName: property.agent.agencyName ?? null,
        isVerifiedAgent: property.agent.isVerifiedAgent ?? false,
      } : null,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
      closedAt: property.closedAt ?? null,
      sellPrediction: prediction,
    };
  }

  private normalizeDto(dto: any) {
    const cleanList = (values: any[]) => [...new Set((values ?? []).map((value) => text(value).trim()).filter(Boolean))];
    const now = new Date();
    return {
      ...dto,
      title: text(dto.title).trim(),
      price: text(dto.price).trim(),
      location: text(dto.location).trim(),
      exactLocation: text(dto.exactLocation).trim(),
      bedRoom: text(dto.bedRoom).trim(),
      bathRoom: text(dto.bathRoom).trim(),
      width: text(dto.width).trim(),
      description: text(dto.description).trim(),
      thumbnailUrl: text(dto.thumbnailUrl).trim() || null,
      thumbnailObjectName: text(dto.thumbnailObjectName).trim() || null,
      imageUrls: cleanList(dto.imageUrls),
      imageObjectNames: cleanList(dto.imageObjectNames),
      keyAmenities: cleanList(dto.keyAmenities),
      documentRepositoryItemIds: [...new Set((dto.documentRepositoryItemIds ?? []).map(Number).filter((value) => value > 0))],
      neighborhoodInsights: (dto.neighborhoodInsights ?? [])
        .filter((item) => text(item.title).trim() || text(item.description).trim())
        .map((item) => this.insightRepository.create({ title: text(item.title).trim(), description: text(item.description).trim() })),
      preQuestions: (dto.preQuestions ?? [])
        .filter((item) => text(item.prompt).trim())
        .map((item, index) => this.questionRepository.create({
          prompt: text(item.prompt).trim(),
          helperText: text(item.helperText).trim(),
          isRequired: item.isRequired ?? true,
          sortOrder: Number(item.sortOrder) > 0 ? Number(item.sortOrder) : index + 1,
          allowsFileUpload: !!item.allowsFileUpload,
          attachmentUrl: text(item.attachmentUrl).trim() || null,
          attachmentObjectName: text(item.attachmentObjectName).trim() || null,
          createdAt: now,
          updatedAt: now,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    };
  }

  private slug(title: string) {
    return text(title).toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
  }

  private isLiveStatus(status: PropertyStatus) {
    return [PropertyStatus.Open, PropertyStatus.Active, PropertyStatus.UnderOffer].includes(status);
  }

  private requestedLiveStatus(status: PropertyStatus) {
    if (!this.isLiveStatus(status)) return null;
    return status === PropertyStatus.Open ? PropertyStatus.Active : status;
  }

  private resolveClosedAt(existing: Date, status: PropertyStatus) {
    return [PropertyStatus.Closed, PropertyStatus.Sold, PropertyStatus.Rented].includes(status)
      ? existing ?? new Date()
      : null;
  }
}
