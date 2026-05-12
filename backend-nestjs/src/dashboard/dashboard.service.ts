import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from '../properties/entities/property.entity';
import { User } from '../users/entities/user.entity';
import { Lead } from '../leads/entities/lead.entity';
import { DealPipeline } from '../deals/entities/deal-pipeline.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Property) private propertyRepo: Repository<Property>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Lead) private leadRepo: Repository<Lead>,
    @InjectRepository(DealPipeline) private dealRepo: Repository<DealPipeline>,
  ) {}

  async getSummary() {
    const propertyCount = await this.propertyRepo.count();
    const agentCount = await this.userRepo.count({ where: { role: 'Agent' as any } });
    const leadCount = await this.leadRepo.count();
    const activeDeals = await this.dealRepo.count();

    const totalValueResult = await this.dealRepo.createQueryBuilder('deal')
        .select('SUM(deal.value)', 'total')
        .getRawOne();

    return {
      propertyCount,
      agentCount,
      leadCount,
      activeDeals,
      totalPortfolioValue: parseFloat(totalValueResult.total || '0'),
    };
  }
}
