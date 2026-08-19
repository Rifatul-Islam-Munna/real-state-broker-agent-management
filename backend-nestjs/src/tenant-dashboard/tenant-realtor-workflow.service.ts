import {
  BadRequestException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { sanitizePlainText } from '../security/input-sanitizer';
import { PlatformDomainService } from '../platform-domain/platform-domain.service';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';
import { TenantOutreachService } from './tenant-outreach.service';
import { TenantWorkspaceSettingsService } from './tenant-workspace-settings.service';

type DeliveryChannel = 'Email' | 'SMS';

type ShowingFormField = {
  key: string;
  label: string;
  type:
    | 'text'
    | 'email'
    | 'phone'
    | 'number'
    | 'textarea'
    | 'select'
    | 'radio'
    | 'checkbox'
    | 'checkbox-group'
    | 'date'
    | 'datetime'
    | 'divider'
    | 'heading'
    | 'paragraph'
    | 'image';
  required: boolean;
  options: string[];
  description?: string;
  imageUrl?: string;
};

@Injectable()
export class TenantRealtorWorkflowService {
  private readonly logger = new Logger(TenantRealtorWorkflowService.name);

  constructor(
    private readonly databases: TenantDatabaseService,
    private readonly outreach: TenantOutreachService,
    private readonly platformDomain: PlatformDomainService,
    @Optional() private readonly settings?: TenantWorkspaceSettingsService,
  ) {}

  async listOwnerReports(tenant: SaasTenant) {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const result = await client.query(`
        SELECT r.id,
               r.property_id AS "propertyId",
               r.property_title AS "propertyTitle",
               r.owner_name AS "ownerName",
               r.owner_email AS "ownerEmail",
               r.owner_phone AS "ownerPhone",
               r.subject,
               r.channels,
               r.delivery_results AS "deliveryResults",
               r.delivery_status AS "deliveryStatus",
               r.sent_by_name AS "sentByName",
               r.sent_at AS "sentAt"
        FROM tenant_owner_report r
        ORDER BY r.sent_at DESC, r.id DESC
      `);
        return result.rows;
      },
    );
  }

  async ownerReport(tenant: SaasTenant, reportId: number) {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const result = await client.query(
          `SELECT r.id,
                r.property_id AS "propertyId",
                r.property_title AS "propertyTitle",
                r.owner_name AS "ownerName",
                r.owner_email AS "ownerEmail",
                r.owner_phone AS "ownerPhone",
                r.subject,
                r.body,
                r.channels,
                r.delivery_results AS "deliveryResults",
                r.delivery_status AS "deliveryStatus",
                r.sent_by_master_user_id AS "sentByMasterUserId",
                r.sent_by_name AS "sentByName",
                r.sent_at AS "sentAt",
                r.created_at AS "createdAt"
         FROM tenant_owner_report r
         WHERE r.id = $1`,
          [reportId],
        );
        if (!result.rowCount)
          throw new NotFoundException('Owner report not found');
        return result.rows[0];
      },
    );
  }

  async sendOwnerReport(tenant: SaasTenant, dto: any, user: any) {
    const propertyId = this.positiveId(dto.propertyId, 'Property');
    const property = await this.property(tenant, propertyId);
    const propertyPayload = this.object(property.payload);
    const ownerName = this.clean(
      dto.ownerName ?? propertyPayload.ownerName ?? propertyPayload.owner_name,
      200,
    );
    const ownerEmail = this.clean(
      dto.ownerEmail ??
        propertyPayload.ownerEmail ??
        propertyPayload.owner_email,
      240,
    ).toLowerCase();
    const ownerPhone = this.clean(
      dto.ownerPhone ??
        propertyPayload.ownerPhone ??
        propertyPayload.owner_phone,
      80,
    );
    const subject = this.clean(dto.subject, 300);
    const body = this.clean(dto.body, 20_000);
    const channels = this.channels(dto.channels);
    if (!subject || !body) {
      throw new BadRequestException('Report subject and message are required');
    }
    if (!channels.length) {
      throw new BadRequestException('Choose Email, SMS, or both');
    }
    const sentByName = this.clean(
      user?.fullName ?? user?.email ?? 'Tenant user',
      200,
    );
    const sentByMasterUserId = Number(user?.id ?? user?.sub ?? 0) || null;

    const saved = await this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        await client.query('BEGIN');
        try {
          const result = await client.query(
            `INSERT INTO tenant_owner_report(
               property_id, property_title, owner_name, owner_email,
               owner_phone, subject, body, channels, delivery_results,
               delivery_status, sent_by_master_user_id, sent_by_name
             ) VALUES (
               $1, $2, $3, $4, $5, $6, $7, $8::jsonb,
               '[]'::jsonb, 'scheduled', $9, $10
             ) RETURNING id`,
            [
              propertyId,
              property.title,
              ownerName,
              ownerEmail,
              ownerPhone,
              subject,
              body,
              JSON.stringify(channels),
              sentByMasterUserId,
              sentByName,
            ],
          );
          const reportId = Number(result.rows[0].id);
          const jobs = await this.outreach.enqueueWithClient(client, {
            sourceType: 'owner-report',
            sourceId: reportId,
            channels,
            recipientName: ownerName,
            recipientEmail: ownerEmail,
            recipientPhone: ownerPhone,
            title: subject,
            body,
            createdBy: sentByName,
            scheduledAt: new Date(),
            idempotencyKey: `owner-report:${tenant.id}:${reportId}`,
            payload: { propertyId, propertyTitle: property.title },
          });
          const deliveryResults = jobs.map((job: any) => ({
            channel: job.channel,
            status: 'scheduled',
            message: 'Queued in the tenant delivery database.',
            jobId: Number(job.id),
          }));
          await client.query(
            `UPDATE tenant_owner_report
             SET delivery_results = $2::jsonb,
                 delivery_status = 'scheduled'
             WHERE id = $1`,
            [reportId, JSON.stringify(deliveryResults)],
          );
          await this.audit(
            client,
            'owner-report.queued',
            sentByMasterUserId,
            `Owner report for ${property.title} queued in tenant delivery`,
            {
              reportId,
              propertyId,
              ownerEmail,
              ownerPhone,
              channels,
              deliveryStatus: 'scheduled',
            },
          );
          await client.query('COMMIT');
          return reportId;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      },
    );
    return this.ownerReport(tenant, saved);
  }

  async listShowingTemplates(tenant: SaasTenant) {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const result = await client.query(`
        SELECT id,
               name,
               description,
               property_mode AS "propertyMode",
               fields,
               is_active AS "isActive",
               created_at AS "createdAt",
               updated_at AS "updatedAt"
        FROM tenant_showing_form_template
        ORDER BY is_active DESC, updated_at DESC, id DESC
      `);
        return result.rows;
      },
    );
  }

  async createShowingTemplate(tenant: SaasTenant, dto: any, user: any) {
    const name = this.clean(dto.name, 200);
    const description = this.clean(dto.description, 2000);
    const propertyMode = this.propertyMode(dto.propertyMode);
    const fields = this.normalizeFields(dto.fields);
    if (!name) throw new BadRequestException('Template name is required');
    if (!fields.length) {
      throw new BadRequestException('Add at least one field to the template');
    }
    const actorUserId = Number(user?.id ?? user?.sub ?? 0) || null;
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const result = await client.query(
          `INSERT INTO tenant_showing_form_template(
           name,
           description,
           property_mode,
           fields,
           created_by_master_user_id
         )
         VALUES ($1, $2, $3, $4::jsonb, $5)
         RETURNING id,
                   name,
                   description,
                   property_mode AS "propertyMode",
                   fields,
                   is_active AS "isActive",
                   created_at AS "createdAt",
                   updated_at AS "updatedAt"`,
          [
            name,
            description,
            propertyMode,
            JSON.stringify(fields),
            actorUserId,
          ],
        );
        await this.audit(
          client,
          'showing-template.created',
          actorUserId,
          `Created showing form template ${name}`,
          { templateId: result.rows[0].id, propertyMode },
        );
        return result.rows[0];
      },
    );
  }

  async listShowingRequests(tenant: SaasTenant) {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const result = await client.query(`
        SELECT r.id,
               r.title,
               r.status,
               r.delivery_status AS "deliveryStatus",
               r.lead_id AS "leadId",
               l.full_name AS "leadName",
               r.property_id AS "propertyId",
               p.title AS "propertyTitle",
               r.requested_property_id AS "requestedPropertyId",
               requested.title AS "requestedPropertyTitle",
               r.property_mode AS "propertyMode",
               r.recipient_email AS "recipientEmail",
               r.recipient_phone AS "recipientPhone",
               r.expires_at AS "expiresAt",
               r.preferred_showing_at AS "preferredShowingAt",
               r.sent_at AS "sentAt",
               r.submitted_at AS "submittedAt",
               r.approved_at AS "approvedAt",
               r.assigned_realtor_name AS "assignedRealtorName",
               r.approved_showing_id AS "approvedShowingId"
        FROM tenant_showing_request r
        JOIN tenant_lead l ON l.id = r.lead_id
        LEFT JOIN tenant_property p ON p.id = r.property_id
        LEFT JOIN tenant_property requested ON requested.id = r.requested_property_id
        ORDER BY r.created_at DESC, r.id DESC
      `);
        return result.rows;
      },
    );
  }

  async showingRequest(tenant: SaasTenant, requestId: number) {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const request = await this.requestRow(client, requestId);
        if (!request) throw new NotFoundException('Showing request not found');
        return {
          ...request,
          publicUrl: this.publicUrl(tenant, request.accessToken),
        };
      },
    );
  }

  async createShowingRequest(tenant: SaasTenant, dto: any, user: any) {
    const leadId = this.positiveId(dto.leadId, 'Lead');
    const templateId =
      Number(dto.templateId) > 0 ? Number(dto.templateId) : null;
    const actorUserId = Number(user?.id ?? user?.sub ?? 0) || null;
    const actorName = this.clean(
      user?.fullName ?? user?.email ?? 'Tenant user',
      200,
    );
    const expiryHours = Math.min(
      24 * 30,
      Math.max(1, Number(dto.expiryHours) || 72),
    );

    const context = await this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const lead = await client.query(
          `SELECT l.id,
                  l.full_name AS "fullName",
                  COALESCE(l.email, '') AS email,
                  COALESCE(l.phone, '') AS phone,
                  COALESCE(
                    jsonb_agg(
                      jsonb_build_object('id', p.id, 'title', p.title, 'status', p.status)
                      ORDER BY p.title
                    ) FILTER (WHERE p.id IS NOT NULL),
                    '[]'::jsonb
                  ) AS properties
           FROM tenant_lead l
           LEFT JOIN tenant_lead_property lp ON lp.lead_id = l.id
           LEFT JOIN tenant_property p ON p.id = lp.property_id
           WHERE l.id = $1
           GROUP BY l.id, l.full_name, l.email, l.phone`,
          [leadId],
        );
        if (!lead.rowCount) throw new NotFoundException('Lead not found');
        const template = templateId
          ? await client.query(
              `SELECT id,
                      name,
                      description,
                      property_mode AS "propertyMode",
                      fields
               FROM tenant_showing_form_template
               WHERE id = $1 AND is_active = true`,
              [templateId],
            )
          : null;
        if (templateId && !template?.rowCount) {
          throw new NotFoundException('Active showing form template not found');
        }
        return {
          lead: lead.rows[0],
          template: template?.rows[0] ?? null,
        };
      },
    );

    const propertyMode = this.propertyMode(
      dto.propertyMode ?? context.template?.propertyMode,
    );
    const fields = this.normalizeFields(dto.fields ?? context.template?.fields);
    if (!fields.length) {
      throw new BadRequestException('The showing request form has no fields');
    }

    const leadProperties = Array.isArray(context.lead.properties)
      ? context.lead.properties
      : [];
    const requestedPropertyId =
      Number(dto.propertyId) > 0
        ? Number(dto.propertyId)
        : propertyMode === 'fixed' && leadProperties.length === 1
          ? Number(leadProperties[0].id)
          : null;

    let property: any = null;
    if (propertyMode === 'fixed') {
      if (!requestedPropertyId) {
        throw new BadRequestException(
          'Choose a published property for this showing request',
        );
      }
      property = await this.publishedProperty(tenant, requestedPropertyId);
    }

    const recipientEmail = this.clean(context.lead.email, 240).toLowerCase();
    const recipientPhone = this.clean(context.lead.phone, 80);
    const title =
      this.clean(dto.title, 240) ||
      `Showing request${property ? ` - ${property.title}` : ''}`;
    const message = this.clean(dto.message, 4000);
    const channels = this.channels(dto.channels);
    if (!channels.length) {
      throw new BadRequestException('Choose Email, SMS, or both');
    }

    const token = randomBytes(36).toString('base64url');
    const expiresAt = new Date(Date.now() + expiryHours * 3_600_000);
    const publicUrl = this.publicUrl(tenant, token);
    const deliveryBody = [
      message ||
        `${tenant.businessName} invited you to request a property showing.`,
      '',
      `Open the secure form: ${publicUrl}`,
      `This link expires ${expiresAt.toLocaleString('en-US', { timeZone: 'UTC' })} UTC.`,
    ].join('\n');
    const requestId = await this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        await client.query('BEGIN');
        try {
          if (property) {
            await client.query(
              `INSERT INTO tenant_lead_property(lead_id, property_id)
               VALUES ($1, $2)
               ON CONFLICT DO NOTHING`,
              [leadId, property.id],
            );
          }
          const result = await client.query(
            `INSERT INTO tenant_showing_request(
               access_token, template_id, lead_id, property_id, title,
               message, recipient_name, recipient_email, recipient_phone,
               property_mode, fields, delivery_channels, delivery_results,
               delivery_status, status, expires_at, created_by_master_user_id
             ) VALUES (
               $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
               $11::jsonb, $12::jsonb, '[]'::jsonb,
               'scheduled', 'sent', $13, $14
             ) RETURNING id`,
            [
              token,
              templateId,
              leadId,
              property?.id ?? null,
              title,
              message,
              context.lead.fullName,
              recipientEmail,
              recipientPhone,
              propertyMode,
              JSON.stringify(fields),
              JSON.stringify(channels),
              expiresAt,
              actorUserId,
            ],
          );
          const savedRequestId = Number(result.rows[0].id);
          const jobs = await this.outreach.enqueueWithClient(client, {
            leadId,
            sourceType: 'showing-request',
            sourceId: savedRequestId,
            channels,
            recipientName: context.lead.fullName,
            recipientEmail,
            recipientPhone,
            title,
            body: deliveryBody,
            createdBy: actorName,
            scheduledAt: new Date(),
            idempotencyKey: `showing-request:${tenant.id}:${savedRequestId}`,
            payload: {
              propertyId: property?.id ?? null,
              publicUrl,
              expiresAt: expiresAt.toISOString(),
            },
          });
          const deliveryResults = jobs.map((job: any) => ({
            channel: job.channel,
            status: 'scheduled',
            message: 'Queued in the tenant delivery database.',
            jobId: Number(job.id),
          }));
          await client.query(
            `UPDATE tenant_showing_request
             SET delivery_results = $2::jsonb,
                 delivery_status = 'scheduled'
             WHERE id = $1`,
            [savedRequestId, JSON.stringify(deliveryResults)],
          );
          await this.audit(
            client,
            'showing-request.queued',
            actorUserId,
            `Queued showing request for ${context.lead.fullName}`,
            {
              requestId: savedRequestId,
              leadId,
              propertyId: property?.id ?? null,
              propertyMode,
              deliveryStatus: 'scheduled',
            },
          );
          await client.query('COMMIT');
          return savedRequestId;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      },
    );
    return this.showingRequest(tenant, requestId);
  }

  async approveShowingRequest(
    tenant: SaasTenant,
    requestId: number,
    dto: any,
    user: any,
  ) {
    const realtorName = this.clean(dto.realtorName, 200);
    const realtorEmail = this.clean(dto.realtorEmail, 240).toLowerCase();
    const realtorPhone = this.clean(dto.realtorPhone, 80);
    const notes = this.clean(dto.notes, 4000);
    if (!realtorName) {
      throw new BadRequestException(
        'Assign the showing realtor before approval',
      );
    }
    const actorUserId = Number(user?.id ?? user?.sub ?? 0) || null;
    let confirmationContext: any = null;

    await this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        await client.query('BEGIN');
        try {
          const request = await this.requestRow(client, requestId);
          if (!request)
            throw new NotFoundException('Showing request not found');
          if (request.status !== 'submitted') {
            throw new BadRequestException(
              'Only submitted requests can be approved',
            );
          }
          const propertyId =
            Number(dto.propertyId) > 0
              ? Number(dto.propertyId)
              : Number(request.requestedPropertyId ?? request.propertyId);
          if (!propertyId) {
            throw new BadRequestException('Choose a property before approval');
          }
          const property = await this.assertPublishedProperty(
            client,
            propertyId,
          );
          const showingAt = this.date(
            dto.showingAt ?? request.preferredShowingAt,
            'Showing date and time',
          );
          if (showingAt.getTime() <= Date.now()) {
            throw new BadRequestException(
              'Showing date and time must be in the future',
            );
          }
          const duplicate = await client.query(
            'SELECT id FROM tenant_showing WHERE showing_request_id = $1',
            [requestId],
          );
          if (duplicate.rowCount) {
            throw new BadRequestException('This request already has a showing');
          }
          const showing = await client.query(
            `INSERT INTO tenant_showing(
             showing_request_id,
             lead_id,
             property_id,
             lead_name,
             lead_email,
             lead_phone,
             realtor_name,
             realtor_email,
             realtor_phone,
             showing_at,
             status,
             notes
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'scheduled', $11)
           RETURNING id`,
            [
              requestId,
              request.leadId,
              propertyId,
              request.leadName,
              request.recipientEmail,
              request.recipientPhone,
              realtorName,
              realtorEmail,
              realtorPhone,
              showingAt,
              notes,
            ],
          );
          const showingId = Number(showing.rows[0].id);
          await client.query(
            `UPDATE tenant_showing_request
           SET status = 'approved',
               requested_property_id = $2,
               preferred_showing_at = $3,
               assigned_realtor_name = $4,
               assigned_realtor_email = $5,
               assigned_realtor_phone = $6,
               approved_showing_id = $7,
               approved_at = now(),
               updated_at = now()
           WHERE id = $1`,
            [
              requestId,
              propertyId,
              showingAt,
              realtorName,
              realtorEmail,
              realtorPhone,
              showingId,
            ],
          );
          await client.query(
            `INSERT INTO tenant_lead_property(lead_id, property_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
            [request.leadId, propertyId],
          );
          await client.query(
            `UPDATE tenant_lead
             SET payload = COALESCE(payload, '{}'::jsonb) || jsonb_build_object(
               'stage', 'Visit',
               'inBoard', true,
               'propertyVisitAt', $2::text,
               'lastActivityAt', now()::text
             ),
             updated_at = now()
             WHERE id = $1
               AND COALESCE(payload->>'stage', '') NOT IN ('Deal', 'Canceled')`,
            [request.leadId, showingAt.toISOString()],
          );
          await this.audit(
            client,
            'showing-request.approved',
            actorUserId,
            `Approved showing request for ${property.title}`,
            {
              requestId,
              showingId,
              propertyId,
              realtorName,
              showingAt: showingAt.toISOString(),
            },
          );
          confirmationContext = {
            showingId,
            propertyId,
            propertyTitle: property.title,
            leadId: request.leadId,
            leadName: request.leadName,
            recipientEmail: request.recipientEmail,
            recipientPhone: request.recipientPhone,
            realtorName,
            realtorEmail,
            realtorPhone,
            showingAt,
          };
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      },
    );

    if (confirmationContext) {
      await this.autoSendShowingConfirmations(tenant, confirmationContext).catch(
        (error) => {
          this.logger.warn(
            `Showing confirmation send failed for tenant ${tenant.id}: ${this.message(error)}`,
          );
        },
      );
    }

    return this.showingRequest(tenant, requestId);
  }

  /**
   * Auto-sends the configured lead + realtor showing confirmations after a
   * showing is approved, using the leadShowingTemplateId /
   * realtorShowingTemplateId templates. Skips silently when automation is off
   * or the templates are not configured.
   */
  private async autoSendShowingConfirmations(tenant: SaasTenant, ctx: any) {
    if (!this.settings || !this.outreach) {
      return { lead: 0, realtor: 0 };
    }
    const agency: any = await this.settings.getAgencySettings(tenant);
    const automation = agency?.leadAutomation ?? {};
    if (automation.enabled !== true) {
      return { lead: 0, realtor: 0 };
    }
    const templates = Array.isArray(agency?.communicationTemplates)
      ? agency.communicationTemplates
      : [];
    const findTemplate = (id: unknown, audiences: string[]) =>
      templates.find(
        (item: any) =>
          `${item?.id}` === `${id ?? ''}` &&
          item?.isActive !== false &&
          audiences.includes(`${item?.audience ?? ''}`),
      );
    const leadTemplate = findTemplate(automation.leadShowingTemplateId, [
      'Lead',
      'LeadShowing',
      '',
    ]);
    const realtorTemplate = findTemplate(automation.realtorShowingTemplateId, [
      'Realtor',
      '',
    ]);
    if (!leadTemplate && !realtorTemplate) {
      return { lead: 0, realtor: 0 };
    }
    const showingTime = this.formatShowingTime(ctx.showingAt);
    const tokens = {
      clientName: this.clean(ctx.leadName, 200, 'Lead name'),
      propertyAddress: this.clean(ctx.propertyTitle, 240, 'Property'),
      showingTime,
      agentName: this.clean(ctx.realtorName, 200, 'Realtor name'),
      agencyName: this.clean(agency?.profile?.agencyName, 200),
    };
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        let lead = 0;
        let realtor = 0;
        const channels = this.channels(automation.channels);
        const leadChannels = channels.filter((channel) =>
          this.templateHasChannel(leadTemplate, channel),
        );
        for (const channel of leadChannels) {
          const recipientEmail = channel === 'Email' ? this.clean(ctx.recipientEmail, 240) : '';
          const recipientPhone = channel === 'SMS' ? this.clean(ctx.recipientPhone, 80) : '';
          if (channel === 'Email' && !recipientEmail) continue;
          if (channel === 'SMS' && !recipientPhone) continue;
          const jobs = await this.outreach.enqueueWithClient(client, {
            leadId: Number(ctx.leadId) > 0 ? Number(ctx.leadId) : null,
            sourceType: 'showing-confirmation',
            sourceId: ctx.showingId,
            channels: [channel],
            recipientName: tokens.clientName,
            recipientEmail,
            recipientPhone,
            title: this.renderShowingTemplate(
              this.clean(leadTemplate.subject, 500, 'Subject') || 'Showing confirmed',
              tokens,
            ),
            body: this.renderShowingTemplate(
              this.clean(leadTemplate.body, 4000, 'Body'),
              tokens,
            ),
            createdBy: `showing-confirmation:${this.clean(leadTemplate.id, 120)}:lead`,
            idempotencyKey: `showing-confirmation:${ctx.showingId}:${this.clean(leadTemplate.id, 120)}:lead:${channel.toLowerCase()}`,
            payload: {
              templateId: this.clean(leadTemplate.id, 120),
              showingId: Number(ctx.showingId) || null,
              audience: 'LeadShowing',
              automatic: true,
            },
          });
          if (jobs[0]?.status !== 'failed') lead += 1;
        }
        const realtorChannels = channels.filter((channel) =>
          this.templateHasChannel(realtorTemplate, channel),
        );
        for (const channel of realtorChannels) {
          const recipientEmail = channel === 'Email' ? this.clean(ctx.realtorEmail, 240) : '';
          const recipientPhone = channel === 'SMS' ? this.clean(ctx.realtorPhone, 80) : '';
          if (channel === 'Email' && !recipientEmail) continue;
          if (channel === 'SMS' && !recipientPhone) continue;
          const jobs = await this.outreach.enqueueWithClient(client, {
            leadId: Number(ctx.leadId) > 0 ? Number(ctx.leadId) : null,
            sourceType: 'showing-confirmation',
            sourceId: ctx.showingId,
            channels: [channel],
            recipientName: tokens.agentName,
            recipientEmail,
            recipientPhone,
            title: this.renderShowingTemplate(
              this.clean(realtorTemplate.subject, 500, 'Subject') || 'Showing assigned',
              tokens,
            ),
            body: this.renderShowingTemplate(
              this.clean(realtorTemplate.body, 4000, 'Body'),
              tokens,
            ),
            createdBy: `showing-confirmation:${this.clean(realtorTemplate.id, 120)}:realtor`,
            idempotencyKey: `showing-confirmation:${ctx.showingId}:${this.clean(realtorTemplate.id, 120)}:realtor:${channel.toLowerCase()}`,
            payload: {
              templateId: this.clean(realtorTemplate.id, 120),
              showingId: Number(ctx.showingId) || null,
              audience: 'Realtor',
              automatic: true,
            },
          });
          if (jobs[0]?.status !== 'failed') realtor += 1;
        }
        return { lead, realtor };
      },
    );
  }

  private templateHasChannel(template: any, channel: DeliveryChannel) {
    if (!template) return false;
    const channels = Array.isArray(template.channels)
      ? template.channels.map((item: any) => `${item}`.toLowerCase())
      : [];
    return channels.includes(channel.toLowerCase());
  }

  private renderShowingTemplate(text: string, tokens: Record<string, string>) {
    const replacements: Record<string, string> = {
      '{{client_name}}': tokens.clientName || 'the lead',
      '{{property_address}}': tokens.propertyAddress || 'the property',
      '{{showing_time}}': tokens.showingTime || 'the scheduled time',
      '{{agent_name}}': tokens.agentName || 'your agent',
      '{{agency_name}}': tokens.agencyName || 'our agency',
    };
    return Object.entries(replacements).reduce(
      (current, [token, value]) => current.replaceAll(token, value),
      this.clean(text, 4000),
    );
  }

  private formatShowingTime(value: unknown) {
    const date = this.date(value, 'Showing date and time');
    if (!Number.isFinite(date.getTime())) return '';
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  private message(error: unknown) {
    return error instanceof Error ? error.message : `${error ?? 'Unknown error'}`;
  }

  async rejectShowingRequest(
    tenant: SaasTenant,
    requestId: number,
    dto: any,
    user: any,
  ) {
    const reason = this.clean(dto.reason, 2000);
    const actorUserId = Number(user?.id ?? user?.sub ?? 0) || null;
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const request = await this.requestRow(client, requestId);
        if (!request) throw new NotFoundException('Showing request not found');
        if (['approved', 'rejected', 'expired'].includes(request.status)) {
          throw new BadRequestException(
            'This showing request can no longer be rejected',
          );
        }
        await client.query(
          `UPDATE tenant_showing_request
         SET status = 'rejected',
             rejected_at = now(),
             message = CASE WHEN $2 = '' THEN message ELSE message || E'\n\nRejection note: ' || $2 END,
             updated_at = now()
         WHERE id = $1`,
          [requestId, reason],
        );
        await this.audit(
          client,
          'showing-request.rejected',
          actorUserId,
          `Rejected showing request for ${request.leadName}`,
          { requestId, reason },
        );
        return { id: requestId, status: 'rejected' };
      },
    );
  }

  async listShowings(tenant: SaasTenant) {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const result = await client.query(`
        SELECT s.id,
               s.showing_request_id AS "showingRequestId",
               s.lead_id AS "leadId",
               s.property_id AS "propertyId",
               p.title AS "propertyTitle",
               s.lead_name AS "leadName",
               s.lead_email AS "leadEmail",
               s.lead_phone AS "leadPhone",
               s.realtor_name AS "realtorName",
               s.realtor_email AS "realtorEmail",
               s.realtor_phone AS "realtorPhone",
               s.showing_at AS "showingAt",
               s.status,
               s.notes,
               s.created_at AS "createdAt",
               s.updated_at AS "updatedAt"
        FROM tenant_showing s
        JOIN tenant_property p ON p.id = s.property_id
        ORDER BY s.showing_at ASC, s.id ASC
      `);
        return result.rows;
      },
    );
  }

  async publicShowingRequest(tenant: SaasTenant, token: string) {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const request = await this.requestByToken(client, token);
        if (!request) throw new NotFoundException('Showing request not found');
        if (new Date(request.expiresAt).getTime() <= Date.now()) {
          if (request.status !== 'expired') {
            await client.query(
              `UPDATE tenant_showing_request
             SET status = 'expired', updated_at = now()
             WHERE id = $1`,
              [request.id],
            );
          }
          throw new GoneException('This showing request has expired');
        }
        if (request.status === 'rejected') {
          throw new GoneException('This showing request is no longer active');
        }
        if (['sent', 'failed'].includes(request.status)) {
          await client.query(
            `UPDATE tenant_showing_request
           SET status = 'viewed',
               viewed_at = COALESCE(viewed_at, now()),
               updated_at = now()
           WHERE id = $1`,
            [request.id],
          );
          request.status = 'viewed';
        }
        const settings = await client.query(
          `SELECT key, value
         FROM tenant_setting
         WHERE key IN ('branding', 'tenant_identity')`,
        );
        const settingMap = Object.fromEntries(
          settings.rows.map((row: any) => [row.key, row.value]),
        );
        const properties =
          request.propertyMode === 'respondent'
            ? (
                await client.query(
                  `SELECT id, title
                 FROM tenant_property
                 WHERE status = 'published'
                 ORDER BY title`,
                )
              ).rows
            : request.propertyId
              ? [
                  {
                    id: request.propertyId,
                    title: request.propertyTitle,
                  },
                ]
              : [];
        return {
          id: request.id,
          title: request.title,
          message: request.message,
          status: request.status,
          propertyMode: request.propertyMode,
          propertyId: request.propertyId,
          propertyTitle: request.propertyTitle,
          leadName: request.leadName,
          fields: request.fields,
          answers: request.answers,
          properties,
          expiresAt: request.expiresAt,
          preferredShowingAt: request.preferredShowingAt,
          businessName:
            settingMap.tenant_identity?.businessName ?? tenant.businessName,
          brandColor: settingMap.branding?.primaryColor ?? '#0f766e',
          logoUrl: settingMap.branding?.logoUrl ?? '',
        };
      },
    );
  }

  async submitPublicShowingRequest(
    tenant: SaasTenant,
    token: string,
    dto: any,
  ) {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        await client.query('BEGIN');
        let transactionOpen = true;
        try {
          const request = await this.requestByToken(client, token);
          if (!request)
            throw new NotFoundException('Showing request not found');
          if (new Date(request.expiresAt).getTime() <= Date.now()) {
            await client.query(
              `UPDATE tenant_showing_request
             SET status = 'expired', updated_at = now()
             WHERE id = $1`,
              [request.id],
            );
            await client.query('COMMIT');
            transactionOpen = false;
            throw new GoneException('This showing request has expired');
          }
          if (!['sent', 'viewed', 'failed'].includes(request.status)) {
            throw new BadRequestException(
              'This showing request has already been completed',
            );
          }

          const answers = this.sanitizeAnswers(dto.answers);
          const fields = this.normalizeFields(request.fields);
          this.validateRequiredAnswers(fields, answers);
          const propertyId =
            request.propertyMode === 'fixed'
              ? Number(request.propertyId)
              : this.positiveId(dto.propertyId, 'Property');
          const property = await this.assertPublishedProperty(
            client,
            propertyId,
          );
          const preferredRaw =
            dto.preferredShowingAt ??
            answers.preferredshowingat ??
            answers.preferreddatetime ??
            answers.showingat ??
            null;
          const preferredShowingAt = preferredRaw
            ? this.date(preferredRaw, 'Preferred showing time')
            : null;
          if (
            preferredShowingAt &&
            preferredShowingAt.getTime() <= Date.now()
          ) {
            throw new BadRequestException(
              'Preferred showing time must be in the future',
            );
          }

          await client.query(
            `UPDATE tenant_showing_request
           SET status = 'submitted',
               requested_property_id = $2,
               answers = $3::jsonb,
               preferred_showing_at = $4,
               submitted_at = now(),
               viewed_at = COALESCE(viewed_at, now()),
               updated_at = now()
           WHERE id = $1`,
            [
              request.id,
              property.id,
              JSON.stringify(answers),
              preferredShowingAt,
            ],
          );
          await client.query(
            `INSERT INTO tenant_lead_property(lead_id, property_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
            [request.leadId, property.id],
          );
          await this.audit(
            client,
            'showing-request.submitted',
            null,
            `Showing request submitted for ${property.title}`,
            {
              requestId: request.id,
              leadId: request.leadId,
              propertyId: property.id,
              preferredShowingAt: preferredShowingAt?.toISOString() ?? null,
            },
          );
          await client.query('COMMIT');
          transactionOpen = false;
          return {
            id: request.id,
            status: 'submitted',
            submittedAt: new Date().toISOString(),
          };
        } catch (error) {
          if (transactionOpen) await client.query('ROLLBACK');
          throw error;
        }
      },
    );
  }

  private async requestRow(client: any, requestId: number) {
    const result = await client.query(
      `SELECT r.id,
              r.access_token AS "accessToken",
              r.template_id AS "templateId",
              r.lead_id AS "leadId",
              l.full_name AS "leadName",
              r.property_id AS "propertyId",
              p.title AS "propertyTitle",
              r.requested_property_id AS "requestedPropertyId",
              requested.title AS "requestedPropertyTitle",
              r.title,
              r.message,
              r.recipient_name AS "recipientName",
              r.recipient_email AS "recipientEmail",
              r.recipient_phone AS "recipientPhone",
              r.property_mode AS "propertyMode",
              r.fields,
              r.answers,
              r.delivery_channels AS "deliveryChannels",
              r.delivery_results AS "deliveryResults",
              r.delivery_status AS "deliveryStatus",
              r.status,
              r.expires_at AS "expiresAt",
              r.preferred_showing_at AS "preferredShowingAt",
              r.sent_at AS "sentAt",
              r.viewed_at AS "viewedAt",
              r.submitted_at AS "submittedAt",
              r.approved_at AS "approvedAt",
              r.rejected_at AS "rejectedAt",
              r.assigned_realtor_name AS "assignedRealtorName",
              r.assigned_realtor_email AS "assignedRealtorEmail",
              r.assigned_realtor_phone AS "assignedRealtorPhone",
              r.approved_showing_id AS "approvedShowingId",
              r.created_at AS "createdAt",
              r.updated_at AS "updatedAt"
       FROM tenant_showing_request r
       JOIN tenant_lead l ON l.id = r.lead_id
       LEFT JOIN tenant_property p ON p.id = r.property_id
       LEFT JOIN tenant_property requested ON requested.id = r.requested_property_id
       WHERE r.id = $1`,
      [requestId],
    );
    return result.rows[0] ?? null;
  }

  private async requestByToken(client: any, token: string) {
    const cleanToken = this.clean(token, 120);
    if (!cleanToken) return null;
    const result = await client.query(
      `SELECT r.id,
              r.lead_id AS "leadId",
              l.full_name AS "leadName",
              r.property_id AS "propertyId",
              p.title AS "propertyTitle",
              r.title,
              r.message,
              r.property_mode AS "propertyMode",
              r.fields,
              r.answers,
              r.status,
              r.expires_at AS "expiresAt",
              r.preferred_showing_at AS "preferredShowingAt"
       FROM tenant_showing_request r
       JOIN tenant_lead l ON l.id = r.lead_id
       LEFT JOIN tenant_property p ON p.id = r.property_id
       WHERE r.access_token = $1`,
      [cleanToken],
    );
    return result.rows[0] ?? null;
  }

  private async property(tenant: SaasTenant, propertyId: number) {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => {
        const result = await client.query(
          'SELECT id, title, status, payload FROM tenant_property WHERE id = $1',
          [propertyId],
        );
        if (!result.rowCount) throw new NotFoundException('Property not found');
        return result.rows[0];
      },
    );
  }

  private async publishedProperty(tenant: SaasTenant, propertyId: number) {
    return this.databases.withTenantClient(
      this.databaseName(tenant),
      (client) => this.assertPublishedProperty(client, propertyId),
    );
  }

  private async assertPublishedProperty(client: any, propertyId: number) {
    const result = await client.query(
      'SELECT id, title, status, payload FROM tenant_property WHERE id = $1',
      [propertyId],
    );
    if (!result.rowCount) throw new NotFoundException('Property not found');
    if (result.rows[0].status !== 'published') {
      throw new BadRequestException(
        'This property is inactive. Inactive properties cannot collect leads or showing requests.',
      );
    }
    return result.rows[0];
  }

  private normalizeFields(value: unknown): ShowingFormField[] {
    if (!Array.isArray(value)) return [];
    const fields: ShowingFormField[] = [];
    const keys = new Set<string>();
    const validTypes = new Set<ShowingFormField['type']>([
      'text',
      'email',
      'phone',
      'number',
      'textarea',
      'select',
      'radio',
      'checkbox',
      'checkbox-group',
      'date',
      'datetime',
      'divider',
      'heading',
      'paragraph',
      'image',
    ]);
    for (const [index, raw] of value.slice(0, 30).entries()) {
      const input = this.object(raw);
      const type = validTypes.has(input.type as ShowingFormField['type'])
        ? (input.type as ShowingFormField['type'])
        : 'text';
      const label = this.clean(input.label, 160) || (type === 'divider' ? 'Divider' : '');
      if (!label) continue;
      const baseKey =
        this.clean(input.key, 120)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '') ||
        label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '') ||
        `field_${index + 1}`;
      let key = baseKey;
      let suffix = 2;
      while (keys.has(key)) {
        key = `${baseKey}_${suffix++}`;
      }
      keys.add(key);
      const options = Array.isArray(input.options)
        ? [
            ...new Set(
              input.options
                .map((option: unknown) => this.clean(option, 120))
                .filter(Boolean),
            ),
          ].slice(0, 30)
        : [];
      const staticField = ['divider', 'heading', 'paragraph', 'image'].includes(type);
      const imageUrl = type === 'image' ? this.safeImageUrl(input.imageUrl) : '';
      if (type === 'image' && !imageUrl) continue;
      fields.push({
        key,
        label,
        type,
        required: staticField ? false : input.required === true,
        options: ['select', 'radio', 'checkbox-group'].includes(type) ? options : [],
        description: this.clean(input.description, 1000),
        ...(imageUrl ? { imageUrl } : {}),
      });
    }
    return fields;
  }

  private sanitizeAnswers(value: unknown) {
    const input = this.object(value);
    const answers: Record<string, unknown> = {};
    for (const [rawKey, rawValue] of Object.entries(input).slice(0, 50)) {
      const key = this.clean(rawKey, 120)
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '');
      if (!key) continue;
      answers[key] =
        typeof rawValue === 'boolean'
          ? rawValue
          : Array.isArray(rawValue)
            ? rawValue
                .map((item) => this.clean(item, 1000))
                .filter(Boolean)
                .slice(0, 30)
            : this.clean(rawValue, 5000);
    }
    return answers;
  }

  private validateRequiredAnswers(
    fields: ShowingFormField[],
    answers: Record<string, unknown>,
  ) {
    for (const field of fields) {
      if (['divider', 'heading', 'paragraph', 'image'].includes(field.type) || !field.required) continue;
      const value = answers[field.key];
      const missing =
        field.type === 'checkbox'
          ? value !== true
          : value == null ||
            (Array.isArray(value)
              ? value.length === 0
              : this.clean(value, 5000).length === 0);
      if (missing) {
        throw new BadRequestException(`${field.label} is required`);
      }
    }
  }

  private channels(value: unknown): DeliveryChannel[] {
    const values = Array.isArray(value) ? value : value == null ? [] : [value];
    const channels = values
      .map((item) => this.clean(item, 20).toLowerCase())
      .map((item): DeliveryChannel | null => {
        if (item === 'email') return 'Email';
        if (item === 'sms') return 'SMS';
        return null;
      })
      .filter((item): item is DeliveryChannel => Boolean(item));
    return [...new Set(channels)];
  }

  private safeImageUrl(value: unknown) {
    const raw = this.clean(value, 1000);
    if (!raw) return '';
    if (raw.startsWith('/')) return raw;
    try {
      const url = new URL(raw);
      return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
    } catch {
      return '';
    }
  }

  private propertyMode(value: unknown): 'fixed' | 'respondent' {
    return this.clean(value, 40).toLowerCase() === 'respondent'
      ? 'respondent'
      : 'fixed';
  }

  private positiveId(value: unknown, label: string) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException(`${label} is required`);
    }
    return id;
  }

  private date(value: unknown, label: string) {
    const date = new Date(String(value ?? ''));
    if (!Number.isFinite(date.getTime())) {
      throw new BadRequestException(`${label} is invalid`);
    }
    return date;
  }

  private publicUrl(tenant: SaasTenant, token: string) {
    return this.platformDomain.getTenantFrontendUrl(
      tenant.subdomain,
      `/showing-request/${encodeURIComponent(token)}`,
    );
  }

  private object(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, any>)
      : {};
  }

  private clean(value: unknown, maxLength: number, field = 'Value') {
    return sanitizePlainText(value, field, maxLength);
  }

  private databaseName(tenant: SaasTenant) {
    if (!tenant.databaseName) {
      throw new BadRequestException('Tenant database is not ready');
    }
    return tenant.databaseName;
  }
  private async audit(
    client: any,
    action: string,
    actorUserId: number | null,
    summary: string,
    metadata: unknown,
  ) {
    await client.query(
      `INSERT INTO tenant_audit_log(action, actor_master_user_id, summary, metadata)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [
        action,
        actorUserId,
        summary,
        metadata ? JSON.stringify(metadata) : null,
      ],
    );
  }
}
