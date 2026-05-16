import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './entities/lead.entity';

/**
 * Mailbox Lead Intelligence Service
 * Extracts lead information from emails and mailbox entries
 * Auto-creates or updates leads based on email content
 */
@Injectable()
export class MailboxLeadIntelligenceService {
  constructor(
    @InjectRepository(Lead)
    private leadRepo: Repository<Lead>,
  ) {}

  /**
   * Extract lead information from email content
   */
  async extractLeadFromEmail(emailData: {
    senderEmail: string;
    senderName?: string;
    subject: string;
    body: string;
    receivedAt: Date;
  }): Promise<{ name: string; email: string; phone?: string; interest?: string }> {
    const leadInfo = {
      name: emailData.senderName || 'Unknown',
      email: emailData.senderEmail,
      phone: this.extractPhoneNumber(emailData.body),
      interest: this.extractPropertyInterest(emailData.subject + ' ' + emailData.body),
    };

    return leadInfo;
  }

  /**
   * Auto-create or update lead from email
   */
  async processEmailAsLead(emailData: {
    senderEmail: string;
    senderName?: string;
    subject: string;
    body: string;
    receivedAt: Date;
    agencyId: number;
  }): Promise<Lead> {
    // Check if lead exists by email
    let lead = await this.leadRepo.findOne({
      where: { email: emailData.senderEmail, agencyId: emailData.agencyId },
    });

    const leadInfo = await this.extractLeadFromEmail(emailData);

    if (!lead) {
      // Create new lead
      lead = this.leadRepo.create({
        firstName: this.getFirstName(leadInfo.name),
        lastName: this.getLastName(leadInfo.name),
        email: leadInfo.email,
        phone: leadInfo.phone,
        source: 'MailInbox',
        propertyType: leadInfo.interest,
        status: 'New',
        priority: 'Warm',
        agencyId: emailData.agencyId,
        notes: `Email received: ${emailData.subject}\n\n${emailData.body.substring(0, 500)}`,
        lastContactDate: emailData.receivedAt,
      });
    } else {
      // Update existing lead
      lead.lastContactDate = emailData.receivedAt;
      if (leadInfo.phone && !lead.phone) {
        lead.phone = leadInfo.phone;
      }
      if (leadInfo.interest && !lead.propertyType) {
        lead.propertyType = leadInfo.interest;
      }
      lead.notes =
        (lead.notes || '') +
        `\n\n[${emailData.receivedAt.toISOString()}] New email: ${emailData.subject}`;
    }

    return this.leadRepo.save(lead);
  }

  /**
   * Extract phone number from text
   */
  private extractPhoneNumber(text: string): string | undefined {
    // Simple regex for common phone formats
    const phoneRegex = /(\+?1?\s*[-.\(]?\d{3}[-.\)]?\s*\d{3}[-.\s]?\d{4}|\+\d{1,3}\s?\d{1,14})/;
    const match = text.match(phoneRegex);
    return match ? match[0].trim() : undefined;
  }

  /**
   * Extract property interest/type from text
   */
  private extractPropertyInterest(text: string): string | undefined {
    const lower = text.toLowerCase();

    if (lower.includes('apartment') || lower.includes('flat'))
      return 'Apartment';
    if (lower.includes('house') || lower.includes('home'))
      return 'House';
    if (lower.includes('commercial'))
      return 'Commercial';
    if (lower.includes('land') || lower.includes('plot'))
      return 'Land';
    if (lower.includes('office'))
      return 'Office';
    if (lower.includes('shop') || lower.includes('retail'))
      return 'Shop';

    return undefined;
  }

  /**
   * Extract first name from full name
   */
  private getFirstName(fullName: string): string {
    return fullName.split(' ')[0] || 'Unknown';
  }

  /**
   * Extract last name from full name
   */
  private getLastName(fullName: string): string {
    const parts = fullName.split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
  }

  /**
   * Get lead intelligence metrics
   */
  async getLeadIntelligence(leadId: number): Promise<{
    leadId: number;
    emailCount: number;
    lastEmailDate?: Date;
    sentiment: string;
  }> {
    const lead = await this.leadRepo.findOne({ where: { id: leadId } });

    if (!lead) {
      return {
        leadId,
        emailCount: 0,
        sentiment: 'unknown',
      };
    }

    // Count emails from notes (rough estimate)
    const emailCount = (lead.notes?.match(/Email received:/g) || []).length;

    return {
      leadId,
      emailCount,
      lastEmailDate: lead.lastContactDate,
      sentiment: this.analyzeSentiment(lead.notes || ''),
    };
  }

  /**
   * Analyze sentiment from lead notes
   */
  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const lower = text.toLowerCase();

    const positiveWords = ['interested', 'great', 'love', 'perfect', 'excellent', 'want'];
    const negativeWords = ['not interested', 'reject', 'cancel', 'stop', 'no thanks'];

    const posCount = positiveWords.filter((w) => lower.includes(w)).length;
    const negCount = negativeWords.filter((w) => lower.includes(w)).length;

    if (posCount > negCount) return 'positive';
    if (negCount > posCount) return 'negative';
    return 'neutral';
  }
}
