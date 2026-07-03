import { Injectable, NotFoundException } from '@nestjs/common';
import { isLivePropertyStatus } from './property-availability';
import { PropertiesService } from './properties.service';

@Injectable()
export class PublicPropertiesService {
  constructor(private readonly properties: PropertiesService) {}

  async findOne(id: number) {
    return this.ensure(await this.properties.findOne(id));
  }

  async findBySlug(slug: string) {
    return this.ensure(await this.properties.findBySlug(slug));
  }

  private ensure(property: any) {
    if (!isLivePropertyStatus(property?.status)) {
      throw new NotFoundException('Property is not available.');
    }
    return property;
  }
}
