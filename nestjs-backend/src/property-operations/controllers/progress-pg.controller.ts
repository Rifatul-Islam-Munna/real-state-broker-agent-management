import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ExternalStatusService } from '../../core/external-status.service';

@Controller('property-operations/public/:token/status')
export class ProgressPgController {
  constructor(private readonly progress: ExternalStatusService) {}
}
