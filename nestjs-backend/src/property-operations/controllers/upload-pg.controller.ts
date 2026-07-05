import { BadRequestException, Body, Controller, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../../auth/admin.guard';
import { ExternalPublicService } from '../../core/external-public.service';
import { MinioService } from '../../shared/minio.service';

@Controller('property-operations')
export class UploadPgController {
  constructor(private readonly files: MinioService, private readonly external: ExternalPublicService) {}

  @Post('uploads')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('file'))
  admin(@UploadedFile() file: Express.Multer.File, @Body('folder') folder?: string) {
    return this.files.upload(file, folder || 'property-operations-admin');
  }

  @Post('public/:token/upload')
  @UseInterceptors(FileInterceptor('file'))
  async externalUpload(@Param('token') token: string, @UploadedFile() file: Express.Multer.File) {
    const request = await this.external.getRequest(token);
    if (!request.allowFileUploads) throw new BadRequestException('File uploads are not enabled for this request.');
    return this.files.upload(file, 'property-operations-public');
  }
}
