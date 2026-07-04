from pathlib import Path
import re

path = Path('backend-nestjs/src/mail/mail-sync.service.ts')
text = path.read_text()

replacements = [
    (
        "import { ShowingFeedbackService } from '../showing-feedback/showing-feedback.service';",
        "import { ShowingFeedbackService } from '../showing-feedback/showing-feedback.service';\nimport { LeadCollectionTemplateService } from './lead-collection-template.service';\nimport type { LeadCollectionParseResult } from './lead-collection-parser';",
    ),
    (
        "  body: string;\n  messageId: string;",
        "  body: string;\n  htmlBody: string;\n  messageId: string;",
    ),
    (
        "  shouldCreateLead?: boolean;\n}",
        "  shouldCreateLead?: boolean;\n  rawFields?: Record<string, string>;\n}\n\ninterface LeadExtractionOutcome {\n  info: ExtractedLeadInfo;\n  method: 'Template' | 'Template+Fallback' | 'Fallback' | 'AI';\n  confidence: number;\n  aiUsed: boolean;\n}",
    ),
    (
        "    private leadIntelligence: MailboxLeadIntelligenceService,\n    private settingsService: SettingsService,",
        "    private leadIntelligence: MailboxLeadIntelligenceService,\n    private leadCollectionTemplates: LeadCollectionTemplateService,\n    private settingsService: SettingsService,",
    ),
    (
        "            body: (parsed.text ?? '').trim(),\n            messageId:",
        "            body: (parsed.text ?? '').trim(),\n            htmlBody: typeof parsed.html === 'string' ? parsed.html : '',\n            messageId:",
    ),
    (
        "    const fallback = await this.leadIntelligence.extractLeadFromEmail({\n      ...inbound,\n      receivedAt: inbound.receivedAt,\n    });\n    const extracted = await this.extractLeadInfo(inbound, aiConfig, fallback);",
        "    const templateResult = await this.leadCollectionTemplates.extractFromEmail({\n      fromAddress: inbound.senderEmail,\n      subject: inbound.subject,\n      htmlBody: inbound.htmlBody,\n      textBody: inbound.body,\n    });\n    const fallback = await this.leadIntelligence.extractLeadFromEmail({\n      ...inbound,\n      receivedAt: inbound.receivedAt,\n    });\n    const extraction = await this.extractLeadInfo(inbound, aiConfig, fallback, templateResult);\n    const extracted = extraction.info;",
    ),
    (
        "        .where('LOWER(lead.email) = :email', { email: inbound.senderEmail })",
        "        .where('LOWER(lead.email) = :email', { email: (extracted.email || inbound.senderEmail).toLowerCase() })",
    ),
    (
        "        }\n        lead = await leadRepo.save(lead);",
        "        } else if (extracted.propertyTitle && !lead.property) {\n          lead.property = extracted.propertyTitle;\n        }\n        lead = await leadRepo.save(lead);",
    ),
    (
        "          email: inbound.senderEmail,",
        "          email: (extracted.email || inbound.senderEmail).toLowerCase(),",
    ),
    (
        "          summary: this.buildSummary(inbound, interest),\n          property: matchedProperty?.title ?? '',",
        "          summary: extracted.rawFields?.summary || this.buildSummary(inbound, interest),\n          property: matchedProperty?.title ?? extracted.propertyTitle ?? '',",
    ),
    (
        "          source: 'Mail Inbox',",
        "          source: extracted.rawFields?.source || 'Mail Inbox',",
    ),
    (
        "          nextActionType: 'Reply to inbound email',",
        "          nextActionType: extracted.rawFields?.nextActionType || 'Reply to inbound email',",
    ),
    (
        "        message: inbound.body,\n        messageId: inbound.messageId,",
        "        message: inbound.body,\n        htmlBody: inbound.htmlBody,\n        messageId: inbound.messageId,",
    ),
    (
        "        extractedLead: extracted,\n        kind: MailInboxKind.Direct,",
        "        extractedLead: extracted,\n        extractionMethod: extraction.method,\n        extractionConfidence: extraction.confidence,\n        leadCollectionTemplateId: templateResult.templateId,\n        leadCollectionTemplateName: templateResult.templateName,\n        aiFallbackUsed: extraction.aiUsed,\n        extractionDetails: {\n          matchScore: templateResult.matchScore,\n          missingRequiredFields: templateResult.missingRequiredFields,\n          diagnostics: templateResult.diagnostics,\n        },\n        kind: MailInboxKind.Direct,",
    ),
    (
        "    if (outcome.leadId) {",
        "    await this.leadCollectionTemplates.recordTemplateResult(templateResult, extraction.aiUsed);\n\n    if (outcome.leadId) {",
    ),
]

