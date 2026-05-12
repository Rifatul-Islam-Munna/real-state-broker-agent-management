import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DealsService } from './deals.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Deals')
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all deals' })
  async findAll() {
    return this.dealsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get deal by ID' })
  async findOne(@Param('id') id: number) {
    return this.dealsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create deal' })
  async create(@Body() createDto: any) {
    return this.dealsService.create(createDto);
  }

  @Post('convert-from-lead')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Convert lead to deal' })
  async convertFromLead(@Body() dto: any) {
    return this.dealsService.convertFromLead(dto);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update deal' })
  async update(@Body() updateDto: any) {
    return this.dealsService.update(updateDto.id, updateDto);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete deal' })
  async delete(@Query('id') id: number) {
    return this.dealsService.delete(id);
  }
}
