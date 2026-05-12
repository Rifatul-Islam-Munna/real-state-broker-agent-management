import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { BlogService } from './blog.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Blog')
@Controller('blogs')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all blogs for admin' })
  async findAllAdmin() {
    return this.blogService.findAllAdmin();
  }

  @Get()
  @ApiOperation({ summary: 'Get published blogs' })
  async findAll() {
    return this.blogService.findAllPublic();
  }

  @Get('details')
  @ApiOperation({ summary: 'Get blog details by ID' })
  async findOne(@Query('id') id: number) {
    return this.blogService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create blog post' })
  async create(@Body() dto: any) {
    return this.blogService.create(dto);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update blog post' })
  async update(@Body() dto: any) {
    return this.blogService.update(dto.id, dto);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete blog post' })
  async delete(@Query('id') id: number) {
    return this.blogService.delete(id);
  }
}
