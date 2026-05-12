import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Property, NeighborhoodInsight, PropertyPreQuestion } from './entities/property.entity';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private propertyRepository: Repository<Property>,
    @InjectRepository(NeighborhoodInsight)
    private insightRepository: Repository<NeighborhoodInsight>,
    @InjectRepository(PropertyPreQuestion)
    private questionRepository: Repository<PropertyPreQuestion>,
  ) {}

  async findAll(): Promise<Property[]> {
    return this.propertyRepository.find({
      relations: ['neighborhoodInsights', 'preQuestions', 'agent'],
    });
  }

  async findOne(id: number): Promise<Property> {
    const property = await this.propertyRepository.findOne({
      where: { id },
      relations: ['neighborhoodInsights', 'preQuestions', 'agent'],
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async findBySlug(slug: string): Promise<Property> {
    const property = await this.propertyRepository.findOne({
      where: { slug },
      relations: ['neighborhoodInsights', 'preQuestions', 'agent'],
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async create(createDto: any): Promise<Property> {
    const property = this.propertyRepository.create(createDto as object);
    property.slug = createDto.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    return this.propertyRepository.save(property);
  }

  async update(id: number, updateDto: any): Promise<Property> {
    const property = await this.findOne(id);
    Object.assign(property, updateDto);
    if (updateDto.title) {
      property.slug = updateDto.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    }
    return this.propertyRepository.save(property);
  }

  async delete(id: number): Promise<Property> {
    const property = await this.findOne(id);
    return this.propertyRepository.remove(property);
  }
}
