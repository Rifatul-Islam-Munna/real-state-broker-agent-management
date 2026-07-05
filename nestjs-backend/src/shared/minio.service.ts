import {
  CreateBucketCommand,
  DeleteObjectCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'fs';
import { extname } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly bucketName = 'niqha-public-bukcet';
  private readonly minioUrl: string;
  private readonly s3: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.minioUrl = this.required('MINIO_URL').replace(/\/$/, '');

    this.s3 = new S3Client({
      region: 'us-east-1',
      endpoint: this.minioUrl,
      credentials: {
        accessKeyId: this.required('MINIO_ACCESS_KEY'),
        secretAccessKey: this.required('MINIO_SECRET_KEY'),
      },
      forcePathStyle: true,
    });
  }

  async onModuleInit() {
    await this.createBucketIfNotExists();
    await this.makeBucketPublic();
  }

  async createBucketIfNotExists() {
    try {
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucketName }));
      this.logger.log(`Bucket '${this.bucketName}' created.`);
    } catch (error) {
      const name = this.errorName(error);
      if (name === 'BucketAlreadyOwnedByYou' || name === 'BucketAlreadyExists') {
        this.logger.log(`Bucket '${this.bucketName}' already exists.`);
        return;
      }

      this.logger.error(`Could not create bucket '${this.bucketName}'.`, error);
      throw error;
    }
  }

  async makeBucketPublic() {
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicRead',
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucketName}/*`],
        },
      ],
    };

    try {
      await this.s3.send(new PutBucketPolicyCommand({
        Bucket: this.bucketName,
        Policy: JSON.stringify(policy),
      }));
      this.logger.log(`Bucket '${this.bucketName}' is public.`);
    } catch (error) {
      this.logger.error(`Could not set the policy for '${this.bucketName}'.`, error);
      throw error;
    }
  }

  async upload(file: Express.Multer.File, folder = 'property-operations') {
    const result = await this.uploadFile(file, folder);
    return {
      objectName: result.objectName,
      url: result.url,
      sizeBytes: file.size,
      mimeType: file.mimetype,
    };
  }

  async uploadFile(file: Express.Multer.File, folder = '') {
    if (!file) {
      throw new HttpException('No file was provided.', HttpStatus.BAD_REQUEST);
    }

    try {
      const filename = file.filename || `${randomUUID()}${extname(file.originalname || '')}`;
      const safeFolder = folder.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9/_-]/g, '-');
      const objectName = safeFolder ? `${safeFolder}/${filename}` : filename;
      const body = file.buffer?.length
        ? file.buffer
        : file.path
          ? createReadStream(file.path)
          : undefined;

      if (!body) {
        throw new HttpException('The uploaded file is empty.', HttpStatus.BAD_REQUEST);
      }

      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: objectName,
        Body: body,
        ContentType: file.mimetype,
      }));

      const url = `${this.minioUrl}/${this.bucketName}/${objectName}`;
      this.logger.debug(`File uploaded: ${url}`);
      return { objectName, url };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error uploading file to MinIO.', error);
      throw new HttpException('Failed to upload file.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteService(fileName: string) {
    if (!fileName || typeof fileName !== 'string') {
      throw new HttpException('Invalid file name.', HttpStatus.BAD_REQUEST);
    }

    try {
      await this.s3.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
      }));
      this.logger.debug(`File deleted: ${fileName}`);
      return true;
    } catch (error) {
      this.logger.error(`Could not delete file '${fileName}'.`, error);
      throw new HttpException('Could not delete file.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private required(key: string) {
    const value = this.configService.get<string>(key)?.trim();
    if (!value) throw new Error(`${key} is required.`);
    return value;
  }

  private errorName(error: unknown) {
    return error && typeof error === 'object' && 'name' in error
      ? String((error as { name?: unknown }).name ?? '')
      : '';
  }
}
