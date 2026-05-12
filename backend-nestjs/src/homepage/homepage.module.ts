import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HomePageSettings } from './entities/homepage-settings.entity';
import { HomepageService } from './homepage.service';
import { HomepageController } from './homepage.controller';

@Module({
  imports: [TypeOrmModule.forFeature([HomePageSettings])],
  providers: [HomepageService],
  controllers: [HomepageController],
})
export class HomepageModule {}
