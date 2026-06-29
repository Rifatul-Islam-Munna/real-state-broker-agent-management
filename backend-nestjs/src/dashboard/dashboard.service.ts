import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Property } from '../properties/entities/property.entity';
import { User } from '../users/entities/user.entity';
import { Lead } from '../leads/entities/lead.entity';
import { DealPipeline } from '../deals/entities/deal-pipeline.entity';
import { ContactRequest } from '../contact/entities/contact.entity';
import { MailInboxItem } from '../mail/entities/mail.entity';
import { ShowingBooking } from '../brokerage/entities/brokerage.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Property) private propertyRepo: Repository<Property>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Lead) private leadRepo: Repository<Lead>,
    @InjectRepository(DealPipeline) private dealRepo: Repository<DealPipeline>,
    @InjectRepository(ContactRequest) private contactRepo: Repository<ContactRequest>,
    @InjectRepository(MailInboxItem) private mailRepo: Repository<MailInboxItem>,
    @InjectRepository(ShowingBooking) private showingRepo: Repository<ShowingBooking>,
  ) {}

  async getSummary() {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const previousMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const startOfWeek = new Date(now);
    startOfWeek.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
    startOfWeek.setUTCHours(0, 0, 0, 0);

    const [properties, leads, deals, contacts, mail, showings, agents] = await Promise.all([
      this.propertyRepo.find(),
      this.leadRepo.find(),
      this.dealRepo.find(),
      this.contactRepo.find(),
      this.mailRepo.find(),
      this.showingRepo.find({ relations: ['property'] }),
      this.userRepo.find({ where: { role: 'Agent' as any, deletedAt: IsNull() } }),
    ]);
    const notCanceled = (deal: DealPipeline) => String(deal.stage) !== 'Canceled';
    const currentListings = properties.filter((item) => item.createdAt >= startOfMonth).length;
    const previousListings = properties.filter((item) => item.createdAt >= previousMonth && item.createdAt < startOfMonth).length;
    const weeklyLeads = leads.filter((item) => item.createdAt >= startOfWeek);
    const currentRevenue = deals.filter((item) => notCanceled(item) && item.createdAt >= startOfMonth).reduce((sum, item) => sum + Number(item.value), 0);
    const previousRevenue = deals.filter((item) => notCanceled(item) && item.createdAt >= previousMonth && item.createdAt < startOfMonth).reduce((sum, item) => sum + Number(item.value), 0);

    const candidates = agents.map((agent) => {
      const name = `${agent.firstName} ${agent.lastName}`.trim();
      const agentDeals = deals.filter((item) => item.agent?.toLowerCase() === name.toLowerCase());
      return {
        agent,
        name,
        dealsClosed: agentDeals.filter((item) => String(item.stage) === 'Completed').length,
        revenue: agentDeals.filter(notCanceled).reduce((sum, item) => sum + Number(item.value), 0),
        propertyCount: properties.filter((item) => item.agentId === agent.id && String(item.status) === 'Open').length,
      };
    });
    const maxRevenue = Math.max(0, ...candidates.map((item) => item.revenue));
    const maxProperties = Math.max(0, ...candidates.map((item) => item.propertyCount));
    const topAgents = candidates.sort((a, b) => b.revenue - a.revenue || b.dealsClosed - a.dealsClosed || a.name.localeCompare(b.name)).slice(0, 5).map((item) => ({
      id: item.agent.id,
      fullName: item.name,
      status: item.agent.isActive ? 'Active' : 'Inactive',
      dealsClosed: item.dealsClosed,
      revenue: item.revenue,
      growth: maxRevenue > 0 ? this.clamp(Math.round(item.revenue / maxRevenue * 100), 12, 100) : maxProperties > 0 ? this.clamp(Math.round(item.propertyCount / maxProperties * 100), 12, 100) : 12,
      avatarUrl: item.agent.avatarUrl ?? null,
      agencyName: item.agent.agencyName ?? null,
    }));

    const attentionStages = ['OfferAccepted', 'UnderContract', 'Inspection', 'Financing', 'Closing'];
    const pendingDeals = deals.filter((item) => attentionStages.includes(String(item.stage))).length;
    const pendingLeads = leads.filter((item) => ['New', 'Contacted', 'Visit'].includes(String(item.stage)) || (!!item.nextActionDate && item.nextActionDate < now && !['Completed', 'NoActionNeeded'].includes(String(item.followUpStatus)))).length
      + contacts.filter((item) => String(item.status) === 'New').length
      + mail.filter((item) => String(item.status) === 'New').length
      + showings.filter((item) => String(item.status) === 'Scheduled' && item.startAt < new Date(now.getTime() + 86_400_000)).length;
    const alerts = [
      { id: 'pipeline-follow-up', title: `${pendingDeals} Deals Need Attention`, description: pendingDeals ? 'Offer and closing stages have active items that should be reviewed today.' : 'The current deal pipeline is clear.', count: pendingDeals, tone: pendingDeals ? 'warning' : 'info', actionLabel: 'Review Pipeline', target: 'deals' },
      { id: 'lead-follow-up', title: `${pendingLeads} Leads And Inquiries Waiting`, description: pendingLeads ? 'New leads, contact requests, or inbox inquiries are waiting for a first response.' : 'No fresh lead follow-up is pending.', count: pendingLeads, tone: pendingLeads ? 'danger' : 'info', actionLabel: 'Review Leads', target: 'leads' },
    ];
    const visits = [
      ...leads.filter((item) => String(item.stage) === 'Visit' || !!item.timeline?.trim()).sort((a, b) => Number(b.lastActivityAt) - Number(a.lastActivityAt)).slice(0, 4).map((item) => ({ id: item.id, propertyTitle: item.property || 'Property Visit Follow-Up', clientName: item.name, activityAt: item.lastActivityAt, timeline: item.timeline || null, status: String(item.stage) === 'Deal' ? 'Completed' : String(item.stage) === 'Canceled' ? 'Canceled' : String(item.stage) === 'Visit' ? 'Scheduled' : 'FollowUp' })),
      ...showings.filter((item) => String(item.status) === 'Scheduled').sort((a, b) => Number(a.startAt) - Number(b.startAt)).slice(0, 4).map((item) => ({ id: item.id, propertyTitle: item.property?.title ?? 'Showing Booking', clientName: item.contactName, activityAt: item.startAt, timeline: item.startAt.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, 'Z'), status: 'Scheduled' })),
    ].sort((a, b) => Number(new Date(b.activityAt)) - Number(new Date(a.activityAt))).slice(0, 4);

    return {
      overview: {
        activeListings: properties.filter((item) => String(item.status) === 'Open').length,
        activeListingsChange: this.change(currentListings, previousListings),
        newLeadsThisWeek: weeklyLeads.filter((item) => String(item.stage) === 'New').length,
        contactedLeadsThisWeek: weeklyLeads.filter((item) => ['Contacted', 'Pending', 'Qualified', 'Visit', 'Negotiation'].includes(String(item.stage))).length,
        convertedLeadsThisWeek: deals.filter((item) => item.createdAt >= startOfWeek && notCanceled(item)).length,
        dealsInProgress: deals.filter((item) => !['Completed', 'Canceled'].includes(String(item.stage))).length,
        closingThisMonth: deals.filter((item) => String(item.stage) === 'Closing' || (String(item.stage) === 'Completed' && item.updatedAt >= startOfMonth)).length,
        monthlyRevenue: currentRevenue,
        monthlyRevenueChange: this.change(currentRevenue, previousRevenue),
      },
      topAgents,
      alerts,
      visits,
    };
  }

  private change(current: number, previous: number) { return previous === 0 ? current > 0 ? 100 : 0 : Math.round(((current - previous) / previous) * 1000) / 10; }
  private clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }
}
