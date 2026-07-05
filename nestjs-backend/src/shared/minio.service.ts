import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { randomUUID } from 'crypto';

@Injectable()
export class MinioService {
  private readonly client: Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(config: ConfigService) {
    const endpointValue = config.get<string>('MinIOSettings__Endpoint') ?? config.getOrThrow<string>('MINIO_ENDPOINT');
    const endpoint = endpointValue.replace(/^https?:\/\//, '').split(':')[0];
    const portText = endpointValue.replace(/^https?:\/\//, '').split(':')[1];
    const useSSL = (config.get<string>('MinIOSettings__UseSSL') ?? config.get<string>('MINIO_USE_SSL') ?? 'false').toLowerCase() === 'true';
    const port = Number(portText || (useSSL ? 443 : 9000));
    this.bucket = config.get<string>('MinIOSettings__BucketName') ?? config.get<string>('MINIO_BUCKET') ?? 'real-estate-assets';
    this.publicUrl = (config.get<string>('MinIOSettings__PublicUrl') ?? config.get<string>('MINIO_PUBLIC_URL') ?? endpointValue).replace(/\/$/, '');
    this.client = new Client({
      endPoint: endpoint,
      port,
      useSSL,
      accessKey: config.get<string>('MinIOSettings__AccessKey') ?? config.getOrThrow<string>('MINIO_ACCESS_KEY'),
      secretKey: config.get<string>('MinIOSettings__SecretKey') ?? config.getOrThrow<string>('MINIO_SECRET_KEY'),
    });
  }

  async upload(file: Express.Multer.File, folder = 'property-operations') {
    if (!file?.buffer?.length) throw new BadRequestException('No file was provided.');
    if (file.size > 10 * 1024 * 1024) throw new BadRequestException('Files must be 10 MB or smaller.');
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.mimetype)) throw new BadRequestException('Unsupported file type.');
    const extension = file.originalname.includes('.') ? file.originalname.slice(file.originalname.lastIndexOf('.')) : '';
    const objectName = `${folder.replace(/[^a-z0-9/_-]/gi, '-')}/${randomUUID()}${extension}`;
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) await this.client.makeBucket(this.bucket);
    await this.client.putObject(this.bucket, objectName, file.buffer, file.size, { 'Content-Type': file.mimetype });
    return { objectName, url: `${this.publicUrl}/${this.bucket}/${objectName}`, sizeBytes: file.size, mimeType: file.mimetype };
  }
}
