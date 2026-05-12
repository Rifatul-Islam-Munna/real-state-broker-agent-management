import { Controller, Get, Post, Delete, Body, Param, UseGuards, Patch } from '@nestjs/common';
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
  async findAll() {
    return this.contactService.findAll();
  }

  @Post('convert-to-lead')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Convert contact request to lead' })
  async convertToLead(@Body() dto: any) {
    return this.contactService.convertToLead(dto.id);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update contact request' })
  async update(@Body() dto: any) {
    // Placeholder
    return dto;
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete contact request' })
  async delete(@Body() dto: any) {
    return this.contactService.delete(dto.id);
  }
}
