import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentRepositoryItem } from './entities/document.entity';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentRepositoryItem)
    private documentRepo: Repository<DocumentRepositoryItem>,
  ) {}

  async findAll() {
    return this.documentRepo.find();
  }

  async update(id: number, dto: any) { const doc = await this.documentRepo.findOne({ where: { id } }); if (!doc) throw new Error("Doc not found"); Object.assign(doc, dto); return this.documentRepo.save(doc); } async create(dto: any) {
    const doc = this.documentRepo.create(dto as object);
    return this.documentRepo.save(doc);
  }

  async delete(id: number) {
    const doc = await this.documentRepo.findOne({ where: { id } });
    if (doc) await this.documentRepo.remove(doc);
  }

  async getSummary() {
    const totalCount = await this.documentRepo.count();
    const templateCount = await this.documentRepo.count({ where: { isTemplate: true } });
    return { totalCount, templateCount };
  }
}
