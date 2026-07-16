import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RealtorsService } from './realtors.service';

@ApiTags('Realtors')
@Controller('realtors')
@UseGuards(JwtAuthGuard)
export class RealtorsController {
  constructor(private readonly realtors: RealtorsService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.realtors.findAll(search);
  }

  @Post()
  create(@Body() dto: any) {
    return this.realtors.create(dto);
  }

  @Get(':id/history')
  history(@Param('id') id: string) {
    return this.realtors.history(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.realtors.update(Number(id), dto);
  }

  @Post('import')
  importRows(@Body() payload: any) {
    return this.realtors.importRows(payload);
  }
}
