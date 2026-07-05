import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileUploadService } from '../file-upload/file-upload.service';

const allowedTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

@Injectable()
export class PropertyOperationsUploadService extends FileUploadService {
  constructor(configService: ConfigService) {
    super(configService);
  }

  override async uploadFile(file: Express.Multer.File, folder = 'property-operations') {
    if (!file?.buffer?.length) throw new BadRequestException('No file was provided.');
    if (file.size > 10 * 1024 * 1024) throw new BadRequestException('Property Operations files cannot exceed 10 MB.');
    if (!allowedTypes.has(file.mimetype)) throw new BadRequestException('Only JPG, PNG, WebP, PDF, and DOCX files are allowed.');
    file.originalname = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-');
    return super.uploadFile(file, folder);
  }
}
