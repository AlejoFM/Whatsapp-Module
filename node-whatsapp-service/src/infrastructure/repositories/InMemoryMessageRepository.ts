import { IMessageRepository } from '../../domain/repositories/IMessageRepository';
import { Message, MessageCreate, MessageStatus } from '../../domain/entities/Message';
import { v4 as uuidv4 } from 'uuid';

export class InMemoryMessageRepository implements IMessageRepository {
  private messages: Map<string, Message> = new Map();

  async create(data: MessageCreate): Promise<Message> {
    const now = new Date();
    const message: Message = {
      id: uuidv4(),
      ...data,
      timestamp: now,
      status: MessageStatus.SENT
    };

    this.messages.set(message.id, message);
    return message;
  }

  async findById(id: string): Promise<Message | null> {
    return this.messages.get(id) || null;
  }

  async findBySessionId(sessionId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    const sessionMessages = Array.from(this.messages.values())
      .filter(msg => msg.sessionId === sessionId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit);

    return sessionMessages;
  }

  async findByConversation(sessionId: string, phoneNumber: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    const conversationMessages = Array.from(this.messages.values())
      .filter(msg => 
        msg.sessionId === sessionId && 
        (msg.from === phoneNumber || msg.to === phoneNumber)
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit);

    return conversationMessages;
  }

  async updateStatus(id: string, status: string): Promise<Message> {
    const message = this.messages.get(id);
    if (!message) {
      throw new Error('Message not found');
    }

    const updatedMessage: Message = {
      ...message,
      status: status as MessageStatus
    };

    this.messages.set(id, updatedMessage);
    return updatedMessage;
  }

  async delete(id: string): Promise<void> {
    this.messages.delete(id);
  }

  async getUnreadCount(sessionId: string, phoneNumber: string): Promise<number> {
    return Array.from(this.messages.values())
      .filter(msg => 
        msg.sessionId === sessionId && 
        msg.to === phoneNumber && 
        !msg.fromMe && 
        msg.status === MessageStatus.DELIVERED
      ).length;
  }
}
