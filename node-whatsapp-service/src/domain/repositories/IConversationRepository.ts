import { Conversation, ConversationCreate, ConversationUpdate } from '../entities/Conversation';

export interface IConversationRepository {
  create(data: ConversationCreate): Promise<Conversation>;
  findById(id: string): Promise<Conversation | null>;
  findBySessionId(sessionId: string, limit?: number, offset?: number): Promise<Conversation[]>;
  findByPhoneNumber(sessionId: string, phoneNumber: string): Promise<Conversation | null>;
  update(id: string, data: ConversationUpdate): Promise<Conversation>;
  delete(id: string): Promise<void>;
  updateLastMessage(id: string, message: string, timestamp: Date): Promise<Conversation>;
  updateUnreadCount(id: string, count: number): Promise<Conversation>;
  findLastSynced(sessionId: string): Promise<Conversation | null>;
}
