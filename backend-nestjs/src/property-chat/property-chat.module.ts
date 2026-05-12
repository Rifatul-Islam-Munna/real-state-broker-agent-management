import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyChatConversation, PropertyChatMessage } from './entities/property-chat.entity';
import { PropertyChatService } from './property-chat.service';
import { PropertyChatController } from './property-chat.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyChatConversation, PropertyChatMessage])],
  providers: [PropertyChatService],
  controllers: [PropertyChatController],
})
export class PropertyChatModule {}
