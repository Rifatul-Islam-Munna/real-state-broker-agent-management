import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginated, toInt } from '../common/api-contract';
import { numericEnumValue } from '../common/numeric-enum';
import { Property, propertyCategories, propertyListingTypes, propertyStatuses } from './entities/property.entity';
import { isLivePropertyStatus, LIVE_PROPERTY_STATUSES } from './property-availability';
import { PropertiesService } from './properties.service';

@Injectable()
export class PublicPropertiesService {
  constructor(@InjectRepository(Property) private readonly repo: Repository<Property>, private readonly properties: PropertiesService) {}

  async findAll(page = 1, pageSize = 10, search?: string, propertyType?: string, listingType?: string, status?: string, agent?: string) {
    page = toInt(page, 1); pageSize = toInt(pageSize, 10);
    if (status && !isLivePropertyStatus(status)) return paginated([], 0, page, pageSize);
    const statuses = (status ? [status] : LIVE_PROPERTY_STATUSES).map((value) => numericEnumValue(propertyStatuses, value));
    const qb = this.repo.createQueryBuilder('property').leftJoin('property.agent', 'agent').where('property.status IN (:...statuses)', { statuses });
    if (search) qb.andWhere('(property.title ILIKE :search OR property.location ILIKE :search OR property.exact_location ILIKE :search OR property.description ILIKE :search)', { search: `%${search}%` });
    if (propertyType) qb.andWhere('property.property_type = :propertyType', { propertyType: numericEnumValue(propertyCategories, propertyType) });
    if (listingType) qb.andWhere('property.listing_type = :listingType', { listingType: numericEnumValue(propertyListingTypes, listingType) });
    if (agent) qb.andWhere("concat(agent.first_name, ' ', agent.last_name) ILIKE :agent", { agent: `%${agent}%` });
    const [rows, total] = await qb.orderBy('property.updatedAt', 'DESC').skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return paginated(await Promise.all(rows.map((item) => this.properties.findOne(item.id))), total, page, pageSize);
  }

  async findOne(id: number) { return this.ensure(await this.properties.findOne(id)); }
  async findBySlug(slug: string) { return this.ensure(await this.properties.findBySlug(slug)); }

  private ensure(property: any) {
    if (!isLivePropertyStatus(property?.status)) throw new NotFoundException('Property is not available.');
    return property;
  }
}
