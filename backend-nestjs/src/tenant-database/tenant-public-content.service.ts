import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from './tenant-database.service';
import type { ResolvedTenant } from './tenant-resolution.service';

@Injectable()
export class TenantPublicContentService {
  constructor(private readonly databases: TenantDatabaseService) {}

  async listProperties(tenant: ResolvedTenant, query: Record<string, unknown>) {
    return this.databases.withTenantClient(tenant.databaseName, async (client) => {
      const result = await client.query(
        `SELECT id, title, status, payload, created_at, updated_at
         FROM tenant_property
         WHERE status = 'published'
         ORDER BY created_at DESC`,
      );
      const items = result.rows.map((row: any) => this.propertyItem(row));
      const id = Number(query.id ?? 0);
      if (Number.isInteger(id) && id > 0) {
        const item = items.find((entry: any) => entry.id === id);
        if (!item) throw new NotFoundException('Property not found');
        return item;
      }
      const slug = `${query.slug ?? ''}`.trim();
      if (slug) {
        const item = items.find((entry: any) => entry.slug === slug);
        if (!item) throw new NotFoundException('Property not found');
        return item;
      }
      return this.paginate(this.filterProperties(items, query), query);
    });
  }

  async propertyFilters(tenant: ResolvedTenant) {
    const page: any = await this.listProperties(tenant, { page: 1, pageSize: 500 });
    const items = Array.isArray(page?.items) ? page.items : [];
    return {
      propertyTypes: [...new Set(items.map((item: any) => item.propertyType).filter(Boolean))],
      listingTypes: [...new Set(items.map((item: any) => item.listingType).filter(Boolean))],
      locations: [...new Set(items.map((item: any) => item.location).filter(Boolean))],
    };
  }

  async listBlogs(tenant: ResolvedTenant, query: Record<string, unknown>) {
    const items = await this.blogRows(tenant);
    return this.paginate(this.filterBlogs(items, query), query);
  }

  async blogDetails(tenant: ResolvedTenant, slug: string) {
    const cleanSlug = `${slug ?? ''}`.trim();
    const items = await this.blogRows(tenant);
    const post = items.find((item: any) => item.slug === cleanSlug);
    if (!post) throw new NotFoundException('Blog post not found');
    const relatedPosts = items
      .filter((item: any) => item.slug !== cleanSlug && item.category === post.category)
      .slice(0, 3)
      .map((item: any) => this.blogSummary(item));
    return { ...post, relatedPosts };
  }

  private async blogRows(tenant: ResolvedTenant) {
    return this.databases.withTenantClient(tenant.databaseName, async (client) => {
      const result = await client.query(
        `SELECT id, payload, created_at, updated_at
         FROM tenant_legacy_resource
         WHERE resource = 'blogs'
         ORDER BY updated_at DESC`,
      );
      return result.rows
        .map((row: any) => this.blogItem(row))
        .filter((item: any) => item.isPublished === true);
    });
  }

  private propertyItem(row: any) {
    const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {};
    const imageUrls = Array.isArray(payload.imageUrls) ? payload.imageUrls.filter((value: unknown) => typeof value === 'string') : [];
    return {
      id: Number(row.id),
      slug: `${payload.slug || `property-${row.id}`}`,
      title: `${row.title ?? payload.title ?? ''}`,
      propertyType: `${payload.propertyType ?? 'Residential'}`,
      listingType: `${payload.listingType ?? 'ForSale'}`,
      price: `${payload.price ?? ''}`,
      status: 'Open',
      location: `${payload.location ?? ''}`,
      exactLocation: `${payload.exactLocation ?? ''}`,
      bedRoom: `${payload.bedRoom ?? ''}`,
      bathRoom: `${payload.bathRoom ?? ''}`,
      width: `${payload.width ?? ''}`,
      description: `${payload.description ?? ''}`,
      extraDescription: `${payload.extraDescription ?? ''}`,
      thumbnailUrl: `${payload.thumbnailUrl ?? imageUrls[0] ?? ''}` || null,
      imageUrls,
      imageObjectNames: Array.isArray(payload.imageObjectNames) ? payload.imageObjectNames : [],
      keyAmenities: Array.isArray(payload.keyAmenities) ? payload.keyAmenities : [],
      documentRepositoryItemIds: [],
      neighborhoodInsights: Array.isArray(payload.neighborhoodInsights) ? payload.neighborhoodInsights : [],
      preQuestions: Array.isArray(payload.preQuestions) ? payload.preQuestions : [],
      sellPrediction: payload.sellPrediction ?? { predictedDays: 0, isModelTrained: false, trainingSampleSize: 0, confidence: 0, historicalAverageDays: 0, basis: 'Public listing' },
      agent: payload.agent ?? null,
      agentId: payload.agentId ?? null,
      tenantScoped: true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private blogItem(row: any) {
    const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {};
    const publishedAt = payload.publishedAt ?? row.created_at;
    return {
      id: Number(row.id),
      title: `${payload.title ?? ''}`,
      slug: `${payload.slug ?? `post-${row.id}`}`,
      excerpt: `${payload.excerpt ?? ''}`,
      category: `${payload.category ?? 'Market'}`,
      coverImageUrl: `${payload.coverImageUrl ?? ''}`,
      authorName: `${payload.authorName ?? 'Tenant team'}`,
      publishedAt,
      readTimeMinutes: Math.max(1, Number(payload.readTimeMinutes) || 1),
      isFeatured: payload.isFeatured === true,
      isPublished: payload.isPublished === true,
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      highlights: Array.isArray(payload.highlights) ? payload.highlights : [],
      paragraphs: Array.isArray(payload.paragraphs) ? payload.paragraphs : [],
      createdAt: payload.createdAt ?? row.created_at,
      updatedAt: payload.updatedAt ?? row.updated_at,
    };
  }

  private blogSummary(item: any) {
    const { tags: _tags, highlights: _highlights, paragraphs: _paragraphs, isPublished: _isPublished, createdAt: _createdAt, updatedAt: _updatedAt, ...summary } = item;
    return summary;
  }

  private filterProperties(items: any[], query: Record<string, unknown>) {
    const search = `${query.search ?? ''}`.trim().toLowerCase();
    const propertyType = `${query.propertyType ?? ''}`.trim().toLowerCase();
    const listingType = `${query.listingType ?? ''}`.trim().toLowerCase();
    const location = `${query.location ?? ''}`.trim().toLowerCase();
    return items.filter((item) => {
      if (propertyType && `${item.propertyType}`.toLowerCase() !== propertyType) return false;
      if (listingType && `${item.listingType}`.toLowerCase() !== listingType) return false;
      if (location && !`${item.location}`.toLowerCase().includes(location)) return false;
      if (!search) return true;
      return `${item.title} ${item.location} ${item.description}`.toLowerCase().includes(search);
    });
  }

  private filterBlogs(items: any[], query: Record<string, unknown>) {
    const search = `${query.search ?? ''}`.trim().toLowerCase();
    const category = `${query.category ?? ''}`.trim().toLowerCase();
    const featuredOnly = `${query.featuredOnly ?? ''}`.toLowerCase() === 'true';
    return items.filter((item) => {
      if (category && `${item.category}`.toLowerCase() !== category) return false;
      if (featuredOnly && item.isFeatured !== true) return false;
      if (!search) return true;
      return `${item.title} ${item.excerpt} ${item.category}`.toLowerCase().includes(search);
    });
  }

  private paginate(items: any[], query: Record<string, unknown>) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(500, Math.max(1, Number(query.pageSize) || 20));
    const totalCount = items.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize),
      totalCount,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}
