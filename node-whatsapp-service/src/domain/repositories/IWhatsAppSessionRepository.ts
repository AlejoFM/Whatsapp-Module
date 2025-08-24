import { WhatsAppSession, WhatsAppSessionCreate, WhatsAppSessionUpdate } from '../entities/WhatsAppSession';

export interface IWhatsAppSessionRepository {
  create(data: WhatsAppSessionCreate): Promise<WhatsAppSession>;
  findById(id: string): Promise<WhatsAppSession | null>;
  findByClientId(clientId: string): Promise<WhatsAppSession | null>;
  findAll(): Promise<WhatsAppSession[]>;
  update(id: string, data: WhatsAppSessionUpdate): Promise<WhatsAppSession>;
  delete(id: string): Promise<void>;
  findByPhoneNumber(phoneNumber: string): Promise<WhatsAppSession | null>;
}
