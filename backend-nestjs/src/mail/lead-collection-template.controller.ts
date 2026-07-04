import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LeadCollectionTemplateService } from './lead-collection-template.service';

@ApiTags('Lead Collection Templates')
@Controller('lead-collection-templates')
@UseGuards(JwtAuthGuard)
export class LeadCollectionTemplateController {
  constructor(
    private readonly leadCollectionTemplates: LeadCollectionTemplateService,
  ) {}

  @Get('fields')
  @ApiOperation({ summary: 'Get Lead entity fields available for email mapping' })
  getLeadFields() {
    return this.leadCollectionTemplates.getLeadFields();
  }

  @Get()
  @ApiOperation({ summary: 'Get lead collection templates' })
  find(
    @Query('id') id?: number,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    if (id) return this.leadCollectionTemplates.findOne(Number(id));
    return this.leadCollectionTemplates.findAll(
      Number(page),
      Number(pageSize),
      search,
      isActive === undefined ? undefined : isActive === 'true',
    );
  }

  @Post('prepare-source')
  @ApiOperation({ summary: 'Prepare inbox, pasted, or uploaded email content for mapping' })
  prepareSource(@Body() dto: Record<string, unknown>) {
    return this.leadCollectionTemplates.prepareSource(dto);
  }

  @Post('test')
  @ApiOperation({ summary: 'Test a draft or saved email parsing template' })
  test(@Body() dto: any) {
    return this.leadCollectionTemplates.test(dto);
  }

  @Post()
  @ApiOperation({ summary: 'Create a lead collection template' })
  create(@Body() dto: any) {
    return this.leadCollectionTemplates.create(dto);
  }

  @Patch()
  @ApiOperation({ summary: 'Update a lead collection template' })
  update(@Body() dto: any) {
    return this.leadCollectionTemplates.update(Number(dto.id), dto);
  }

  @Delete()
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a lead collection template' })
  async delete(@Query('id') id: number) {
    await this.leadCollectionTemplates.delete(Number(id));
  }
}
