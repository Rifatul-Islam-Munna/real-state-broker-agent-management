import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = config.getOrThrow<string>('S3_ENDPOINT');
    this.bucket = config.getOrThrow<string>('S3_BUCKET');
    this.publicUrl = config.getOrThrow<string>('S3_PUBLIC_URL').replace(/\/$/, '');
    this.client = new S3Client({
      endpoint,
      region: config.get<string>('S3_REGION') ?? 'auto',
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY'),
        secretAccessKey: config.getOrThrow<string>('S3_SECRET_KEY'),
      },
    });
  }

  async upload(file: Express.Multer.File, folder = 'property-operations') {
    if (!file?.buffer?.length) throw new BadRequestException('No file was provided.');
    if (file.size > 10 * 1024 * 1024) throw new BadRequestException('Files must be 10 MB or smaller.');
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.mimetype)) throw new BadRequestException('Unsupported file type.');
    const extension = file.originalname.includes('.') ? file.originalname.slice(file.originalname.lastIndexOf('.')) : '';
    const objectName = `${folder.replace(/[^a-z0-9/_-]/gi, '-')}/${randomUUID()}${extension}`;
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: objectName, Body: file.buffer, ContentType: file.mimetype }));
    return { objectName, url: `${this.publicUrl}/${this.bucket}/${objectName}`, sizeBytes: file.size, mimeType: file.mimetype };
  }
}
