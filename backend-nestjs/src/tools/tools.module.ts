import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StickyNote } from './entities/sticky-note.entity';
import { StickyNotesController } from './sticky-notes.controller';
import { StickyNotesService } from './sticky-notes.service';

@Module({
  imports: [TypeOrmModule.forFeature([StickyNote])],
  controllers: [StickyNotesController],
  providers: [StickyNotesService],
})
export class ToolsModule {}
