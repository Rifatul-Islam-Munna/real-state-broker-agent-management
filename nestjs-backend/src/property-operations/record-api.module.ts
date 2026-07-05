import { Module } from '@nestjs/common';
import { DatabaseCoreModule } from '../core/database-core.module';
import { ExternalCoreModule } from '../core/external-core.module';
import { RecordActionController } from './controllers/record-action.controller';
import { RecordCrudController } from './controllers/record-crud.controller';

@Module({ imports: [DatabaseCoreModule, ExternalCoreModule], controllers: [RecordCrudController, RecordActionController] })
export class RecordApiModule {}
