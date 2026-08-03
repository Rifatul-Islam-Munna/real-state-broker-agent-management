import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdempotencyRecord } from './idempotency-record.entity';
import { IdempotencyService } from './idempotency.service';
import { ReliabilityMonitorService } from './reliability-monitor.service';
import { SecurityRateLimitMiddleware } from './security-rate-limit.middleware';
import { TenantRoleGuard } from './tenant-role.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([IdempotencyRecord])],
  providers: [IdempotencyService, ReliabilityMonitorService, SecurityRateLimitMiddleware, TenantRoleGuard],
  exports: [IdempotencyService, ReliabilityMonitorService, TenantRoleGuard],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityRateLimitMiddleware).forRoutes('*');
  }
}
