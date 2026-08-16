import {
  BadRequestException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { sanitizePlainText } from '../security/input-sanitizer';
import { TenantDatabaseService } from './tenant-database.service';

@Injectable()
export class TenantPublicInquiryService {
  constructor(private readonly databases: TenantDatabaseService) {}

  async createPropertyInquiry(tenant: SaasTenant, dto: any) {
    if (!tenant?.databaseName) throw new NotFoundException('Tenant hostname is required');
    const propertyId = Number(dto?.propertyId);
    if (!Number.isInteger(propertyId) || propertyId <= 0) {
      throw new BadRequestException('A valid property is required.');
    }

    const name = sanitizePlainText(dto?.name, 'Name', 200, { required: true });
    const email = sanitizePlainText(dto?.email, 'Email', 200).toLowerCase();
    const phone = sanitizePlainText(dto?.phone, 'Phone', 80);
    if (!email && !phone) {
      throw new BadRequestException('Email or phone is required.');
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Enter a valid email address.');
    }

    const message = sanitizePlainText(dto?.message, 'Message', 12_000, {
      collapseWhitespace: false,
    });
    const inquiryType = sanitizePlainText(
      dto?.inquiryType || 'Inquire About Listing',
      'Inquiry type',
      120,
    );

    return this.databases.withTenantClient(tenant.databaseName, async (client) => {
      await client.query('BEGIN');
      try {
        const property = await client.query(
          `SELECT id, title, status, payload
           FROM tenant_property
           WHERE id = $1
           FOR SHARE`,
          [propertyId],
        );
        if (!property.rowCount) throw new NotFoundException('Property not found.');
        const row = property.rows[0];
        if (row.status !== 'published') {
          throw new GoneException(
            'This property is inactive and is not accepting new inquiries.',
          );
        }

        const contactSetting = await client.query(
          `SELECT value FROM tenant_setting WHERE key = 'contact_form'`,
        );
        if (contactSetting.rows[0]?.value?.enabled === false) {
          throw new GoneException('This agency is not accepting new inquiries right now.');
        }

        const propertyPayload =
          row.payload && typeof row.payload === 'object' ? row.payload : {};
        const payload = {
          name,
          email,
          phone,
          inquiryType,
          message,
          propertyId: Number(row.id),
          propertyTitle: row.title,
          agentId: Number(propertyPayload.agentId) || null,
          agentName: sanitizePlainText(dto?.agentName, 'Agent name', 200),
          status: 'New',
          leadId: null,
          source: 'Tenant property inquiry',
        };

        const inserted = await client.query(
          `INSERT INTO tenant_legacy_resource(resource, payload)
           VALUES ('contact-requests', $1::jsonb)
           RETURNING id, payload, created_at, updated_at`,
          [JSON.stringify(payload)],
        );
        await client.query('COMMIT');
        const saved = inserted.rows[0];
        return {
          ...saved.payload,
          id: Number(saved.id),
          createdAt: saved.created_at,
          updatedAt: saved.updated_at,
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
  }
}
