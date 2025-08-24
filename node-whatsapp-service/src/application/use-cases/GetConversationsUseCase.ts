import { IWhatsAppService } from '../../domain/services/IWhatsAppService';
import { Conversation } from '../../domain/entities/Conversation';

export interface GetConversationsRequest {
  sessionId: string;
  limit?: number;
  offset?: number;
}

export class GetConversationsUseCase {
  constructor(private whatsAppService: IWhatsAppService) {}

  async execute(request: GetConversationsRequest): Promise<Conversation[]> {
    try {
      const { sessionId, limit = 50, offset = 0 } = request;
      
      if (!sessionId) {
        throw new Error('Session ID is required');
      }

      const conversations = await this.whatsAppService.getConversations(sessionId, limit, offset);
      return conversations;
    } catch (error) {
      throw new Error(`Error getting conversations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
