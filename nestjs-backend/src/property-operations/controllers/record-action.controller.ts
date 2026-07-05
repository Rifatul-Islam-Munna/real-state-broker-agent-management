import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../auth/admin.guard';
import { RecordService } from '../../core/record.service';
import { DeliveryService } from '../../shared/delivery.service';
import { RecordActionDto } from '../dto/workspace-record.dto';

@UseGuards(AdminGuard)
@Controller('property-operations')
export class RecordActionController {
  constructor(private readonly records: RecordService, private readonly delivery: DeliveryService) {}

  @Patch('records/:id/actions/:action')
  run(@Param('id') id: string, @Param('action') action: string, @Body() dto: RecordActionDto) {
    if (action === 'send') return this.delivery.send(id, String(dto.payload?.channel ?? 'email'));
    return this.records.action(id, action, dto);
  }
}
