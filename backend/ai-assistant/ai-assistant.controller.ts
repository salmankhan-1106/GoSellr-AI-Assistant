import {
  Controller, Post, Body, Request, UseGuards, BadRequestException, Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { AiAssistantService } from './ai-assistant.service';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

class ChatMessageDto {
  @IsString() @IsNotEmpty() @MaxLength(500)
  message: string;
}

// Minimal shape this controller needs from your app's authenticated user —
// swap in your own User type, it just needs an `id`.
interface AuthenticatedUser {
  id: string;
}

interface OptionalAuthReq extends Request {
  user?: AuthenticatedUser;
}

@ApiTags('AI Assistant')
@Controller('ai-assistant')
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Post('chat')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Chat with the AI shopping assistant (works for guests and logged-in users)' })
  @ApiHeader({
    name: 'x-ai-client-id',
    required: false,
    description: 'Client-generated UUID for guest rate-limiting. Required when no auth token is sent.',
  })
  chat(
    @Request() req: OptionalAuthReq,
    @Body() dto: ChatMessageDto,
    @Headers('x-ai-client-id') clientId?: string,
  ) {
    const subjectKey = req.user?.id ?? clientId;
    if (!subjectKey) {
      throw new BadRequestException('Missing x-ai-client-id header for guest requests');
    }
    return this.aiAssistantService.chat(subjectKey, dto.message);
  }
}
