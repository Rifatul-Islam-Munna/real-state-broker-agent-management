import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShowingBooking, LeadAssignmentRule, BrokerageApprovalRequest } from './entities/brokerage.entity';

@Injectable()
export class BrokerageService {
  constructor(
    @InjectRepository(ShowingBooking)
    private showingRepo: Repository<ShowingBooking>,
    @InjectRepository(LeadAssignmentRule)
    private assignmentRepo: Repository<LeadAssignmentRule>,
    @InjectRepository(BrokerageApprovalRequest)
    private approvalRepo: Repository<BrokerageApprovalRequest>,
  ) {}

  async createShowing(dto: any) {
    const showing = this.showingRepo.create(dto as object);
    return this.showingRepo.save(showing);
  }

  async getShowings() {
    return this.showingRepo.find({ relations: ['property'] });
  }

  async getApprovals() {
    return this.approvalRepo.find({ relations: ['property'] });
  }

  async getAssignmentRules() {
    return this.assignmentRepo.find();
  }

  async deleteAssignmentRule(id: number) {
    const rule = await this.assignmentRepo.findOne({ where: { id } });
    if (rule) await this.assignmentRepo.remove(rule);
  }

  async getAvailability(propertyId: number) {
    return [];
  }

  async getReports() {
    return { totalShowings: 0, pendingApprovals: 0 };
  }

  async getWebsiteInquiries() {
    return [];
  }
}
