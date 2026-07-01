import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentRepositoryItem, documentAccessDb } from './entities/document.entity';
import { paginated, toInt } from '../common/api-contract';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentRepositoryItem)
    private documentRepo: Repository<DocumentRepositoryItem>,
  ) {}

  async findAll(page = 1, pageSize = 20, search?: string, accessLevel?: string, category?: string, isTemplate?: boolean, requiresSignature?: boolean, documentType?: string, propertyId?: number) {
    page = toInt(page, 1);
    pageSize = toInt(pageSize, 20);
    const qb = this.documentRepo.createQueryBuilder('doc');
    if (search) {
      qb.andWhere('(doc.title ILIKE :search OR doc.file_name ILIKE :search OR doc.category ILIKE :search OR doc.folder ILIKE :search OR doc.description ILIKE :search)', { search: `%${search}%` });
    }
    if (accessLevel) qb.andWhere('doc.access_level = :accessLevel', { accessLevel: documentAccessDb(accessLevel) });
    if (category) qb.andWhere('LOWER(doc.category) = :category', { category: category.trim().toLowerCase() });
    if (documentType) qb.andWhere('doc.document_type = :documentType', { documentType: documentType === 'System' ? 0 : documentType === 'Property' ? 1 : 2 });
    if (propertyId) qb.andWhere('doc.property_id = :propertyId', { propertyId });
    if (typeof isTemplate === 'boolean') qb.andWhere('doc.is_template = :isTemplate', { isTemplate });
    if (typeof requiresSignature === 'boolean') qb.andWhere('doc.requires_signature = :requiresSignature', { requiresSignature });
    const [items, total] = await qb.orderBy('doc.updatedAt', 'DESC').skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return paginated(items, total, page, pageSize);
  }

  async update(id: number, dto: any) {
    const doc = await this.documentRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    Object.assign(doc, this.normalize(dto));
    return this.documentRepo.save(doc);
  }

  async create(dto: any) {
    const doc = this.documentRepo.create(this.normalize(dto));
    return this.documentRepo.save(doc);
  }

  async delete(id: number) {
    const doc = await this.documentRepo.findOne({ where: { id } });
    if (doc) await this.documentRepo.remove(doc);
  }

  async getSummary() {
    const rows = await this.documentRepo.find();
    return {
      totalDocuments: rows.length,
      adminOnlyCount: rows.filter((item) => item.accessLevel === 'AdminOnly').length,
      agentAccessCount: rows.filter((item) => item.accessLevel === 'AgentAccess').length,
      publicCount: rows.filter((item) => item.accessLevel === 'Public').length,
      templateCount: rows.filter((item) => item.isTemplate).length,
      signatureRequiredCount: rows.filter((item) => item.requiresSignature).length,
      totalSizeBytes: rows.reduce((sum, item) => sum + Number(item.sizeBytes), 0),
    };
  }

  private normalize(dto: any) {
    const title = `${dto.title ?? ''}`.trim();
    const fileName = `${dto.fileName ?? ''}`.trim();
    const fileUrl = `${dto.fileUrl ?? ''}`.trim();
    const mimeType = `${dto.mimeType ?? ''}`.trim().toLowerCase();
    if (!title) throw new BadRequestException('Title is required.');
    if (!fileName) throw new BadRequestException('Upload a file before saving.');
    if (!fileUrl) throw new BadRequestException('Document file URL is required.');
    if (!mimeType) throw new BadRequestException('Document MIME type is required.');
    if (Number(dto.sizeBytes) <= 0) throw new BadRequestException('Document size must be greater than zero.');
    const documentType = ['System', 'Property', 'Other'].includes(dto.documentType) ? dto.documentType : 'Other';
    return { ...dto, title, fileName, fileUrl, fileObjectName: `${dto.fileObjectName ?? ''}`.trim() || null, mimeType, sizeBytes: Number(dto.sizeBytes), category: `${dto.category ?? ''}`.trim() || 'General', documentType, propertyId: documentType === 'Property' && dto.propertyId ? Number(dto.propertyId) : null, propertyTitle: documentType === 'Property' ? `${dto.propertyTitle ?? ''}`.trim() : '', folder: `${dto.folder ?? ''}`.trim() || 'Repository', description: `${dto.description ?? ''}`.trim(), versionLabel: `${dto.versionLabel ?? ''}`.trim() || 'v1.0', tags: [...new Set((dto.tags ?? []).map((item: any) => `${item ?? ''}`.trim()).filter(Boolean))], accessLevel: dto.accessLevel ?? 'AdminOnly', isTemplate: !!dto.isTemplate, requiresSignature: !!dto.requiresSignature };
  }
}
