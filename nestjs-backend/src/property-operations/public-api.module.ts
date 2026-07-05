import { Module } from '@nestjs/common';
import { ExternalCoreModule } from '../core/external-core.module';
import { ExternalPublicController } from './controllers/external-public.controller';
import { PublicStatusController } from './controllers/public-status.controller';

@Module({ imports: [ExternalCoreModule], controllers: [ExternalPublicController, PublicStatusController] })
export class PublicApiModule {}
