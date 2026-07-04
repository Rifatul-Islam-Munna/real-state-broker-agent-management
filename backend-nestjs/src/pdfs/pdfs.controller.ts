import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PdfsService } from './pdfs.service';

@ApiTags('PDFs')
@Controller('pdfs')
@UseGuards(JwtAuthGuard)
export class PdfsController {
  constructor(private readonly pdfsService: PdfsService) {}

  @Get('variables')
  @ApiOperation({ summary: 'Get available PDF autofill variables' })
  getVariables(@Query('category') category?: string) {
    return this.pdfsService.getVariables(category);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get PDF templates' })
  findTemplates(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.pdfsService.findTemplates(
      Number(page),
      Number(pageSize),
      search,
      category,
      status,
      isActive === undefined ? undefined : isActive === 'true',
    );
  }

  @Get('templates/detail')
  @ApiOperation({ summary: 'Get one PDF template' })
  findTemplate(@Query('id') id: number) {
    return this.pdfsService.findTemplate(Number(id));
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create a PDF template' })
  createTemplate(@Body() dto: Record<string, unknown>) {
    return this.pdfsService.createTemplate(dto);
  }

  @Patch('templates')
  @ApiOperation({ summary: 'Update a PDF template' })
  updateTemplate(@Body() dto: Record<string, unknown>) {
    return this.pdfsService.updateTemplate(Number(dto.id), dto);
  }

  @Delete('templates')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a PDF template' })
  async deleteTemplate(@Query('id') id: number) {
    await this.pdfsService.deleteTemplate(Number(id));
  }

  @Post('templates/import')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload and import an existing fillable PDF template' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        name: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string' },
        status: { type: 'string' },
        fileNamePattern: { type: 'string' },
        tags: { type: 'string', description: 'JSON array or comma-separated tags' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }),
  )
  importPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.pdfsService.importPdf(file, dto);
  }

  @Post('resolve')
  @ApiOperation({ summary: 'Resolve automatic and manual PDF values' })
  resolveTemplate(@Body() dto: any) {
    return this.pdfsService.resolveTemplate(dto);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate and store a completed PDF on the server' })
  generatePdf(@Body() dto: any) {
    return this.pdfsService.generatePdf(dto);
  }

  @Get('generations')
  @ApiOperation({ summary: 'Get generated PDF history' })
  findGenerations(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('templateId') templateId?: number,
    @Query('propertyId') propertyId?: number,
    @Query('leadId') leadId?: number,
    @Query('category') category?: string,
  ) {
    return this.pdfsService.findGenerations(
      Number(page),
      Number(pageSize),
      templateId ? Number(templateId) : undefined,
      propertyId ? Number(propertyId) : undefined,
      leadId ? Number(leadId) : undefined,
      category,
    );
  }

  @Delete('generations')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a generated PDF and its stored file' })
  async deleteGeneration(@Query('id') id: number) {
    await this.pdfsService.deleteGeneration(Number(id));
  }
}
