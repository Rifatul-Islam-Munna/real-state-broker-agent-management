import { Controller, Get, Post, Patch, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { DealsService } from './deals.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Deals')
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get deals' })
  async find(
    @Query('id') id?: number,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('search') search?: string,
    @Query('stage') stage?: string,
  ) {
    if (id) return this.dealsService.findOne(id);
    return this.dealsService.findAll(); // Should add pagination
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
