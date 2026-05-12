import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentRepositoryItem } from './entities/document.entity';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentRepositoryItem])],
  providers: [DocumentsService],
  controllers: [DocumentsController],
})
export class DocumentsModule {}
