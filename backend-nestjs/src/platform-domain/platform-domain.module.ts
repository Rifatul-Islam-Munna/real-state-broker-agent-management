import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformDomainSetting } from './platform-domain-setting.entity';
import { PlatformDomainService } from './platform-domain.service';
import { SaasAdminAuditLog } from '../saas-admin/entities/saas-admin-audit-log.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([PlatformDomainSetting, SaasAdminAuditLog])],
  providers: [PlatformDomainService],
  exports: [PlatformDomainService],
})
export class PlatformDomainModule {}
