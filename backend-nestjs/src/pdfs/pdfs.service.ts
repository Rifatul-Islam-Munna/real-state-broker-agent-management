import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Template } from '@pdfme/common';
import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFSignature,
  PDFTextField,
} from 'pdf-lib';
import { DataSource, Repository } from 'typeorm';
import { paginated, toInt } from '../common/api-contract';
import { FileUploadService } from '../file-upload/file-upload.service';
import { Lead } from '../leads/entities/lead.entity';
import { Property } from '../properties/entities/property.entity';
import { RealtorShowing } from '../realtor-showings/entities/realtor-showing.entity';
import { AgencySettings } from '../settings/entities/settings.entity';
import { ShowingFeedback } from '../showing-feedback/entities/showing-feedback.entity';
import { User } from '../users/entities/user.entity';
import { PdfGeneration } from './entities/pdf-generation.entity';
import {
  PdfTemplate,
  PdfTemplateSourceType,
  PdfTemplateStatus,
} from './entities/pdf-template.entity';

type PdfVariableDefinition = {
  key: string;
  label: string;
  group: string;
  dataType: string;
  description: string;
  example: string;
};

type ResolvePdfDto = {
  templateId: number;
  propertyId?: number | null;
  leadId?: number | null;
  agentId?: number | null;
  manualValues?: Record<string, unknown>;
  reportSource?: 'leads' | 'showings' | 'feedback' | '';
  reportFromDate?: string | null;
  reportToDate?: string | null;
};

const SAFE_AGENT_FIELDS = [
  'id',
  'firstName',
  'lastName',
  'email',
  'phone',
  'avatarUrl',
  'role',
  'isActive',
  'isEmailVerified',
  'isPhoneVerified',
  'licenseNumber',
  'agencyName',
  'bio',
  'commissionRate',
  'isVerifiedAgent',
  'address',
  'city',
  'country',
  'createdAt',
  'updatedAt',
  'lastLoginAt',
] as const;

