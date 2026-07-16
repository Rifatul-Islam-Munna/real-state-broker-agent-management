import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RealtorShowing } from '../realtor-showings/entities/realtor-showing.entity';
import { ShowingFeedback } from '../showing-feedback/entities/showing-feedback.entity';
import { SettingsModule } from '../settings/settings.module';
import { Realtor } from './entities/realtor.entity';
import { RealtorsController } from './realtors.controller';
import { RealtorsService } from './realtors.service';

@Module({
  imports: [TypeOrmModule.forFeature([Realtor, RealtorShowing, ShowingFeedback]), SettingsModule],
  controllers: [RealtorsController],
  exports: [RealtorsService],
  providers: [RealtorsService],
})
export class RealtorsModule {}
