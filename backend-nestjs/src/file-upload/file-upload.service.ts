import { BadRequestException, Injectable, ServiceUnavailableException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class FileUploadService implements OnModuleInit {
  private minioClient: Minio.Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.minioClient = new Minio.Client(this.getMinioClientOptions());
    this.bucketName = this.configService.get<string>('MINIO_BUCKET_NAME') || 'eliteestates';
  }

  private getMinioClientOptions(): Minio.ClientOptions {
    const endpoint = this.getMinioEndpointUrl();
    const port = endpoint.port ? Number(endpoint.port) : undefined;

    return {
      endPoint: endpoint.hostname.replace(/^\[|\]$/g, ''),
      ...(port ? { port } : {}),
      useSSL: endpoint.protocol === 'https:',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY') || 'admin',
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY') || 'admin12345',
    };
  }

  private getMinioEndpointUrl() {
    const configuredEndpoint = (this.configService.get<string>('MINIO_ENDPOINT') || 'http://localhost:9000').trim();
    if (configuredEndpoint.includes('://')) {
      return new URL(configuredEndpoint);
    }

    const protocol = this.configService.get<string>('MINIO_USE_SSL') === 'true' ? 'https' : 'http';
    return new URL(`${protocol}://${configuredEndpoint}`);
  }

  private getMinioPublicBaseUrl() {
    const configuredBaseUrl = this.configService.get<string>('MINIO_PUBLIC_BASE_URL')?.trim();
    if (configuredBaseUrl) return configuredBaseUrl.replace(/\/+$/, '');

    const endpoint = this.getMinioEndpointUrl();
    return endpoint.origin.replace(/\/+$/, '');
  }

  async onModuleInit() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
      }
      await this.ensurePublicReadPolicy();
    } catch (err) {
      console.error('Error connecting to MinIO', err);
    }
  }

  private async ensurePublicReadPolicy() {
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadAllObjects',
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucketName}/*`],
        },
      ],
    };
    await this.minioClient.setBucketPolicy(this.bucketName, JSON.stringify(policy));
  }

  async uploadFile(file: Express.Multer.File, folder: string = 'general', tenantId?: number) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No file was provided.');
    }
    folder = (folder || 'general').trim() || 'general';
    const cleanFolder = folder.replace(/[^a-zA-Z0-9/_-]+/g, '-').replace(/^\/+|\/+$/g, '') || 'general';
    const scopedFolder = Number.isInteger(tenantId) && Number(tenantId) > 0
      ? `tenants/${Number(tenantId)}/${cleanFolder}`
      : cleanFolder;
    const fileName = `${scopedFolder}/${Date.now()}-${file.originalname}`;
    try {
      await this.minioClient.putObject(
        this.bucketName,
        fileName,
        file.buffer,
        file.size,
        {
          'Content-Type': file.mimetype,
        },
      );

      const baseUrl = this.getMinioPublicBaseUrl();
      return {
        objectName: fileName,
        url: `${baseUrl}/${this.bucketName}/${fileName}`,
        sizeBytes: file.size,
        mimeType: file.mimetype,
      };
    } catch (err) {
      throw new ServiceUnavailableException('File upload is not configured or unavailable.');
    }
  }

  async deleteFile(objectName: string) {
    if (!objectName?.trim()) {
      throw new BadRequestException('Object name is required.');
    }
    try {
      await this.minioClient.removeObject(this.bucketName, objectName.trim());
      return { message: 'File deleted' };
    } catch (err) {
      throw new ServiceUnavailableException('File upload is not configured or unavailable.');
    }
  }

  objectNameFromReference(value: unknown) {
    const raw = `${value ?? ''}`.trim();
    if (!raw || !raw.includes('://')) return null;
    try {
      const url = new URL(raw);
      const marker = `/${this.bucketName}/`;
      const index = url.pathname.indexOf(marker);
      if (index < 0) return null;
      return decodeURIComponent(url.pathname.slice(index + marker.length));
    } catch {
      return null;
    }
  }

  async deleteTenantFiles(tenantId: number, legacyObjectNames: string[] = []) {
    const prefix = `tenants/${tenantId}/`;
    const names = new Set<string>();
    await new Promise<void>((resolve, reject) => {
      const stream = this.minioClient.listObjectsV2(this.bucketName, prefix, true);
      stream.on('data', (item) => { if (item.name) names.add(item.name); });
      stream.on('error', reject);
      stream.on('end', resolve);
    });
    for (const name of legacyObjectNames) {
      const clean = `${name ?? ''}`.trim();
      if (clean) names.add(clean);
    }
    const all = [...names];
    for (let index = 0; index < all.length; index += 50) {
      const batch = all.slice(index, index + 50);
      if (batch.length) await this.minioClient.removeObjects(this.bucketName, batch);
      if (index + 50 < all.length) await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return { deleted: all.length };
  }
}
