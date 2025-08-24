import { IWhatsAppService } from '../../domain/services/IWhatsAppService';
import { WhatsAppSession } from '../../domain/entities/WhatsAppSession';

export interface ConnectSessionResult {
  qrCode: string;
  session: WhatsAppSession;
}

export class ConnectWhatsAppSessionUseCase {
  constructor(private whatsAppService: IWhatsAppService) {}

  async execute(sessionId: string): Promise<ConnectSessionResult> {
    try {
      const result = await this.whatsAppService.connectSession(sessionId);
      return result;
    } catch (error) {
      throw new Error(`Error connecting WhatsApp session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
