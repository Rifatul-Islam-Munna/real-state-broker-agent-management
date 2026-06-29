import { Controller, Get, Post, Delete, Body, Query, UseGuards, Patch, HttpCode } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Contact')
@Controller('contact-requests')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @ApiOperation({ summary: 'Create a contact request' })
  async create(@Body() dto: any) {
    return this.contactService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all contact requests' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.contactService.findAll(page, pageSize, search, status);
  }

  @Post('convert-to-lead')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Convert contact request to lead' })
  async convertToLead(@Body() dto: any) {
    return this.contactService.convertToLead(dto.contactRequestId ?? dto.id);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update contact request' })
  async update(@Body() dto: any) {
    return this.contactService.update(dto);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete contact request' })
  async delete(@Query('id') id: number) {
    await this.contactService.delete(id);
  }
}
