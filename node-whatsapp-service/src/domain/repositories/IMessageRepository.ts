import { Message, MessageCreate } from '../entities/Message';

export interface IMessageRepository {
  create(data: MessageCreate): Promise<Message>;
  findById(id: string): Promise<Message | null>;
  findBySessionId(sessionId: string, limit?: number, offset?: number): Promise<Message[]>;
  findByConversation(sessionId: string, phoneNumber: string, limit?: number, offset?: number): Promise<Message[]>;
  updateStatus(id: string, status: string): Promise<Message>;
  delete(id: string): Promise<void>;
  getUnreadCount(sessionId: string, phoneNumber: string): Promise<number>;
}
