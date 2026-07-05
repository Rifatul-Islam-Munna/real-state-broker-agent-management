import { Module } from '@nestjs/common';
import { ExternalCoreModule } from '../core/external-core.module';
import { PublicController } from './controllers/public.controller';
import { PublicStatusController } from './controllers/public-status.controller';

@Module({ imports: [ExternalCoreModule], controllers: [PublicController, PublicStatusController] })
export class PublicApiModule {}
