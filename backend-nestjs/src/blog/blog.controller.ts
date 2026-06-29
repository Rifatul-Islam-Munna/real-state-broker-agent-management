import { BadRequestException, Controller, Get, Post, Patch, Delete, Body, Query, UseGuards, HttpCode } from '@nestjs/common';
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
  async findAllAdmin(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 12,
    @Query('search') search?: string,
    @Query('isPublished') isPublished?: string,
  ) {
    return this.blogService.findAllAdmin(page, pageSize, search, isPublished === undefined ? undefined : isPublished === 'true');
  }

  @Get()
  @ApiOperation({ summary: 'Get published blogs' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 9,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('featuredOnly') featuredOnly?: string,
  ) {
    return this.blogService.findAllPublic(page, pageSize, search, category, featuredOnly === 'true');
  }

  @Get('details')
  @ApiOperation({ summary: 'Get blog details by ID' })
  async findOne(@Query('slug') slug?: string) {
    if (!slug?.trim()) throw new BadRequestException('Slug is required');
    return this.blogService.findPublicBySlug(slug);
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
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete blog post' })
  async delete(@Query('id') id: number) {
    await this.blogService.delete(id);
  }
}
