import { Module } from '@nestjs/common';
import { DatabaseCoreModule } from '../core/database-core.module';
import { ExternalCoreModule } from '../core/external-core.module';

@Module({ imports: [DatabaseCoreModule, ExternalCoreModule] })
export class PropertyOperationsModule {}
