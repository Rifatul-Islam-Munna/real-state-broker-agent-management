import { PredictionModule } from "./prediction/prediction.module";
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PropertiesModule } from './properties/properties.module';
import { LeadsModule } from './leads/leads.module';
import { DealsModule } from './deals/deals.module';
import { BrokerageModule } from './brokerage/brokerage.module';
import { BlogModule } from './blog/blog.module';
import { SettingsModule } from './settings/settings.module';
import { FileUploadModule } from './file-upload/file-upload.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ContactModule } from './contact/contact.module';
import { PropertyChatModule } from './property-chat/property-chat.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SystemModule } from './system/system.module';
import { MailModule } from './mail/mail.module';
import { DocumentsModule } from './documents/documents.module';
import { MarketingModule } from './marketing/marketing.module';
import { HomepageModule } from './homepage/homepage.module';
import { DatabaseModule } from './lib/database.module';
import { SmsModule } from './sms/sms.module';
import { RealtorShowingsModule } from './realtor-showings/realtor-showings.module';
import { ShowingFeedbackModule } from './showing-feedback/showing-feedback.module';
import { PdfsModule } from './pdfs/pdfs.module';
import { DevSeedService } from './dev-seed.service';
import { PropertyOperationsModule } from './property-operations/property-operations.module';
import { ToolsModule } from './tools/tools.module';
import { RealtorsModule } from './realtors/realtors.module';
import { SaasAdminModule } from './saas-admin/saas-admin.module';
import { TenantDatabaseModule } from './tenant-database/tenant-database.module';
import { SecurityModule } from './security/security.module';
import { TenantDashboardModule } from './tenant-dashboard/tenant-dashboard.module';
import { PlatformDomainModule } from './platform-domain/platform-domain.module';
import { TenantChatbotModule } from './tenant-chatbot/tenant-chatbot.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    ScheduleModule.forRoot(),
    UsersModule,
    AuthModule,
    PropertiesModule,
    LeadsModule,
    DealsModule,
    BrokerageModule,
    BlogModule,
    SettingsModule,
    FileUploadModule,
    ContactModule,
    PropertyChatModule,
    DashboardModule,
    SystemModule,
    MailModule,
    DocumentsModule,
    MarketingModule,
    HomepageModule,
    SmsModule,
    RealtorShowingsModule,
    ShowingFeedbackModule,
    PdfsModule,
    PredictionModule,
    PropertyOperationsModule,
    ToolsModule,
    RealtorsModule,
    SaasAdminModule,
    TenantDatabaseModule,
    SecurityModule,
    TenantDashboardModule,
    PlatformDomainModule,
    TenantChatbotModule,
  ],
  controllers: [],
  providers: [AppService, DevSeedService],
})
export class AppModule {}

