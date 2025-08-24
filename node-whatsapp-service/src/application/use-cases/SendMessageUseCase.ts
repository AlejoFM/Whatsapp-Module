import { IWhatsAppService } from '../../domain/services/IWhatsAppService';
import { Message } from '../../domain/entities/Message';

export class SendMessageUseCase {
  constructor(private whatsAppService: IWhatsAppService) {}

  async execute(sessionId: string, to: string, body: string): Promise<Message> {
    try {
      if (!body.trim()) {
        throw new Error('Message body cannot be empty');
      }

      if (!to.trim()) {
        throw new Error('Recipient phone number cannot be empty');
      }

      const message = await this.whatsAppService.sendMessage(sessionId, to, body);
      return message;
    } catch (error) {
      throw new Error(`Error sending message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
