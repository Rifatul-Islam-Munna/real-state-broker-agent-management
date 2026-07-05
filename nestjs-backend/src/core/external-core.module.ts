import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminGuard } from '../auth/admin.guard';
import { DeliveryService } from '../shared/delivery.service';
import { MinioService } from '../shared/minio.service';
import { PaymentService } from '../shared/payment.service';
import { AccessCodeService } from './access-code.service';
import { DatabaseCoreModule } from './database-core.module';
import { ExternalAdminService } from './external-admin.service';
import { ExternalPublicService } from './external-public.service';
import { ExternalRequestStoreService } from './external-request-store.service';
import { ExternalStatusService } from './external-status.service';

@Module({
  imports: [DatabaseCoreModule, ScheduleModule.forRoot()],
  providers: [AdminGuard, MinioService, DeliveryService, PaymentService, AccessCodeService, ExternalRequestStoreService, ExternalAdminService, ExternalPublicService, ExternalStatusService],
  exports: [AdminGuard, MinioService, DeliveryService, PaymentService, AccessCodeService, ExternalRequestStoreService, ExternalAdminService, ExternalPublicService, ExternalStatusService],
})
export class ExternalCoreModule {}
