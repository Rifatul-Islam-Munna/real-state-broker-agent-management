import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactRequest } from './entities/contact.entity';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [TypeOrmModule.forFeature([ContactRequest]), LeadsModule],
  providers: [ContactService],
  controllers: [ContactController],
})
export class ContactModule {}
