import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Property, NeighborhoodInsight, PropertyPreQuestion } from './entities/property.entity';
import { PredictionService } from '../prediction/prediction.service';

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
  ) {}

  async findAll(): Promise<any[]> {
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

  async create(createDto: any): Promise<any> {
    const property = this.propertyRepository.create(createDto as object);
    property.slug = createDto.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    const saved = await this.propertyRepository.save(property);
    return this.mapProperty(saved);
  }

  async update(id: number, updateDto: any): Promise<any> {
    const property = await this.propertyRepository.findOne({ where: { id } });
    if (!property) throw new NotFoundException('Property not found');
    Object.assign(property, updateDto);
    if (updateDto.title) {
      property.slug = updateDto.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    }
    const saved = await this.propertyRepository.save(property);
    return this.mapProperty(saved);
  }

  async delete(id: number): Promise<any> {
    const property = await this.propertyRepository.findOne({ where: { id } });
    if (property) return this.propertyRepository.remove(property);
  }

  private async mapProperty(property: Property) {
    const prediction = await this.predictionService.predictPropertySales(property);
    return {
      ...property,
      sellPrediction: prediction,
    };
  }
}
