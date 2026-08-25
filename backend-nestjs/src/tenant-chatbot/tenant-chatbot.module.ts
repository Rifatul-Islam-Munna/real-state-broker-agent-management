import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaasAdminAuditLog } from '../saas-admin/entities/saas-admin-audit-log.entity';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { AuthenticatedTenantGuard } from '../tenant-dashboard/authenticated-tenant.guard';
import { TenantPlanPermissionGuard } from '../tenant-dashboard/tenant-plan-permission.guard';
import { TenantStaffPermissionGuard } from '../tenant-dashboard/tenant-staff-permission.guard';
import { MiniLmEmbeddingService } from './mini-lm-embedding.service';
import { PlatformChatbotKnowledge } from './platform-chatbot-knowledge.entity';
import { PlatformChatbotKnowledgeController } from './platform-chatbot-knowledge.controller';
import { PlatformChatbotKnowledgeService } from './platform-chatbot-knowledge.service';
import { QdrantKnowledgeService } from './qdrant-knowledge.service';
import { TenantChatbotController } from './tenant-chatbot.controller';
import { TenantChatbotPublicController } from './tenant-chatbot-public.controller';
import { TenantChatbotWorkerService } from './tenant-chatbot-worker.service';
import {
  PLATFORM_KNOWLEDGE_READER,
  TenantChatbotService,
} from './tenant-chatbot.service';

@Module({
  imports: [TypeOrmModule.forFeature([SaasTenant, SaasAdminAuditLog, PlatformChatbotKnowledge])],
  controllers: [
    TenantChatbotController,
    TenantChatbotPublicController,
    PlatformChatbotKnowledgeController,
  ],
  providers: [
    TenantChatbotService,
    TenantChatbotWorkerService,
    MiniLmEmbeddingService,
    QdrantKnowledgeService,
    PlatformChatbotKnowledgeService,
    AuthenticatedTenantGuard,
    TenantStaffPermissionGuard,
    TenantPlanPermissionGuard,
    {
      provide: PLATFORM_KNOWLEDGE_READER,
      useExisting: PlatformChatbotKnowledgeService,
    },
  ],
  exports: [TenantChatbotService],
})
export class TenantChatbotModule {}
