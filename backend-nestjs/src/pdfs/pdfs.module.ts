import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '../leads/entities/lead.entity';
import { Property } from '../properties/entities/property.entity';
import { AgencySettings } from '../settings/entities/settings.entity';
import { User } from '../users/entities/user.entity';
import { PdfGeneration } from './entities/pdf-generation.entity';
import { PdfTemplate } from './entities/pdf-template.entity';
import { PdfsController } from './pdfs.controller';
import { PdfsService } from './pdfs.service';

@Module({
  imports: [TypeOrmModule.forFeature([PdfTemplate, PdfGeneration, Property, Lead, User, AgencySettings])],
  controllers: [PdfsController],
  providers: [PdfsService],
  exports: [PdfsService],
})
export class PdfsModule {}
