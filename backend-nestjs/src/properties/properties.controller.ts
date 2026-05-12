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
  ) {
    if (id) return this.propertiesService.findOne(id);
    if (slug) return this.propertiesService.findBySlug(slug);
    return this.propertiesService.findAll(); // Simplified for now, should include pagination
  }

  @Get('filters')
  @ApiOperation({ summary: 'Fetch public property filter options' })
  async getFilters() {
    return { categories: [], listingTypes: [], locations: [] }; // Simplified
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create property' })
  async create(@Body() createDto: any) {
    return this.propertiesService.create(createDto);
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update property' })
  async update(@Body() updateDto: any) {
    return this.propertiesService.update(updateDto.id, updateDto);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Patch property' })
  async patch(@Body() updateDto: any) {
    return this.propertiesService.update(updateDto.id, updateDto);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete property' })
  async delete(@Query('id') id: number) {
    return this.propertiesService.delete(id);
  }
}
