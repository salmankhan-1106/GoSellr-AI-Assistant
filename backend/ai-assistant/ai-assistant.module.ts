import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './ai-assistant.service';
import { GroqClientService } from './groq-client.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 15_000,
      maxRedirects: 3,
    }),
    ConfigModule,
  ],
  controllers: [AiAssistantController],
  providers: [AiAssistantService, GroqClientService],
})
export class AiAssistantModule {}
