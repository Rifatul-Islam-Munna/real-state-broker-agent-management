import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuleStateEntity, OperationsRecordEntity } from './database/entities/record.entity';
import { WorkspaceEntity } from './database/entities/workspace.entity';
import { PropertyOperationsModule } from './property-operations/property-operations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    JwtModule.register({ global: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.get<string>('ConnectionStrings__Default') ?? config.getOrThrow<string>('DATABASE_URL'),
        entities: [WorkspaceEntity, ModuleStateEntity, OperationsRecordEntity],
        synchronize: true,
        logging: false,
      }),
    }),
    PropertyOperationsModule,
  ],
})
export class AppModule {}
