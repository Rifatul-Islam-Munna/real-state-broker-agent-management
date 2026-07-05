import { BadRequestException, Body, Controller, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../../auth/admin.guard';
import { PublicAccessService } from '../services/public-access.service';
import { UploadService } from '../services/upload.service';

@Controller('property-operations')
export class UploadController {
  constructor(private readonly uploads: UploadService, private readonly publicAccess: PublicAccessService) {}

  @Post('uploads')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('file'))
  uploadAdmin(@UploadedFile() file: Express.Multer.File, @Body('folder') folder?: string) {
    return this.uploads.upload(file, folder || 'property-operations-admin');
  }

  @Post('public/:token/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPublic(@Param('token') token: string, @UploadedFile() file: Express.Multer.File) {
    const request = await this.publicAccess.getPublic(token);
    if (!request.allowFileUploads) throw new BadRequestException('File uploads are not enabled for this request.');
    return this.uploads.upload(file, 'property-operations-public');
  }
}