for old, new in replacements:
    if old not in text:
        raise SystemExit(f'Expected integration block not found: {old[:100]}')
    text = text.replace(old, new, 1)

pattern = re.compile(r"  private async extractLeadInfo\([\s\S]*?\n  private async findDuplicate")
replacement = '''  private async extractLeadInfo(
    inbound: InboundEmail,
    aiConfig: AiProviderConfig | null,
    fallback: any,
    templateResult: LeadCollectionParseResult,
  ): Promise<LeadExtractionOutcome> {
    const templateValues = templateResult.values ?? {};
    const fallbackInfo: ExtractedLeadInfo = {
      name: templateValues.name || fallback.name,
      email: templateValues.email || inbound.senderEmail,
      phone: templateValues.phone || fallback.phone,
      propertyTitle: templateValues.property || '',
      budget: templateValues.budget || '',
      timeline: templateValues.timeline || '',
      interest: templateValues.interest || fallback.interest,
      shouldCreateLead:
        this.leadCollectionTemplates.isConfident(templateResult) ||
        this.isPropertyInquiry(`${inbound.subject}\n${inbound.body}`.toLowerCase()),
      confidence: Math.max(templateResult.confidence, 0.45),
      rawFields: templateValues,
    };

    if (this.leadCollectionTemplates.isConfident(templateResult)) {
      return {
        info: fallbackInfo,
        method: 'Template',
        confidence: templateResult.confidence,
        aiUsed: false,
      };
    }

    if (!aiConfig?.baseUrl) {
      return {
        info: fallbackInfo,
        method: templateResult.matched ? 'Template+Fallback' : 'Fallback',
        confidence: fallbackInfo.confidence ?? 0.45,
        aiUsed: false,
      };
    }

    try {
      const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${aiConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: aiConfig.model,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'Extract real estate lead info from email. Return only JSON with keys: name,email,phone,propertyTitle,propertyLocation,budget,timeline,interest,intent,confidence,shouldCreateLead. confidence 0-1. shouldCreateLead true for buyer/renter/seller/property inquiry.',
            },
            {
              role: 'user',
              content: JSON.stringify({
                from: inbound.senderEmail,
                senderName: inbound.senderName,
                subject: inbound.subject,
                body: inbound.body.slice(0, 8000),
                deterministicTemplateAttempt: {
                  templateName: templateResult.templateName,
                  confidence: templateResult.confidence,
                  values: templateResult.values,
                  missingRequiredFields: templateResult.missingRequiredFields,
                },
              }),
            },
          ],
        }),
      });
      if (!response.ok) {
        return {
          info: fallbackInfo,
          method: templateResult.matched ? 'Template+Fallback' : 'Fallback',
          confidence: fallbackInfo.confidence ?? 0.45,
          aiUsed: false,
        };
      }
      const data: any = await response.json();
      const parsed = this.parseJson(data?.choices?.[0]?.message?.content);
      if (!parsed) {
        return {
          info: fallbackInfo,
          method: templateResult.matched ? 'Template+Fallback' : 'Fallback',
          confidence: fallbackInfo.confidence ?? 0.45,
          aiUsed: false,
        };
      }
      const info: ExtractedLeadInfo = {
        ...fallbackInfo,
        name: this.cleanText(parsed.name) || fallbackInfo.name,
        email: this.cleanText(parsed.email) || fallbackInfo.email,
        phone: this.cleanText(parsed.phone) || fallbackInfo.phone,
        propertyTitle: this.cleanText(parsed.propertyTitle) || fallbackInfo.propertyTitle,
        propertyLocation: this.cleanText(parsed.propertyLocation),
        budget: this.cleanText(parsed.budget) || fallbackInfo.budget,
        timeline: this.cleanText(parsed.timeline) || fallbackInfo.timeline,
        interest: this.cleanText(parsed.interest) || fallbackInfo.interest,
        intent: this.cleanText(parsed.intent),
        confidence: this.clampNumber(parsed.confidence, fallbackInfo.confidence ?? 0.45, 0, 1),
        shouldCreateLead: parsed.shouldCreateLead === true || fallbackInfo.shouldCreateLead,
      };
      return {
        info,
        method: 'AI',
        confidence: info.confidence ?? 0.45,
        aiUsed: true,
      };
    } catch {
      return {
        info: fallbackInfo,
        method: templateResult.matched ? 'Template+Fallback' : 'Fallback',
        confidence: fallbackInfo.confidence ?? 0.45,
        aiUsed: false,
      };
    }
  }

  private async findDuplicate'''

text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit('extractLeadInfo method not found')

path.write_text(text)