@Injectable()
export class PdfsService {
  constructor(
    @InjectRepository(PdfTemplate)
    private readonly templateRepo: Repository<PdfTemplate>,
    @InjectRepository(PdfGeneration)
    private readonly generationRepo: Repository<PdfGeneration>,
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(RealtorShowing)
    private readonly realtorShowingRepo: Repository<RealtorShowing>,
    @InjectRepository(ShowingFeedback)
    private readonly showingFeedbackRepo: Repository<ShowingFeedback>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AgencySettings)
    private readonly agencySettingsRepo: Repository<AgencySettings>,
    private readonly dataSource: DataSource,
    private readonly fileUploadService: FileUploadService,
  ) {}

  async getVariables(category = 'Universal') {
    const definitions: PdfVariableDefinition[] = [
      this.variable('system.current_date', 'Current date', 'System', 'date'),
      this.variable('system.current_time', 'Current time', 'System', 'text'),
      this.variable('system.current_year', 'Current year', 'System', 'number'),
      this.variable('system.generated_at', 'Generated at', 'System', 'date'),
    ];

    const propertyColumns = this.dataSource
      .getMetadata(Property)
      .columns.map((column) => column.propertyName);
    const leadColumns = this.dataSource
      .getMetadata(Lead)
      .columns.map((column) => column.propertyName);

    for (const field of propertyColumns) {
      definitions.push(
        this.variable(`property.${field}`, this.humanize(field), 'Property'),
        this.variable(`record.${field}`, this.humanize(field), 'Primary record'),
      );
    }

    definitions.push(
      this.variable('property.neighborhoodInsights', 'Neighborhood insights', 'Property', 'list'),
      this.variable('property.preQuestions', 'Pre questions', 'Property', 'list'),
      this.variable('property.agentName', 'Assigned agent name', 'Property'),
      this.variable('property.imageUrl', 'Primary image URL', 'Property', 'image'),
      this.variable('property.firstImageUrl', 'First gallery image URL', 'Property', 'image'),
      this.variable('owner.name', 'Owner name', 'Owner'),
      this.variable('owner.email', 'Owner email', 'Owner'),
      this.variable('owner.phone', 'Owner phone', 'Owner'),
      this.variable('owner.extraInfo', 'Owner extra information', 'Owner'),
    );

    for (const field of leadColumns) {
      definitions.push(
        this.variable(`lead.${field}`, this.humanize(field), 'Lead'),
        this.variable(`tenant.${field}`, this.humanize(field), 'Tenant / applicant'),
        this.variable(`contact.${field}`, this.humanize(field), 'Related contact'),
      );
    }

    definitions.push(
      this.variable('lead.assignedAgentName', 'Assigned agent name', 'Lead'),
      this.variable('lead.linkedPropertyTitle', 'Linked property title', 'Lead'),
      this.variable('lead.linkedDeals', 'Linked deals', 'Lead', 'list'),
      this.variable('tenant.assignedAgentName', 'Assigned agent name', 'Tenant / applicant'),
      this.variable('tenant.linkedPropertyTitle', 'Linked property title', 'Tenant / applicant'),
      this.variable('contact.assignedAgentName', 'Assigned agent name', 'Related contact'),
      this.variable('contact.linkedPropertyTitle', 'Linked property title', 'Related contact'),
    );

    for (const field of SAFE_AGENT_FIELDS) {
      definitions.push(
        this.variable(`agent.${field}`, this.humanize(field), 'Agent'),
      );
    }
    definitions.push(
      this.variable('agent.fullName', 'Full name', 'Agent'),
      this.variable('agency.name', 'Agency name', 'Agency'),
      this.variable('agency.contactEmail', 'Agency contact email', 'Agency'),
      this.variable('agency.contactPhone', 'Agency contact phone', 'Agency'),
      this.variable('report.fromDate', 'Report from date', 'Report', 'date'),
      this.variable('report.toDate', 'Report to date', 'Report', 'date'),
      this.variable('report.source', 'Report source', 'Report'),
      this.variable('report.count', 'Report row count', 'Report', 'number'),
      this.variable('report.leads.table', 'Lead report table', 'Report', 'table'),
      this.variable('report.showings.table', 'Showing report table', 'Report', 'table'),
      this.variable('report.feedback.table', 'Feedback report table', 'Report', 'table'),
    );

    const settings = await this.readAgencySettings();
    for (const key of Object.keys(this.flattenObject(settings))) {
      definitions.push(
        this.variable(`agency.${key}`, this.humanize(key), 'Agency'),
      );
    }

    const unique = [...new Map(definitions.map((item) => [item.key, item])).values()];
    const filtered = this.filterVariablesByCategory(unique, category);
    const groups = [...new Set(filtered.map((item) => item.group))].map((group) => ({
      group,
      variables: filtered.filter((item) => item.group === group),
    }));

    return {
      category,
      total: filtered.length,
      groups,
      variables: filtered,
    };
  }

  async findTemplates(
    page = 1,
    pageSize = 20,
    search?: string,
    category?: string,
    status?: string,
    isActive?: boolean,
  ) {
    page = toInt(page, 1);
    pageSize = Math.min(toInt(pageSize, 20), 200);
    const qb = this.templateRepo.createQueryBuilder('template');
    if (search) {
      qb.andWhere(
        '(template.name ILIKE :search OR template.description ILIKE :search OR template.category ILIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }
    if (category) {
      qb.andWhere('LOWER(template.category) = :category', {
        category: category.trim().toLowerCase(),
      });
    }
    if (status) qb.andWhere('template.status = :status', { status });
    if (typeof isActive === 'boolean') {
      qb.andWhere('template.is_active = :isActive', { isActive });
    }
    const [items, total] = await qb
      .orderBy('template.updatedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return paginated(items, total, page, pageSize);
  }

  async findTemplate(id: number) {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException('PDF template not found.');
    return template;
  }

  async createTemplate(dto: Record<string, unknown>) {
    const normalized = this.normalizeTemplate(dto);
    return this.templateRepo.save(this.templateRepo.create(normalized));
  }

  async updateTemplate(id: number, dto: Record<string, unknown>) {
    const template = await this.findTemplate(id);
    const normalized = this.normalizeTemplate({ ...template, ...dto });
    Object.assign(template, normalized);
    return this.templateRepo.save(template);
  }

  async deleteTemplate(id: number) {
    const template = await this.findTemplate(id);
    if (template.sourceFileObjectName) {
      await this.fileUploadService
        .deleteFile(template.sourceFileObjectName)
        .catch(() => undefined);
    }
    await this.templateRepo.remove(template);
  }

  async importPdf(file: Express.Multer.File, dto: Record<string, unknown>) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Choose a PDF file to import.');
    }
    if (file.mimetype !== 'application/pdf' && !file.originalname.toLowerCase().endsWith('.pdf')) {
      throw new BadRequestException('Only PDF files can be imported.');
    }
    if (file.size > 20 * 1024 * 1024) {
      throw new BadRequestException('PDF files must be 20 MB or smaller.');
    }

    let pdfDocument: PDFDocument;
    try {
      pdfDocument = await PDFDocument.load(file.buffer, { ignoreEncryption: false });
    } catch {
      throw new BadRequestException('The PDF is encrypted, damaged, or unsupported.');
    }

    const pages = pdfDocument.getPages();
    const schemas: Array<Array<Record<string, unknown>>> = pages.map(() => []);
    const importedFields: PdfTemplate['importedFields'] = [];
    const form = pdfDocument.getForm();
    const pageIndexes = new Map(
      pages.map((page, index) => [page.ref.toString(), index]),
    );

    for (const field of form.getFields()) {
      const fieldName = field.getName();
      const fieldType = this.pdfFieldType(field);
      const options = this.pdfFieldOptions(field);
      const widgets = (field as any).acroField?.getWidgets?.() ?? [];
      const widget = widgets[0];
      const pageRef = widget?.P?.();
      const pageIndex = pageIndexes.get(pageRef?.toString?.()) ?? 0;
      const page = pages[pageIndex] ?? pages[0];
      const rectangle = widget?.getRectangle?.() ?? {
        x: 36,
        y: Math.max(36, page.getHeight() - 72),
        width: 144,
        height: 18,
      };
      const factor = 25.4 / 72;
      const position = {
        x: this.round(rectangle.x * factor),
        y: this.round(
          (page.getHeight() - rectangle.y - rectangle.height) * factor,
        ),
        width: Math.max(2, this.round(rectangle.width * factor)),
        height: Math.max(2, this.round(rectangle.height * factor)),
      };
      const schema = this.importedFieldSchema(
        fieldName,
        fieldType,
        position,
        options,
      );
      schemas[pageIndex].push(schema);
      importedFields.push({
        name: fieldName,
        type: fieldType,
        pageIndex,
        position,
        options,
      });
    }

    if (form.getFields().length > 0) {
      try {
        form.flatten();
      } catch {
        // Imported overlays remain usable when a source form cannot be flattened.
      }
    }
    const flattenedBytes = await pdfDocument.save({ useObjectStreams: false });
    const basePdf = `data:application/pdf;base64,${Buffer.from(flattenedBytes).toString('base64')}`;
    const upload = await this.fileUploadService.uploadFile(
      file,
      'pdfs/templates/source',
    );

    const name = `${dto.name ?? file.originalname.replace(/\.pdf$/i, '')}`.trim();
    const templateJson: Template = {
      basePdf,
      schemas,
      pdfmeVersion: '6.0.0',
    } as Template;

    const template = this.templateRepo.create(
      this.normalizeTemplate({
        ...dto,
        name,
        sourceType: PdfTemplateSourceType.UploadedPdf,
        templateJson,
        sourceFileName: file.originalname,
        sourceFileUrl: upload.url,
        sourceFileObjectName: upload.objectName,
        sourceMimeType: upload.mimeType,
        sourceSizeBytes: upload.sizeBytes,
        importedFields,
      }),
    );
    return this.templateRepo.save(template);
  }

  async resolveTemplate(dto: ResolvePdfDto) {
    const template = await this.findTemplate(Number(dto.templateId));
    const property = dto.propertyId
      ? await this.propertyRepo.findOne({
          where: { id: Number(dto.propertyId) },
          relations: ['agent', 'neighborhoodInsights', 'preQuestions'],
        })
      : null;
    if (dto.propertyId && !property) {
      throw new NotFoundException('Property not found.');
    }

    const lead = dto.leadId
      ? await this.leadRepo.findOne({
          where: { id: Number(dto.leadId) },
          relations: ['assignedAgent', 'linkedProperty', 'deals'],
        })
      : null;
    if (dto.leadId && !lead) throw new NotFoundException('Lead not found.');

    const resolvedAgentId = Number(
      dto.agentId || property?.agentId || lead?.agentId || 0,
    );
    const agent = resolvedAgentId
      ? await this.userRepo.findOne({ where: { id: resolvedAgentId } })
      : null;
    if (dto.agentId && !agent) throw new NotFoundException('Agent not found.');

    const automaticValues = await this.buildResolvedValues(property, lead, agent);
    const reportValues = await this.buildReportValues(dto);
    const manualValues = Object.fromEntries(
      Object.entries(dto.manualValues ?? {}).map(([key, value]) => [
        key,
        value,
      ]),
    );
    const values = { ...automaticValues, ...reportValues, ...manualValues };
    const variablesUsed = this.extractTemplateVariables(template.templateJson);
    const requiredVariables = [...new Set(template.requiredVariables ?? [])];
    const missingVariables = requiredVariables
      .filter((key) => !`${values[key] ?? ''}`.trim())
      .map((key) => ({ key, ...(this.variableMetadata(key) ?? {}) }));
    const resolvedTemplateJson = this.materializeTemplate(template.templateJson, values);
    const inputs = [this.buildPdfmeInput(resolvedTemplateJson, values)];
    const fileName = this.resolveFileName(
      template.fileNamePattern,
      values,
      template.name,
    );

    const resolvedTemplate = {
      ...template,
      templateJson: resolvedTemplateJson,
    };

    return {
      template: resolvedTemplate,
      inputs,
      automaticValues,
      manualValues,
      resolvedValues: values,
      variablesUsed,
      requiredVariables,
      missingVariables,
      fileName,
      context: {
        propertyId: property?.id ?? null,
        propertyTitle: property?.title ?? '',
        leadId: lead?.id ?? null,
        leadName: lead?.name ?? '',
        agentId: agent?.id ?? null,
        agentName: agent ? `${agent.firstName} ${agent.lastName}`.trim() : '',
      },
    };
  }

  async generatePdf(dto: ResolvePdfDto & { generatedBy?: string; allowMissing?: boolean }) {
    const resolved = await this.resolveTemplate(dto);
    if (resolved.missingVariables.length > 0 && !dto.allowMissing) {
      throw new BadRequestException({
        message: 'Complete the required information before generating the PDF.',
        missingVariables: resolved.missingVariables,
      });
    }

    const buffer = await this.renderPdfBuffer(resolved);
    const uploadFile = {
      fieldname: 'file',
      originalname: resolved.fileName,
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: buffer.length,
      buffer,
      stream: undefined,
      destination: '',
      filename: resolved.fileName,
      path: '',
    } as unknown as Express.Multer.File;
    const upload = await this.fileUploadService.uploadFile(
      uploadFile,
      'pdfs/generated',
    );

    const generation = this.generationRepo.create({
      templateId: resolved.template.id,
      templateName: resolved.template.name,
      category: resolved.template.category,
      propertyId: resolved.context.propertyId,
      propertyTitle: resolved.context.propertyTitle,
      leadId: resolved.context.leadId,
      leadName: resolved.context.leadName,
      agentId: resolved.context.agentId,
      agentName: resolved.context.agentName,
      fileName: resolved.fileName,
      fileUrl: upload.url,
      fileObjectName: upload.objectName,
      mimeType: upload.mimeType,
      sizeBytes: upload.sizeBytes,
      manualFieldCount: Object.keys(resolved.manualValues).length,
      missingFieldCount: resolved.missingVariables.length,
      variablesUsed: resolved.variablesUsed,
      context: resolved.context,
      generatedBy: `${dto.generatedBy ?? ''}`.trim(),
    });
    const saved = await this.generationRepo.save(generation);
    return {
      generation: saved,
      downloadUrl: saved.fileUrl,
      fileName: saved.fileName,
      missingVariables: resolved.missingVariables,
    };
  }

  async previewPdf(dto: ResolvePdfDto & { allowMissing?: boolean }) {
    const resolved = await this.resolveTemplate(dto);
    if (resolved.missingVariables.length > 0 && !dto.allowMissing) {
      throw new BadRequestException({
        message: 'Complete the required information before previewing the PDF.',
        missingVariables: resolved.missingVariables,
      });
    }
    return {
      buffer: await this.renderPdfBuffer(resolved),
      fileName: resolved.fileName,
      missingVariables: resolved.missingVariables,
    };
  }

  async findGenerations(
    page = 1,
    pageSize = 20,
    templateId?: number,
    propertyId?: number,
    leadId?: number,
    category?: string,
  ) {
    page = toInt(page, 1);
    pageSize = Math.min(toInt(pageSize, 20), 200);
    const qb = this.generationRepo.createQueryBuilder('generation');
    if (templateId) {
      qb.andWhere('generation.template_id = :templateId', { templateId });
    }
    if (propertyId) {
      qb.andWhere('generation.property_id = :propertyId', { propertyId });
    }
    if (leadId) qb.andWhere('generation.lead_id = :leadId', { leadId });
    if (category) {
      qb.andWhere('LOWER(generation.category) = :category', {
        category: category.trim().toLowerCase(),
      });
    }
    const [items, total] = await qb
      .orderBy('generation.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return paginated(items, total, page, pageSize);
  }

  async deleteGeneration(id: number) {
    const generation = await this.generationRepo.findOne({ where: { id } });
    if (!generation) throw new NotFoundException('Generated PDF not found.');
    if (generation.fileObjectName) {
      await this.fileUploadService
        .deleteFile(generation.fileObjectName)
        .catch(() => undefined);
    }
    await this.generationRepo.remove(generation);
  }

  private normalizeTemplate(dto: Record<string, unknown>) {
    const name = `${dto.name ?? ''}`.trim();
    if (!name) throw new BadRequestException('Template name is required.');
    const templateJson = dto.templateJson as Record<string, unknown>;
    if (!templateJson || !Array.isArray(templateJson.schemas) || !templateJson.basePdf) {
      throw new BadRequestException('A valid pdfme template is required.');
    }
    const status = Object.values(PdfTemplateStatus).includes(dto.status as PdfTemplateStatus)
      ? (dto.status as PdfTemplateStatus)
      : PdfTemplateStatus.Draft;
    const sourceType = Object.values(PdfTemplateSourceType).includes(
      dto.sourceType as PdfTemplateSourceType,
    )
      ? (dto.sourceType as PdfTemplateSourceType)
      : PdfTemplateSourceType.Blank;
    return {
      name,
      description: `${dto.description ?? ''}`.trim(),
      category: `${dto.category ?? 'Universal'}`.trim() || 'Universal',
      status,
      sourceType,
      templateJson,
      requiredVariables: this.stringArray(dto.requiredVariables),
      tags: this.stringArray(dto.tags),
      fileNamePattern:
        `${dto.fileNamePattern ?? ''}`.trim() || 'document-{{property.slug}}',
      sourceFileName: `${dto.sourceFileName ?? ''}`.trim(),
      sourceFileUrl: `${dto.sourceFileUrl ?? ''}`.trim(),
      sourceFileObjectName:
        `${dto.sourceFileObjectName ?? ''}`.trim() || null,
      sourceMimeType: `${dto.sourceMimeType ?? ''}`.trim(),
      sourceSizeBytes: Number(dto.sourceSizeBytes ?? 0),
      importedFields: Array.isArray(dto.importedFields) ? dto.importedFields : [],
      schemaVersion: Math.max(1, Number(dto.schemaVersion ?? 1)),
      isActive: dto.isActive === undefined ? true : Boolean(dto.isActive),
    };
  }

  private async buildResolvedValues(
    property: Property | null,
    lead: Lead | null,
    agent: User | null,
  ) {
    const now = new Date();
    const system = {
      current_date: new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(now),
      current_time: new Intl.DateTimeFormat('en', { timeStyle: 'short' }).format(now),
      current_year: now.getFullYear(),
      generated_at: now.toISOString(),
    };
    const propertyData = property
      ? {
          ...property,
          imageUrl: property.thumbnailUrl ?? property.imageUrls?.[0] ?? '',
          firstImageUrl: property.imageUrls?.[0] ?? property.thumbnailUrl ?? '',
          agentName: property.agent
            ? `${property.agent.firstName} ${property.agent.lastName}`.trim()
            : '',
        }
      : {};
    const leadData = lead
      ? {
          ...lead,
          assignedAgentName: lead.assignedAgent
            ? `${lead.assignedAgent.firstName} ${lead.assignedAgent.lastName}`.trim()
            : '',
          linkedPropertyTitle: lead.linkedProperty?.title ?? '',
          linkedDeals: lead.deals ?? [],
        }
      : {};
    const agentData = agent
      ? Object.fromEntries([
          ...SAFE_AGENT_FIELDS.map((field) => [field, (agent as any)[field]]),
          ['fullName', `${agent.firstName} ${agent.lastName}`.trim()],
        ])
      : {};
    const settings = await this.readAgencySettings();
    const agency = {
      ...settings,
      name: settings.agencyName ?? settings.name ?? agent?.agencyName ?? '',
      contactEmail: settings.contactEmail ?? settings.email ?? agent?.email ?? '',
      contactPhone: settings.contactPhone ?? settings.phone ?? agent?.phone ?? '',
    };

    return {
      ...this.flattenObject(system, 'system'),
      ...this.flattenObject(propertyData, 'property'),
      ...this.flattenObject(propertyData, 'record'),
      ...this.flattenObject(leadData, 'lead'),
      ...this.flattenObject(leadData, 'tenant'),
      ...this.flattenObject(leadData, 'contact'),
      ...this.flattenObject(agentData, 'agent'),
      ...this.flattenObject(agency, 'agency'),
      'owner.name': property?.ownerName ?? '',
      'owner.email': property?.ownerEmail ?? '',
      'owner.phone': property?.ownerPhone ?? '',
      'owner.extraInfo': property?.ownerExtraInfo ?? '',
    };
  }

  private async buildReportValues(dto: ResolvePdfDto) {
    const source = `${dto.reportSource ?? ''}`.trim();
    const fromDate = this.startOfDay(dto.reportFromDate);
    const toDate = this.endOfDay(dto.reportToDate);
    const range = { fromDate, toDate };
    const propertyId = dto.propertyId ? Number(dto.propertyId) : null;

    if (source === 'leads') {
      const rows = await this.reportLeads(range, propertyId);
      return this.reportValueMap(source, dto, rows, rows, [], []);
    }
    if (source === 'showings') {
      const rows = await this.reportShowings(range, propertyId);
      return this.reportValueMap(source, dto, rows, [], rows, []);
    }
    if (source === 'feedback') {
      const rows = await this.reportFeedback(range, propertyId);
      return this.reportValueMap(source, dto, rows, [], [], rows);
    }
    return this.reportValueMap(source, dto, [], [], [], []);
  }

  private reportValueMap(
    source: string,
    dto: ResolvePdfDto,
    rows: unknown[],
    leads: unknown[],
    showings: unknown[],
    feedback: unknown[],
  ) {
    return {
      'report.source': source,
      'report.fromDate': `${dto.reportFromDate ?? ''}`,
      'report.toDate': `${dto.reportToDate ?? ''}`,
      'report.count': String(Math.max(0, rows.length - 1)),
      'report.leads.table': leads,
      'report.showings.table': showings,
      'report.feedback.table': feedback,
    };
  }

  private async reportLeads(range: { fromDate: Date | null; toDate: Date | null }, propertyId: number | null) {
    const qb = this.leadRepo.createQueryBuilder('lead')
      .leftJoinAndSelect('lead.linkedProperty', 'property')
      .orderBy('lead.createdAt', 'DESC')
      .take(500);
    this.applyDateRange(qb, 'lead.created_at', range);
    if (propertyId) qb.andWhere('lead.property_id = :propertyId', { propertyId });
    const rows = await qb.getMany();
    return [
      ['Date', 'Lead', 'Phone', 'Email', 'Property', 'Stage', 'Source'],
      ...rows.map((lead) => [
        this.dateOnly(lead.createdAt),
        lead.name,
        lead.phone,
        lead.email,
        lead.linkedProperty?.title || lead.property,
        lead.stage,
        lead.source,
      ]),
    ];
  }

  private async reportShowings(range: { fromDate: Date | null; toDate: Date | null }, propertyId: number | null) {
    const qb = this.realtorShowingRepo.createQueryBuilder('showing')
      .leftJoinAndSelect('showing.property', 'property')
      .orderBy('showing.showingAt', 'DESC', 'NULLS LAST')
      .addOrderBy('showing.createdAt', 'DESC')
      .take(500);
    this.applyDateRange(qb, 'COALESCE(showing.showing_at, showing.created_at)', range);
    if (propertyId) qb.andWhere('showing.property_id = :propertyId', { propertyId });
    const rows = await qb.getMany();
    return [
      ['Showing date', 'Realtor', 'Phone', 'Email', 'Property', 'Match'],
      ...rows.map((showing) => [
        this.dateOnly(showing.showingAt ?? showing.createdAt),
        showing.realtorName,
        showing.realtorPhone,
        showing.realtorEmail,
        showing.property?.title || showing.propertyText,
        showing.propertyMatchMethod,
      ]),
    ];
  }

  private async reportFeedback(range: { fromDate: Date | null; toDate: Date | null }, propertyId: number | null) {
    const qb = this.showingFeedbackRepo.createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.property', 'property')
      .orderBy('feedback.receivedAt', 'DESC')
      .take(500);
    this.applyDateRange(qb, 'feedback.received_at', range);
    if (propertyId) qb.andWhere('feedback.property_id = :propertyId', { propertyId });
    const rows = await qb.getMany();
    return [
      ['Received', 'Property', 'Realtor', 'Sentiment', 'Feedback'],
      ...rows.map((feedback) => [
        this.dateOnly(feedback.receivedAt),
        feedback.property?.title ?? '',
        feedback.realtorName || feedback.realtorContact,
        feedback.sentiment,
        feedback.feedbackText,
      ]),
    ];
  }

  private applyDateRange(qb: any, field: string, range: { fromDate: Date | null; toDate: Date | null }) {
    if (range.fromDate) qb.andWhere(`${field} >= :fromDate`, { fromDate: range.fromDate });
    if (range.toDate) qb.andWhere(`${field} <= :toDate`, { toDate: range.toDate });
  }

  private startOfDay(value?: string | null) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private endOfDay(value?: string | null) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(23, 59, 59, 999);
    return date;
  }

  private dateOnly(value?: Date | null) {
    if (!value) return '';
    return value.toISOString().slice(0, 10);
  }

  private flattenObject(
    source: Record<string, unknown>,
    prefix = '',
    result: Record<string, any> = {},
  ) {
    for (const [key, rawValue] of Object.entries(source ?? {})) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (rawValue instanceof Date) {
        result[path] = rawValue.toISOString();
      } else if (Array.isArray(rawValue)) {
        result[path] = rawValue.every(
          (item) => item === null || ['string', 'number', 'boolean'].includes(typeof item),
        )
          ? rawValue.map((item) => this.stringifyValue(item)).join(', ')
          : JSON.stringify(rawValue);
      } else if (rawValue && typeof rawValue === 'object') {
        const plain = rawValue as Record<string, unknown>;
        if (Object.keys(plain).length <= 30) {
          this.flattenObject(plain, path, result);
        }
        result[path] = JSON.stringify(rawValue);
      } else {
        result[path] = this.stringifyValue(rawValue);
      }
    }
    return result;
  }

  private extractTemplateVariables(templateJson: Record<string, unknown>) {
    const schemas = Array.isArray(templateJson?.schemas)
      ? (templateJson.schemas as Array<Array<Record<string, unknown>>>)
      : [];
    return [
      ...new Set(
        schemas.flatMap((schemaPage) =>
          schemaPage.flatMap((schema) => [
            `${schema?.name ?? ''}`.trim(),
            ...this.extractMustacheVariables(schema),
          ]),
        ).filter(Boolean),
      ),
    ];
  }

  private buildPdfmeInput(
    templateJson: Record<string, unknown>,
    values: Record<string, any>,
  ) {
    const schemas = Array.isArray(templateJson?.schemas)
      ? (templateJson.schemas as Array<Array<Record<string, unknown>>>)
      : [];
    const input: Record<string, any> = {};

    for (const schema of schemas.flat()) {
      const name = `${schema?.name ?? ''}`.trim();
      if (!name) continue;

      const lookupKey = this.exactMustacheKey(name) ?? name;
      const rawValue = values[lookupKey];
      const resolvedValue = this.inputValue(rawValue);
      if (this.hasInputValue(resolvedValue)) {
        input[name] = resolvedValue;
        continue;
      }

      const reportTableValue = this.reportTableInputValue(schema, values, lookupKey);
      if (this.hasInputValue(reportTableValue)) {
        input[name] = reportTableValue;
        continue;
      }

      const content = this.schemaContent(schema);
      if (content.trim()) {
        input[name] = content;
      }
    }

    for (const key of this.extractTemplateVariables(templateJson)) {
      if (input[key] !== undefined) continue;
      const resolvedValue = this.inputValue(values[key]);
      if (this.hasInputValue(resolvedValue)) input[key] = resolvedValue;
    }

    return input;
  }

  private exactMustacheKey(value: string) {
    const match = value.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
    return match?.[1]?.trim() || null;
  }

  private reportTableInputValue(
    schema: Record<string, unknown>,
    values: Record<string, any>,
    lookupKey: string,
  ) {
    if (`${schema?.type ?? ''}` !== 'table') return undefined;
    if (/^report\.(leads|showings|feedback)\.table$/.test(lookupKey)) return undefined;
    const source = `${values['report.source'] ?? ''}`.trim();
    if (!['leads', 'showings', 'feedback'].includes(source)) return undefined;
    return values[`report.${source}.table`];
  }

  private inputValue(value: unknown) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return JSON.stringify(value);
    return this.stringifyValue(value);
  }

  private hasInputValue(value: unknown) {
    if (Array.isArray(value)) return value.length > 0;
    return `${value ?? ''}`.trim().length > 0;
  }

  private schemaContent(schema: Record<string, unknown>) {
    const content = schema.content;
    if (content === null || content === undefined) return '';
    if (Array.isArray(content) || typeof content === 'object') {
      return JSON.stringify(content);
    }
    return String(content);
  }

  private async renderPdfBuffer(resolved: Awaited<ReturnType<PdfsService['resolveTemplate']>>) {
    const generator = await import('@pdfme/generator');
    const schemaPlugins = await import('@pdfme/schemas');
    const plugins = {
      text: schemaPlugins.text,
      multiVariableText: schemaPlugins.multiVariableText,
      image: schemaPlugins.image,
      signature: schemaPlugins.signature,
      svg: schemaPlugins.svg,
      table: schemaPlugins.table,
      line: schemaPlugins.line,
      rectangle: schemaPlugins.rectangle,
      ellipse: schemaPlugins.ellipse,
      dateTime: schemaPlugins.dateTime,
      date: schemaPlugins.date,
      time: schemaPlugins.time,
      select: schemaPlugins.select,
      radioGroup: schemaPlugins.radioGroup,
      checkbox: schemaPlugins.checkbox,
      qrcode: schemaPlugins.barcodes.qrcode,
    };
    const bytes = await generator.generate({
      template: resolved.template.templateJson as Template,
      inputs: resolved.inputs,
      plugins,
      options: {
        title: resolved.template.name,
        subject: resolved.template.description,
        creator: 'Real Estate Broker Agent Management',
        producer: 'pdfme',
      },
    });
    return Buffer.from(bytes);
  }

  private extractMustacheVariables(value: unknown): string[] {
    if (typeof value === 'string') {
      return [...value.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)]
        .map((match) => `${match[1] ?? ''}`.trim())
        .filter(Boolean);
    }
    if (Array.isArray(value)) {
      return value.flatMap((item) => this.extractMustacheVariables(item));
    }
    if (value && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== 'name')
        .flatMap(([, item]) => this.extractMustacheVariables(item));
    }
    return [];
  }

  private materializeTemplate<T>(value: T, values: Record<string, any>, keyName = ''): T {
    if (typeof value === 'string') {
      if (keyName === 'name') return value as T;
      return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, key: string) => {
        return this.stringifyValue(values[key.trim()]);
      }) as T;
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.materializeTemplate(item, values)) as T;
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [
          key,
          this.materializeTemplate(item, values, key),
        ]),
      ) as T;
    }
    return value;
  }

  private importedFieldSchema(
    name: string,
    type: string,
    position: { x: number; y: number; width: number; height: number },
    options: string[],
  ) {
    if (type === 'checkbox') {
      return {
        name,
        type: 'checkbox',
        content: 'false',
        position: { x: position.x, y: position.y },
        width: position.width,
        height: position.height,
        color: '#000000',
      };
    }
    if (type === 'signature') {
      return {
        name,
        type: 'signature',
        content: '',
        position: { x: position.x, y: position.y },
        width: position.width,
        height: position.height,
      };
    }
    const textSchema = {
      name,
      type: type === 'select' || type === 'radio' ? 'select' : 'text',
      content: options[0] ?? '',
      position: { x: position.x, y: position.y },
      width: position.width,
      height: position.height,
      fontSize: Math.max(6, Math.min(14, position.height * 1.6)),
      fontColor: '#000000',
      alignment: 'left',
      verticalAlignment: 'middle',
      lineHeight: 1,
      characterSpacing: 0,
      backgroundColor: '',
      borderColor: '',
      borderWidth: 0,
      readOnly: false,
      required: false,
    } as Record<string, unknown>;
    if (type === 'select' || type === 'radio') textSchema.options = options;
    return textSchema;
  }

  private pdfFieldType(field: unknown) {
    if (field instanceof PDFCheckBox) return 'checkbox';
    if (field instanceof PDFDropdown || field instanceof PDFOptionList) return 'select';
    if (field instanceof PDFRadioGroup) return 'radio';
    if (field instanceof PDFSignature) return 'signature';
    if (field instanceof PDFTextField) return 'text';
    return 'text';
  }

  private pdfFieldOptions(field: any): string[] {
    try {
      if (typeof field?.getOptions === 'function') {
        return this.stringArray(field.getOptions());
      }
    } catch {
      return [];
    }
    return [];
  }

  private filterVariablesByCategory(
    variables: PdfVariableDefinition[],
    category: string,
  ) {
    const normalized = `${category ?? ''}`.trim().toLowerCase();
    if (!normalized || normalized === 'universal' || normalized === 'custom') {
      return variables;
    }
    const always = new Set(['System', 'Agency', 'Agent']);
    if (
      normalized.includes('property') ||
      normalized.includes('inspection') ||
      normalized.includes('disclosure')
    ) {
      return variables.filter((item) =>
        new Set([...always, 'Property', 'Primary record', 'Owner']).has(item.group),
      );
    }
    return variables;
  }

  private async readAgencySettings(): Promise<Record<string, any>> {
    const row = await this.agencySettingsRepo.findOne({ where: { id: 1 } });
    if (!row?.contentJson) return {};
    try {
      const parsed = JSON.parse(row.contentJson);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private variable(
    key: string,
    label: string,
    group: string,
    dataType = 'text',
  ): PdfVariableDefinition {
    return {
      key,
      label,
      group,
      dataType,
      description: `${label} from the selected ${group.toLowerCase()} context.`,
      example: '',
    };
  }

  private variableMetadata(key: string) {
    const group = key.split('.')[0] || 'Variable';
    return {
      label: this.humanize(key.split('.').slice(1).join('.')),
      group: this.humanize(group),
    };
  }

  private humanize(value: string) {
    return `${value ?? ''}`
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase())
      .trim();
  }

  private resolveFileName(
    pattern: string,
    values: Record<string, any>,
    fallback: string,
  ) {
    const replaced = `${pattern || fallback}`.replace(
      /\{\{\s*([^}]+?)\s*\}\}/g,
      (_match, key: string) => this.stringifyValue(values[key]),
    );
    const safe = replaced
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '') || 'document';
    return safe.toLowerCase().endsWith('.pdf') ? safe : `${safe}.pdf`;
  }

  private stringifyValue(value: unknown) {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private stringArray(value: unknown) {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) value = parsed;
        else value = String(value).split(',');
      } catch {
        value = String(value).split(',');
      }
    }
    return [
      ...new Set(
        (Array.isArray(value) ? value : [])
          .map((item) => `${item ?? ''}`.trim())
          .filter(Boolean),
      ),
    ];
  }

  private round(value: number) {
    return Math.round(value * 100) / 100;
  }
}
