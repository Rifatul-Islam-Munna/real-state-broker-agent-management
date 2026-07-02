import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  Req,
} from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Properties')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  @ApiOperation({ summary: 'Fetch a property by id, slug, or paginated list' })
  async find(
    @Query('id') id?: number,
    @Query('slug') slug?: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('search') search?: string,
    @Query('propertyType') propertyType?: string,
    @Query('listingType') listingType?: string,
    @Query('status') status?: string,
    @Query('agent') agent?: string,
  ) {
    if (id) return this.propertiesService.findOne(id);
    if (slug) return this.propertiesService.findBySlug(slug);
    return this.propertiesService.findAll(page, pageSize, search, propertyType, listingType, status, agent);
  }

  @Get('filters')
  @ApiOperation({ summary: 'Fetch public property filter options' })
  async getFilters() {
    return this.propertiesService.getFilters();
  }

  @Get('management')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Fetch properties with private owner and document data' })
  async findManaged(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('search') search?: string,
    @Query('propertyType') propertyType?: string,
    @Query('listingType') listingType?: string,
    @Query('status') status?: string,
    @Query('agent') agent?: string,
  ) {
    return this.propertiesService.findAll(page, pageSize, search, propertyType, listingType, status, agent, true);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create property' })
  async create(@Body() createDto: any, @Req() req: any) {
    return this.propertiesService.create(createDto, req.user?.email ?? 'CRM', req.user?.role === 'Admin');
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update property' })
  async update(@Body() updateDto: any, @Req() req: any) {
    return this.propertiesService.update(updateDto.id, updateDto, req.user?.email ?? 'CRM', req.user?.role === 'Admin');
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Patch property' })
  async patch(@Body() updateDto: any, @Req() req: any) {
    return this.propertiesService.update(updateDto.id, updateDto, req.user?.email ?? 'CRM', req.user?.role === 'Admin');
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete property' })
  async delete(@Query('id') id: number) {
    await this.propertiesService.delete(id);
  }
}
