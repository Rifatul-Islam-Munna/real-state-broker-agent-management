import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StickyNote } from './entities/sticky-note.entity';

export type StickyNoteInput = Partial<Pick<StickyNote, 'title' | 'body' | 'x' | 'y' | 'color'>>;

@Injectable()
export class StickyNotesService {
  constructor(
    @InjectRepository(StickyNote)
    private readonly notesRepository: Repository<StickyNote>,
  ) {}

  findAll(userId: number) {
    return this.notesRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  async create(userId: number, input: StickyNoteInput) {
    const note = this.notesRepository.create({
      userId,
      title: input.title?.trim() || 'New note',
      body: input.body ?? '',
      x: Number.isFinite(input.x) ? input.x : 24,
      y: Number.isFinite(input.y) ? input.y : 24,
      color: input.color || 'amber',
    });
    return this.notesRepository.save(note);
  }

  async update(userId: number, id: number, input: StickyNoteInput) {
    const note = await this.notesRepository.findOne({ where: { id, userId } });
    if (!note) throw new NotFoundException('Sticky note not found');

    if (typeof input.title === 'string') note.title = input.title.trim() || 'New note';
    if (typeof input.body === 'string') note.body = input.body;
    if (Number.isFinite(input.x)) note.x = input.x as number;
    if (Number.isFinite(input.y)) note.y = input.y as number;
    if (typeof input.color === 'string' && input.color) note.color = input.color;

    return this.notesRepository.save(note);
  }

  async remove(userId: number, id: number) {
    const result = await this.notesRepository.delete({ id, userId });
    if (!result.affected) throw new NotFoundException('Sticky note not found');
  }
}
