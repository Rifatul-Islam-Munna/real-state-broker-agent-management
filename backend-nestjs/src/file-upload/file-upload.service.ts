import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class FileUploadService implements OnModuleInit {
  private minioClient: Minio.Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT') || 'localhost',
      port: parseInt(this.configService.get<string>('MINIO_PORT') || '9000'),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY') || 'admin',
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY') || 'admin12345',
    });
    this.bucketName = this.configService.get<string>('MINIO_BUCKET_NAME') || 'eliteestates';
  }

  async onModuleInit() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
      }
    } catch (err) {
      console.error('Error connecting to MinIO', err);
    }
  }

  async uploadFile(file: Express.Multer.File, folder: string = 'uploads') {
    const fileName = `${folder}/${Date.now()}-${file.originalname}`;
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

      const baseUrl = this.configService.get<string>('MINIO_PUBLIC_BASE_URL') || 'http://localhost:9000';
      return {
        url: `${baseUrl}/${this.bucketName}/${fileName}`,
        objectName: fileName,
      };
    } catch (err) {
      throw new InternalServerErrorException('Error uploading file to MinIO');
    }
  }

  async deleteFile(objectName: string) {
    try {
      await this.minioClient.removeObject(this.bucketName, objectName);
    } catch (err) {
      console.error('Error deleting object from MinIO', err);
    }
  }
}
