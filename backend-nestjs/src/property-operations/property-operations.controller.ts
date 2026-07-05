import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileUploadService } from '../file-upload/file-upload.service';
import { LegacyLinkService } from './legacy-link.service';
import { PropertyOperationsPublicService } from './property-operations-public.service';
import { PropertyOperationsService } from './property-operations.service';

function integer(value: unknown, label: string) {
  const result = Number(value);
  if (!Number.isInteger(result) || result <= 0) throw new BadRequestException(`${label} is required.`);
  return result;
}

@Controller('property-operations')
@UseGuards(JwtAuthGuard)
export class PropertyOperationsAdminController {
  constructor(
    private readonly operations: PropertyOperationsService,
    private readonly publicAccess: PropertyOperationsPublicService,
    private readonly files: FileUploadService,
  ) {}

  @Get('modules')
  modules() { return this.operations.listModules(); }

  @Get('workspaces')
  workspaces() { return this.operations.listWorkspaces(); }

  @Post('import')
  importProperties(@Body() body: any) { return this.operations.importProperties(body?.properties); }

  @Delete('workspaces')
  removeWorkspace(@Query('propertyId') propertyId: string) {
    return this.operations.removeWorkspace(integer(propertyId, 'Property ID'));
  }

  @Patch('module-state')
  moduleState(@Body() body: any) { return this.operations.updateModuleState(body); }

  @Get('records')
  records(@Query('propertyId') propertyId: string, @Query('moduleKey') moduleKey?: string) {
    return this.operations.listRecords(integer(propertyId, 'Property ID'), moduleKey);
  }

  @Post('records/save')
  saveRecord(@Body() body: any) { return this.operations.saveRecord(body); }

  @Delete('records')
  deleteRecord(@Query('id') id: string) { return this.operations.deleteRecord(integer(id, 'Record ID')); }

  @Patch('records/:id/actions/:action')
  recordAction(@Param('id') id: string, @Param('action') action: string, @Body() body: any) {
    return this.operations.runRecordAction(integer(id, 'Record ID'), action, body);
  }

  @Post('jobs/deliver/:id')
  deliverRecord(@Param('id') id: string, @Query('channel') channel = 'email') {
    return this.operations.deliverRecord(integer(id, 'Record ID'), channel);
  }

  @Post('jobs/run')
  runJobs() { return this.operations.runAutomation(); }

  @Post('recurring-maintenance/run')
  recurringMaintenance(@Query('propertyId') propertyId?: string) {
    return this.operations.runRecurring(propertyId ? integer(propertyId, 'Property ID') : undefined);
  }

  @Get('settings')
  settings() { return this.operations.getSettings(); }

  @Patch('settings')
  updateSettings(@Body() body: any) { return this.operations.updateSettings(body); }

  @Get('payment-provider')
  paymentProvider() { return this.operations.paymentProviderStatus(); }

  @Patch('payment-provider')
  updatePaymentProvider(@Body() body: any) { return this.operations.updatePaymentProvider(body); }

  @Get('analytics')
  analytics(@Query('propertyId') propertyId?: string) {
    return this.operations.getAnalytics(propertyId ? integer(propertyId, 'Property ID') : undefined);
  }

  @Get('ai/summary')
  assistant(@Query('propertyId') propertyId?: string) {
    return this.operations.getAssistant(propertyId ? integer(propertyId, 'Property ID') : undefined);
  }

  @Get('activity')
  activity(@Query('propertyId') propertyId?: string) {
    return this.operations.getActivity(propertyId ? integer(propertyId, 'Property ID') : undefined);
  }

  @Get('public-access')
  publicLinks(@Query('propertyId') propertyId?: string) {
    return this.publicAccess.list(propertyId ? integer(propertyId, 'Property ID') : undefined);
  }

  @Post('public-access')
  createPublicLink(@Body() body: any) { return this.publicAccess.create(body); }

  @Patch('public-access/revoke')
  revokePublicLink(@Query('id') id: string) {
    return this.publicAccess.revoke(integer(id, 'Public access ID'));
  }

  @Get('public-submissions')
  submissions(@Query('accessId') accessId: string) {
    return this.publicAccess.submissions(integer(accessId, 'Public access ID'));
  }

  @Post('uploads')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File, @Body('folder') folder?: string) {
    return this.files.uploadFile(file, folder || 'property-operations-admin');
  }
}

@Controller('property-operations/public')
export class PropertyOperationsPublicController {
  constructor(
    private readonly publicAccess: PropertyOperationsPublicService,
    private readonly legacyLinks: LegacyLinkService,
    private readonly files: FileUploadService,
  ) {}

  @Get(':token')
  async request(@Param('token') token: string) {
    await this.legacyLinks.restore(token);
    return this.publicAccess.getRequest(token);
  }

  @Post(':token')
  async submit(@Param('token') token: string, @Body() body: any) {
    await this.legacyLinks.restore(token);
    return this.publicAccess.submit(token, body);
  }

  @Post(':token/upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@Param('token') token: string, @UploadedFile() file: Express.Multer.File) {
    await this.legacyLinks.restore(token);
    await this.publicAccess.assertUploadAllowed(token);
    return this.files.uploadFile(file, 'property-operations-public');
  }

  @Get(':token/status')
  async status(@Param('token') token: string) {
    await this.legacyLinks.restore(token);
    return this.publicAccess.getStatus(token);
  }

  @Patch(':token/status')
  async updateStatus(@Param('token') token: string, @Body() body: any) {
    await this.legacyLinks.restore(token);
    return this.publicAccess.updateStatus(token, body);
  }

  @Post(':token/checkout')
  async checkout(@Param('token') token: string, @Body() body: any) {
    await this.legacyLinks.restore(token);
    const successUrl = String(body?.successUrl ?? '').trim();
    const cancelUrl = String(body?.cancelUrl ?? '').trim();
    if (!successUrl || !cancelUrl) throw new BadRequestException('Payment success and cancellation URLs are required.');
    return this.publicAccess.createCheckout(token, successUrl, cancelUrl);
  }

  @Post(':token/checkout/verify')
  async verifyCheckout(@Param('token') token: string, @Body() body: any) {
    await this.legacyLinks.restore(token);
    const sessionId = String(body?.sessionId ?? '').trim();
    const paymentToken = String(body?.paymentToken ?? '').trim();
    if (!sessionId || !paymentToken) throw new BadRequestException('Payment session ID and token are required.');
    return this.publicAccess.verifyCheckout(token, sessionId, paymentToken);
  }
}
