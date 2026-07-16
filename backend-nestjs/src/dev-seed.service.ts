import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcrypt';
import { DataSource, EntityManager, EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import { BlogPost } from './blog/entities/blog-post.entity';
import { BrokerageAuditLog, AuditAction, AuditEntityType, WebsiteInquiry } from './brokerage/entities/audit-log.entity';
import { ApprovalStatus, ApprovalType, BrokerageApprovalRequest, LeadAssignmentRule, ShowingBooking, ShowingBookingStatus } from './brokerage/entities/brokerage.entity';
import { ContactRequest, ContactRequestStatus } from './contact/entities/contact.entity';
import { DealChecklistItem, DealCommissionStatus, DealPipeline, DealStage, DealType } from './deals/entities/deal-pipeline.entity';
import { DocumentAccessLevel, DocumentRepositoryItem, DocumentType } from './documents/entities/document.entity';
import { LeadHistoryEntry, LeadHistoryDirection, LeadHistoryKind, LeadHistoryStatus } from './leads/entities/lead-history.entity';
import { Lead, LeadFollowUpStatus, LeadPriority, LeadStage } from './leads/entities/lead.entity';
import { MailInboxItem, MailInboxKind, MailInboxStatus } from './mail/entities/mail.entity';
import { NeighborhoodInsight, Property, PropertyCategory, PropertyListingType, PropertyPreQuestion, PropertyStatus } from './properties/entities/property.entity';
import { PropertyChatConversation, PropertyChatConversationStatus, PropertyChatMessage, PropertyChatSenderRole } from './property-chat/entities/property-chat.entity';
import { RealtorShowing } from './realtor-showings/entities/realtor-showing.entity';
import { ShowingFeedback } from './showing-feedback/entities/showing-feedback.entity';
import { SmsMessage, SmsMessageDirection, SmsMessageStatus } from './sms/entities/sms-message.entity';
import { User } from './users/entities/user.entity';
import { AllAgentRoutePermissions, UserRole } from './users/enums/user-role.enum';

@Injectable()
export class DevSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DevSeedService.name);
  private readonly target = 12;

  constructor(private readonly config: ConfigService, private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    if (this.config.get<string>('isDemoData') !== 'true') return;
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.query('CREATE TABLE IF NOT EXISTS development_seed_state (seed_key varchar(120) PRIMARY KEY, completed_at timestamptz NOT NULL DEFAULT NOW())');
        const completed = await manager.query('SELECT seed_key FROM development_seed_state WHERE seed_key = $1', ['dev-demo-v1']);
        if (completed.length) return;
        await this.seed(manager);
        await manager.query('INSERT INTO development_seed_state(seed_key) VALUES ($1) ON CONFLICT (seed_key) DO NOTHING', ['dev-demo-v1']);
      });
      this.logger.log('Development demo data is initialized and will not be duplicated on restart.');
    } catch (error: any) {
      this.logger.error(`Development demo seed failed: ${error?.message ?? error}`);
    }
  }

  private async seed(manager: EntityManager) {
    const passwordHash = await hash('Demo@1234', 10);
    const users = await this.topUp(manager, User, (index) => ({
      firstName: index === 1 ? 'Demo' : `Agent${index}`,
      lastName: index === 1 ? 'Administrator' : 'Skyline',
      email: index === 1 ? 'admin@demo.local' : `agent${index}@demo.local`,
      passwordHash,
      phone: `+1555000${String(index).padStart(4, '0')}`,
      role: index === 1 ? UserRole.Admin : index <= 8 ? UserRole.Agent : UserRole.Client,
      isActive: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      licenseNumber: index <= 8 ? `DEMO-LIC-${1000 + index}` : null,
      agencyName: 'Skyline Demo Realty',
      bio: 'Development demo profile for UI validation.',
      commissionRate: index <= 8 ? 3 : null,
      isVerifiedAgent: index <= 8,
      agentRoutePermissions: index <= 8 ? AllAgentRoutePermissions : [],
      city: index % 2 ? 'Austin' : 'Dallas',
      country: 'United States',
      address: `${100 + index} Demo Avenue`,
    }));
    const agents = users.filter((user) => user.role === UserRole.Agent || user.role === UserRole.Admin);

    const properties = await this.topUp(manager, Property, (index) => ({
      slug: `demo-property-${index}`,
      title: `${400 + index * 2} ${['Lake View', 'Oak Street', 'River Road', 'Sunset Drive'][index % 4]}, ${index % 2 ? 'Austin' : 'Dallas'}`,
      propertyType: index % 4 === 0 ? PropertyCategory.Commercial : PropertyCategory.Residential,
      listingType: index % 3 === 0 ? PropertyListingType.ForRent : PropertyListingType.ForSale,
      price: index % 3 === 0 ? `$${1800 + index * 125}/month` : `$${240000 + index * 27500}`,
      status: [PropertyStatus.Active, PropertyStatus.Open, PropertyStatus.UnderOffer, PropertyStatus.Sold][index % 4],
      location: index % 2 ? 'Austin, TX' : 'Dallas, TX',
      exactLocation: `${400 + index * 2} Demo ${index % 2 ? 'Avenue' : 'Street'}`,
      bedRoom: String(2 + (index % 4)),
      bathRoom: String(1 + (index % 3)),
      width: `${1100 + index * 95} sq ft`,
      description: `Demo listing ${index} with bright interiors, practical layout, and convenient local access.`,
      extraDescription: 'Created automatically for development UI testing.',
      ownerName: `Property Owner ${index}`,
      ownerEmail: `owner${index}@demo.local`,
      ownerPhone: `+1555111${String(index).padStart(4, '0')}`,
      ownerExtraInfo: 'Prefers concise showing feedback reports.',
      propertyDocuments: [{ name: `Property brochure ${index}`, fileName: `property-${index}.pdf`, fileUrl: `https://example.test/demo/property-${index}.pdf`, fileObjectName: `demo/property-${index}.pdf`, mimeType: 'application/pdf', sizeBytes: 120000 + index }],
      imageUrls: [],
      imageObjectNames: [],
      keyAmenities: ['Parking', 'Air conditioning', index % 2 ? 'Balcony' : 'Garden'],
      documentRepositoryItemIds: [],
      agentId: agents[index % agents.length]?.id ?? null,
      neighborhoodInsights: [{ title: 'Neighborhood overview', description: `Demo neighborhood insight for listing ${index}.` }],
      preQuestions: [{ prompt: 'What is your preferred move-in date?', helperText: 'Share an approximate date.', isRequired: true, sortOrder: 1, allowsFileUpload: false }],
    }));

    const leads = await this.topUp(manager, Lead, (index) => {
      const property = properties[(index - 1) % properties.length];
      const agent = agents[(index - 1) % agents.length];
      return {
        name: `Demo Client ${index}`,
        email: `client${index}@demo.local`,
        phone: `+1555222${String(index).padStart(4, '0')}`,
        summary: `Interested in ${property.title} and requested a follow-up.`,
        property: property.title,
        propertyId: property.id,
        budget: `$${250000 + index * 20000}`,
        stage: Object.values(LeadStage)[index % Object.values(LeadStage).length],
        priority: Object.values(LeadPriority)[index % Object.values(LeadPriority).length],
        agent: `${agent?.firstName ?? 'Demo'} ${agent?.lastName ?? 'Agent'}`,
        agentId: agent?.id ?? null,
        source: ['Website', 'Property Chat', 'Referral', 'Realtor Showing'][index % 4],
        interest: index % 2 ? 'Buying' : 'Renting',
        timeline: `${1 + (index % 6)} months`,
        inBoard: index % 2 === 0,
        nextActionDate: this.daysFromNow(index - 6),
        nextActionType: 'Follow up with demo lead',
        followUpStatus: index % 3 === 0 ? LeadFollowUpStatus.Completed : LeadFollowUpStatus.Scheduled,
        notes: [`Demo note for lead ${index}`],
        lastActivityAt: this.daysFromNow(-index),
      };
    });

    await this.topUp(manager, LeadHistoryEntry, (index) => ({
      leadId: leads[(index - 1) % leads.length].id,
      kind: [LeadHistoryKind.Email, LeadHistoryKind.Sms, LeadHistoryKind.Call, LeadHistoryKind.Note][index % 4],
      direction: index % 2 ? LeadHistoryDirection.Incoming : LeadHistoryDirection.Outgoing,
      status: index % 5 === 0 ? LeadHistoryStatus.Scheduled : LeadHistoryStatus.Sent,
      title: `Demo lead activity ${index}`,
      summary: `Recorded communication activity for demo lead ${index}.`,
      body: `This is a realistic demo timeline entry number ${index}.`,
      provider: index % 2 ? 'Demo Mail' : 'Demo SMS',
      createdBy: 'Development Seeder',
      scheduledAt: index % 5 === 0 ? this.daysFromNow(index) : null,
      occurredAt: index % 5 === 0 ? null : this.daysFromNow(-index),
    }));

    const deals = await this.topUp(manager, DealPipeline, (index) => {
      const lead = leads[(index - 1) % leads.length];
      const agent = agents[(index - 1) % agents.length];
      const value = 220000 + index * 30000;
      return {
        title: `Demo Deal ${index} - ${lead.property}`,
        type: index % 4 === 0 ? DealType.Commercial : DealType.Residential,
        client: lead.name,
        value,
        commissionRate: 3,
        commissionAmount: value * 0.03,
        commissionStatus: Object.values(DealCommissionStatus)[index % Object.values(DealCommissionStatus).length],
        commissionPayoutNote: 'Demo commission calculation.',
        stage: Object.values(DealStage)[index % Object.values(DealStage).length],
        deadline: this.daysFromNow(index + 10).toISOString().slice(0, 10),
        expectedClosingDate: this.daysFromNow(index + 20),
        note: 'Development demo deal.',
        agent: `${agent?.firstName ?? ''} ${agent?.lastName ?? ''}`.trim(),
        agentId: agent?.id ?? null,
        sourceLeadId: lead.id,
        checklistItems: [{ title: `Review demo contract ${index}`, isCompleted: index % 2 === 0, sortOrder: 1 }],
      };
    });

    await this.topUp(manager, ContactRequest, (index) => ({
      name: `Website Visitor ${index}`,
      email: `visitor${index}@demo.local`,
      phone: `+1555333${String(index).padStart(4, '0')}`,
      message: `I would like more information about demo property ${index}.`,
      inquiryType: index % 2 ? 'Property inquiry' : 'Schedule viewing',
      propertyId: properties[(index - 1) % properties.length].id,
      propertyTitle: properties[(index - 1) % properties.length].title,
      agentId: agents[(index - 1) % agents.length]?.id ?? null,
      agentName: `${agents[(index - 1) % agents.length]?.firstName ?? ''} ${agents[(index - 1) % agents.length]?.lastName ?? ''}`.trim(),
      status: Object.values(ContactRequestStatus)[index % Object.values(ContactRequestStatus).length],
      leadId: leads[(index - 1) % leads.length].id,
    }));

    const documents = await this.topUp(manager, DocumentRepositoryItem, (index) => ({
      title: `Demo Property Document ${index}`,
      fileName: `demo-document-${index}.pdf`,
      fileUrl: `https://example.test/demo/document-${index}.pdf`,
      fileObjectName: `demo/document-${index}.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 100000 + index * 1000,
      category: index % 2 ? 'Disclosure' : 'Brochure',
      documentType: DocumentType.Property,
      propertyId: properties[(index - 1) % properties.length].id,
      propertyTitle: properties[(index - 1) % properties.length].title,
      folder: 'Demo Properties',
      description: 'Development-only document record.',
      versionLabel: 'v1.0',
      tags: ['demo', 'property'],
      accessLevel: index % 3 === 0 ? DocumentAccessLevel.Public : DocumentAccessLevel.AgentAccess,
      isTemplate: false,
      requiresSignature: index % 4 === 0,
    }));

    await this.topUp(manager, MailInboxItem, (index) => ({
      email: `client${index}@demo.local`,
      name: `Demo Client ${index}`,
      subject: `Question about ${properties[(index - 1) % properties.length].title}`,
      message: `This is demo email message ${index} for the mail workspace.`,
      messageId: `demo-mail-${index}@demo.local`,
      inReplyTo: '',
      references: [],
      mailboxTag: index % 2 ? 'inbox' : 'outbound',
      extractedLead: { source: 'development-seed' },
      kind: MailInboxKind.Direct,
      status: index % 3 === 0 ? MailInboxStatus.Replied : MailInboxStatus.New,
      leadId: leads[(index - 1) % leads.length].id,
    }));

    await this.topUp(manager, SmsMessage, (index) => ({
      provider: 'Demo Provider',
      providerMessageId: `demo-sms-${index}`,
      leadId: leads[(index - 1) % leads.length].id,
      leadName: leads[(index - 1) % leads.length].name,
      fromNumber: index % 2 ? leads[(index - 1) % leads.length].phone : '+15550000000',
      toNumber: index % 2 ? '+15550000000' : leads[(index - 1) % leads.length].phone,
      body: `Demo SMS conversation message ${index}.`,
      mediaUrls: [],
      direction: index % 2 ? SmsMessageDirection.Incoming : SmsMessageDirection.Outgoing,
      status: index % 2 ? SmsMessageStatus.Received : SmsMessageStatus.Sent,
      occurredAt: this.daysFromNow(-index),
      rawPayload: { demo: true },
    }));

    const showings = await this.topUp(manager, RealtorShowing, (index) => ({
      realtorName: `Demo Realtor ${index}`,
      realtorEmail: `realtor${index}@demo.local`,
      realtorPhone: `+1555444${String(index).padStart(4, '0')}`,
      showingAt: this.daysFromNow(-index),
      propertyText: properties[(index - 1) % properties.length].title,
      propertyId: properties[(index - 1) % properties.length].id,
      propertyMatchScore: 1,
      propertyMatchMethod: 'Auto',
      leadId: leads[(index - 1) % leads.length].id,
      emailEnabled: true,
      smsEnabled: index % 2 === 0,
      directTemplateId: 'showing-confirmation',
      followUpEnabled: true,
      followUpTemplateId: 'follow-up-after-visit',
      followUpGapDays: 2,
      outreachAt: this.daysFromNow(-index + 1),
      sourceData: { source: 'development-seed' },
    }));

    await this.topUp(manager, ShowingFeedback, (index) => ({
      realtorShowingId: showings[(index - 1) % showings.length].id,
      propertyId: properties[(index - 1) % properties.length].id,
      leadId: leads[(index - 1) % leads.length].id,
      realtorName: showings[(index - 1) % showings.length].realtorName,
      realtorContact: showings[(index - 1) % showings.length].realtorEmail,
      channel: index % 2 ? 'Email' : 'Sms',
      sourceMessageId: `demo-feedback-${index}`,
      feedbackText: index % 3 === 0 ? 'The client liked the layout but felt the price was slightly high.' : 'The property showed well and the client liked the location and natural light.',
      sentiment: index % 3 === 0 ? 'neutral' : 'positive',
      confidence: 0.82,
      classifier: index % 2 ? 'AI:Demo' : 'Heuristic',
      firstMessageAt: this.daysFromNow(-index - 1),
      receivedAt: this.daysFromNow(-index),
    }));

    await this.topUp(manager, PropertyChatConversation, (index) => ({
      propertyId: properties[(index - 1) % properties.length].id,
      leadId: leads[(index - 1) % leads.length].id,
      summary: `Demo visitor asked about financing and availability for property ${index}.`,
      contactName: leads[(index - 1) % leads.length].name,
      contactEmail: leads[(index - 1) % leads.length].email,
      contactPhone: leads[(index - 1) % leads.length].phone,
      propertyTitle: properties[(index - 1) % properties.length].title,
      assignedAgent: leads[(index - 1) % leads.length].agent,
      budget: leads[(index - 1) % leads.length].budget,
      timeline: leads[(index - 1) % leads.length].timeline,
      interest: leads[(index - 1) % leads.length].interest,
      qualificationScore: 0.7 + (index % 3) * 0.1,
      autoQualified: true,
      status: PropertyChatConversationStatus.LeadCreated,
      messages: [
        { message: 'What would you like to know about this property?', senderRole: PropertyChatSenderRole.System, attachmentUrl: null, attachmentObjectName: null },
        { message: `I am interested in property ${index} and would like a viewing.`, senderRole: PropertyChatSenderRole.Visitor, attachmentUrl: null, attachmentObjectName: null },
      ],
    }));

    await this.topUp(manager, ShowingBooking, (index) => ({
      leadId: leads[(index - 1) % leads.length].id,
      propertyId: properties[(index - 1) % properties.length].id,
      agentId: agents[(index - 1) % agents.length]?.id ?? null,
      contactName: leads[(index - 1) % leads.length].name,
      contactEmail: leads[(index - 1) % leads.length].email,
      contactPhone: leads[(index - 1) % leads.length].phone,
      startAt: this.daysFromNow(index),
      endAt: new Date(this.daysFromNow(index).getTime() + 60 * 60 * 1000),
      status: Object.values(ShowingBookingStatus)[index % Object.values(ShowingBookingStatus).length],
      notes: 'Development demo showing booking.',
    }));

    await this.topUp(manager, LeadAssignmentRule, (index) => ({
      area: index % 2 ? 'Austin' : 'Dallas',
      propertyType: index % 3 === 0 ? PropertyCategory.Commercial : PropertyCategory.Residential,
      listingType: index % 2 ? PropertyListingType.ForSale : PropertyListingType.ForRent,
      agentId: agents[(index - 1) % agents.length]?.id,
      priorityOrder: index,
      isActive: true,
    }));

    await this.topUp(manager, BrokerageApprovalRequest, (index) => ({
      type: index % 2 ? ApprovalType.ListingPublish : ApprovalType.PriceChange,
      status: Object.values(ApprovalStatus)[index % Object.values(ApprovalStatus).length],
      propertyId: properties[(index - 1) % properties.length].id,
      oldPrice: properties[(index - 1) % properties.length].price,
      requestedPrice: `$${300000 + index * 25000}`,
      oldStatus: properties[(index - 1) % properties.length].status,
      requestedStatus: PropertyStatus.Active,
      requestedBy: leads[(index - 1) % leads.length].agent,
      reviewedBy: index % 3 ? 'Demo Administrator' : '',
      requestNote: 'Development demo approval request.',
      reviewNote: index % 3 ? 'Reviewed in demo data.' : '',
    }));

    await this.topUp(manager, BrokerageAuditLog, (index) => ({
      entityType: [AuditEntityType.Property, AuditEntityType.Lead, AuditEntityType.Deal][index % 3],
      entityId: index % 3 === 0 ? deals[(index - 1) % deals.length].id : index % 3 === 1 ? properties[(index - 1) % properties.length].id : leads[(index - 1) % leads.length].id,
      action: Object.values(AuditAction)[index % Object.values(AuditAction).length],
      fieldName: 'status',
      oldValue: 'Previous',
      newValue: 'Updated',
      actor: 'Development Seeder',
      note: `Demo audit event ${index}.`,
    }));

    await this.topUp(manager, WebsiteInquiry, (index) => ({
      leadId: leads[(index - 1) % leads.length].id,
      name: `Inquiry Visitor ${index}`,
      email: `inquiry${index}@demo.local`,
      phone: `+1555666${String(index).padStart(4, '0')}`,
      source: ['ContactForm', 'PropertyChat', 'ScheduleViewing'][index % 3],
      message: `Development website inquiry ${index}.`,
      status: index % 2 ? 'New' : 'Converted',
      convertedAt: index % 2 ? null : this.daysFromNow(-index),
      notes: 'Seeded for admin reporting.',
    }));

    await this.topUp(manager, BlogPost, (index) => ({
      title: `Demo Real Estate Guide ${index}`,
      slug: `demo-real-estate-guide-${index}`,
      excerpt: `Practical demo article ${index} for testing the public blog and admin pages.`,
      category: ['Buying', 'Selling', 'Market', 'Home Tips'][index % 4],
      coverImageUrl: '',
      coverImageObjectName: null,
      authorName: 'Skyline Demo Team',
      readTimeMinutes: 4 + (index % 6),
      isFeatured: index <= 3,
      isPublished: true,
      publishedAt: this.daysFromNow(-index),
      tags: ['demo', 'real-estate'],
      highlights: [`Key demo insight ${index}`, 'Useful for UI testing'],
      paragraphs: [`This is the opening paragraph for demo article ${index}.`, 'The content is intentionally realistic but contains no production data.'],
    }));

    void documents;
  }

  private async topUp<T extends ObjectLiteral>(
    manager: EntityManager,
    target: EntityTarget<T>,
    factory: (index: number) => ObjectLiteral,
  ): Promise<T[]> {
    const repo = manager.getRepository(target) as Repository<T>;
    const count = await repo.count();
    if (count < this.target) {
      const rows = Array.from({ length: this.target - count }, (_, offset) => repo.create(factory(count + offset + 1) as any));
      await repo.save(rows as any);
    }
    return repo.find({ order: { id: 'ASC' } as any, take: this.target });
  }

  private daysFromNow(days: number) {
    return new Date(Date.now() + days * 86_400_000);
  }
}
