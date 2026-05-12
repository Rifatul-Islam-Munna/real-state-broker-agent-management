import { PredictionModule } from "./prediction/prediction.module";
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
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
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { ScheduleModule } from '@nestjs/schedule';
import { ContactModule } from './contact/contact.module';
import { PropertyChatModule } from './property-chat/property-chat.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SystemModule } from './system/system.module';
import { MailModule } from './mail/mail.module';
import { DocumentsModule } from './documents/documents.module';
import { MarketingModule } from './marketing/marketing.module';
import { HomepageModule } from './homepage/homepage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: true,
        namingStrategy: new SnakeNamingStrategy(),
        logging: true,
      }),
      inject: [ConfigService],
    }),
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
    HomepageModule, PredictionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
