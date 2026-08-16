import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  Delete,
  Query,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from './file-upload.service';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('FileUpload')
@Controller('upload')
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder: string,
    @Req() request: any,
  ) {
    return this.fileUploadService.uploadFile(file, folder, request.tenant?.id);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete a file' })
  async deleteFile(@Query('ObjectName') objectName: string, @Query('objectName') lowerObjectName?: string) {
    const name = objectName || lowerObjectName;
    if (!name) throw new BadRequestException('Object name is required');
    return this.fileUploadService.deleteFile(name);
  }
}
