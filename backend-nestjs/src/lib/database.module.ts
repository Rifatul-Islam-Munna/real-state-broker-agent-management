import { Logger, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { join } from 'path';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
        const syncSetting = config.get<string>('TYPEORM_SYNCHRONIZE') ?? config.get<string>('DB_SYNCHRONIZE');
        const synchronize = syncSetting ? syncSetting === 'true' : nodeEnv !== 'production';
        const logging = config.get<string>('TYPEORM_LOGGING') === 'true';
        const internalDatabaseUrl =
          config.get<string>('DATABASE_INTERNAL_URL')?.trim() || config.get<string>('DATABASE_URL_INTERNAL')?.trim();
        const databaseUrl = internalDatabaseUrl || config.get<string>('DATABASE_URL')?.trim();
        const dbHost = config.get<string>('DB_HOST')?.trim();
        const dbPort = Number(config.get<string>('DB_PORT') ?? 5432);

        return {
          type: 'postgres' as const,
          ...(dbHost
            ? {
                host: dbHost,
                port: Number.isFinite(dbPort) ? dbPort : 5432,
                username: config.get<string>('DB_USERNAME'),
                password: config.get<string>('DB_PASSWORD'),
                database: config.get<string>('DB_NAME'),
              }
            : databaseUrl
              ? { url: databaseUrl }
            : {
                host: 'localhost',
                port: 5432,
                username: config.get<string>('DB_USERNAME'),
                password: config.get<string>('DB_PASSWORD'),
                database: config.get<string>('DB_NAME'),
              }),
          entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
          autoLoadEntities: true,
          synchronize,
          namingStrategy: new SnakeNamingStrategy(),
          logging,
          retryAttempts: 3,
          retryDelay: 3000,
        };
      },
    }),
  ],
})
export class DatabaseModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(private readonly dataSource: DataSource) {}

  onModuleInit() {
    if (this.dataSource.isInitialized) {
      this.logger.log('PostgreSQL connected successfully');
      return;
    }

    this.logger.error('PostgreSQL connection failed');
  }

  async onModuleDestroy() {
    if (!this.dataSource.isInitialized) return;

    await this.dataSource.destroy();
    this.logger.warn('PostgreSQL disconnected');
  }
}
