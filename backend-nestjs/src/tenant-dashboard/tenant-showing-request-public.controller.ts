import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { TenantRealtorWorkflowService } from './tenant-realtor-workflow.service';

@Controller('tenant-public/showing-requests')
export class TenantShowingRequestPublicController {
  constructor(private readonly workflows: TenantRealtorWorkflowService) {}

  @Get(':token')
  getRequest(@Req() req: any, @Param('token') token: string) {
    if (!req.tenant?.databaseName) {
      throw new NotFoundException('Tenant hostname is required');
    }
    return this.workflows.publicShowingRequest(req.tenant, token);
  }

  @Post(':token')
  submitRequest(
    @Req() req: any,
    @Param('token') token: string,
    @Body() body: any,
  ) {
    if (!req.tenant?.databaseName) {
      throw new NotFoundException('Tenant hostname is required');
    }
    return this.workflows.submitPublicShowingRequest(req.tenant, token, body);
  }
}
