import { Controller, Get, Post, Delete, Body, Query, UseGuards, Patch } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get documents' })
  async find(
      @Query('page') page: number = 1,
      @Query('pageSize') pageSize: number = 20,
      @Query('search') search?: string,
  ) {
    return this.documentsService.findAll();
  }

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get documents summary' })
  async getSummary() {
    return this.documentsService.getSummary();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a document' })
  async create(@Body() dto: any) {
    return this.documentsService.create(dto);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update document' })
  async update(@Body() dto: any) {
    return this.documentsService.update(dto.id, dto);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a document' })
  async delete(@Query('id') id: number) {
    return this.documentsService.delete(id);
  }
}
