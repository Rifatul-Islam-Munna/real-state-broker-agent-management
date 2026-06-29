import { Controller, Get, Post, Patch, Delete, Body, Query, UseGuards, HttpCode, Req } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get leads' })
  async find(
    @Query('id') id?: number,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('search') search?: string,
    @Query('stage') stage?: string,
  ) {
    if (id) return this.leadsService.findOne(id);
    return this.leadsService.findAll(page, pageSize, search, stage);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create lead' })
  async create(@Body() createDto: any, @Req() req: any) {
    return this.leadsService.create(createDto, req.user?.email ?? 'CRM');
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update lead' })
  async update(@Body() updateDto: any, @Req() req: any) {
    return this.leadsService.update(updateDto.id, updateDto, req.user?.email ?? 'CRM');
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete lead' })
  async delete(@Query('id') id: number) {
    await this.leadsService.delete(id);
  }
}
