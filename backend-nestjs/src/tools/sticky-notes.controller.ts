import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StickyNotesService } from './sticky-notes.service';
import type { StickyNoteInput } from './sticky-notes.service';

@Controller('tools/sticky-notes')
@UseGuards(JwtAuthGuard)
export class StickyNotesController {
  constructor(private readonly stickyNotesService: StickyNotesService) {}

  @Get()
  findAll(@Req() request: { user: { userId: number } }) {
    return this.stickyNotesService.findAll(request.user.userId);
  }

  @Post()
  create(@Req() request: { user: { userId: number } }, @Body() input: StickyNoteInput) {
    return this.stickyNotesService.create(request.user.userId, input);
  }

  @Patch(':id')
  update(
    @Req() request: { user: { userId: number } },
    @Param('id') id: string,
    @Body() input: StickyNoteInput,
  ) {
    return this.stickyNotesService.update(request.user.userId, Number(id), input);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Req() request: { user: { userId: number } }, @Param('id') id: string) {
    await this.stickyNotesService.remove(request.user.userId, Number(id));
  }
}

