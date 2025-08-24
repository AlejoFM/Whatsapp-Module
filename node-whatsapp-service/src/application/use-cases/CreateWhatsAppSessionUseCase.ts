import { IWhatsAppService } from '../../domain/services/IWhatsAppService';
import { WhatsAppSession, WhatsAppSessionCreate } from '../../domain/entities/WhatsAppSession';

export class CreateWhatsAppSessionUseCase {
  constructor(private whatsAppService: IWhatsAppService) {}

  async execute(data: WhatsAppSessionCreate): Promise<WhatsAppSession> {
    try {
      const session = await this.whatsAppService.createSession(data);
      return session;
    } catch (error) {
      throw new Error(`Error creating WhatsApp session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
