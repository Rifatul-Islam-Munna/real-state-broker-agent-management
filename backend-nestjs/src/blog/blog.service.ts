import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogPost } from './entities/blog-post.entity';
import { paginated, toInt } from '../common/api-contract';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(BlogPost)
    private blogRepository: Repository<BlogPost>,
  ) {}

  async findAllAdmin(page = 1, pageSize = 12, search?: string, isPublished?: boolean) {
    page = toInt(page, 1);
    pageSize = toInt(pageSize, 12);
    const qb = this.blogRepository.createQueryBuilder('blog');
    if (search) {
      qb.andWhere('(blog.title ILIKE :search OR blog.excerpt ILIKE :search OR blog.category ILIKE :search OR blog.author_name ILIKE :search)', { search: `%${search}%` });
    }
    if (typeof isPublished === 'boolean') qb.andWhere('blog.is_published = :isPublished', { isPublished });
    const [rows, total] = await qb.orderBy('blog.updatedAt', 'DESC').skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return paginated(rows.map((post) => this.mapAdmin(post)), total, page, pageSize);
  }

  async findAllPublic(page = 1, pageSize = 9, search?: string, category?: string, featuredOnly = false) {
    page = toInt(page, 1);
    pageSize = toInt(pageSize, 9);
    const qb = this.blogRepository.createQueryBuilder('blog').where('blog.is_published = true');
    if (search) {
      qb.andWhere('(blog.title ILIKE :search OR blog.excerpt ILIKE :search OR blog.category ILIKE :search OR blog.author_name ILIKE :search)', { search: `%${search}%` });
    }
    if (category) qb.andWhere('lower(blog.category) = :category', { category: category.toLowerCase() });
    if (featuredOnly) qb.andWhere('blog.is_featured = true');
    const [rows, total] = await qb
      .orderBy('blog.isFeatured', 'DESC')
      .addOrderBy('blog.publishedAt', 'DESC', 'NULLS LAST')
      .addOrderBy('blog.updatedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return paginated(rows.map((post) => this.mapSummary(post)), total, page, pageSize);
  }

  async findOne(idOrSlug: number | string) {
    const where = Number.isFinite(Number(idOrSlug))
      ? { id: Number(idOrSlug) }
      : { slug: String(idOrSlug) };
    const post = await this.blogRepository.findOneBy(where as any);
    if (!post) return null;
    const related = await this.blogRepository.find({
      where: { isPublished: true, category: post.category },
      order: { isFeatured: 'DESC', publishedAt: 'DESC' },
      take: 3,
    });
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      category: post.category,
      coverImageUrl: post.coverImageUrl,
      authorName: post.authorName,
      publishedAt: post.publishedAt ?? post.updatedAt,
      readTimeMinutes: post.readTimeMinutes,
      tags: post.tags ?? [],
      highlights: post.highlights ?? [],
      paragraphs: post.paragraphs ?? [],
      relatedPosts: related.filter((item) => item.id !== post.id).slice(0, 3).map((item) => this.mapSummary(item)),
    };
  }

  async findPublicBySlug(slug: string) {
    const post = await this.blogRepository.createQueryBuilder('blog')
      .where('LOWER(blog.slug) = :slug', { slug: slug.trim().toLowerCase() })
      .andWhere('blog.is_published = true')
      .getOne();
    if (!post) throw new NotFoundException('Blog post not found');
    const related = await this.blogRepository.find({ where: { isPublished: true, category: post.category }, order: { isFeatured: 'DESC', publishedAt: 'DESC' }, take: 4 });
    return { id: post.id, title: post.title, slug: post.slug, excerpt: post.excerpt, category: post.category, coverImageUrl: post.coverImageUrl, authorName: post.authorName, publishedAt: post.publishedAt ?? post.updatedAt, readTimeMinutes: post.readTimeMinutes, tags: post.tags ?? [], highlights: post.highlights ?? [], paragraphs: post.paragraphs ?? [], relatedPosts: related.filter((item) => item.id !== post.id).slice(0, 3).map((item) => this.mapSummary(item)) };
  }

  async create(dto: any) {
    const post = this.blogRepository.create(dto as object);
    await this.applyDefaults(post);
    return this.mapAdmin(await this.blogRepository.save(post));
  }

  async update(id: number, dto: any) {
    const post = await this.blogRepository.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    Object.assign(post, dto);
    await this.applyDefaults(post);
    return this.mapAdmin(await this.blogRepository.save(post));
  }

  async delete(id: number) {
    const post = await this.blogRepository.findOne({ where: { id } });
    if (post) await this.blogRepository.delete(id);
  }

  private async applyDefaults(post: BlogPost) {
    post.title = `${post.title ?? ''}`.trim();
    post.excerpt = `${post.excerpt ?? ''}`.trim();
    post.category = `${post.category ?? ''}`.trim();
    post.coverImageUrl = `${post.coverImageUrl ?? ''}`.trim();
    post.authorName = `${post.authorName ?? ''}`.trim();
    post.paragraphs = (post.paragraphs ?? []).map((item) => item?.trim()).filter(Boolean);
    if (!post.title) throw new BadRequestException('Title is required.');
    if (!post.excerpt) throw new BadRequestException('Excerpt is required.');
    if (!post.category) throw new BadRequestException('Category is required.');
    if (!post.coverImageUrl) throw new BadRequestException('Cover image is required.');
    if (!post.authorName) throw new BadRequestException('Author name is required.');
    if (!post.paragraphs.length) throw new BadRequestException('Add at least one article paragraph.');
    const base = this.slugify(post.title);
    let slug = base;
    let suffix = 2;
    while (await this.blogRepository.createQueryBuilder('blog').where('blog.slug = :slug', { slug }).andWhere(post.id ? 'blog.id != :id' : '1=1', { id: post.id }).getExists()) slug = `${base}-${suffix++}`;
    post.slug = slug;
    post.readTimeMinutes = Math.max(1, Number(post.readTimeMinutes) || 5);
    post.isPublished = post.isPublished ?? true;
    post.publishedAt = post.isPublished ? (post.publishedAt ?? new Date()) : post.publishedAt;
    post.tags = [...new Set((post.tags ?? []).map((item) => item?.trim()).filter(Boolean))];
    post.highlights = (post.highlights ?? []).map((item) => item?.trim()).filter(Boolean);
  }

  private mapAdmin(post: BlogPost) {
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      category: post.category,
      coverImageUrl: post.coverImageUrl,
      coverImageObjectName: post.coverImageObjectName ?? null,
      authorName: post.authorName,
      readTimeMinutes: post.readTimeMinutes,
      isFeatured: post.isFeatured,
      isPublished: post.isPublished,
      publishedAt: post.publishedAt ?? null,
      tags: post.tags ?? [],
      highlights: post.highlights ?? [],
      paragraphs: post.paragraphs ?? [],
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  private mapSummary(post: BlogPost) {
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      category: post.category,
      coverImageUrl: post.coverImageUrl,
      authorName: post.authorName,
      publishedAt: post.publishedAt ?? post.updatedAt,
      readTimeMinutes: post.readTimeMinutes,
      isFeatured: post.isFeatured,
    };
  }

  private slugify(title: string) {
    return (title ?? 'blog-post')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'blog-post';
  }
}
