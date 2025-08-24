import { IConversationRepository } from '../../domain/repositories/IConversationRepository';
import { Conversation, ConversationCreate, ConversationUpdate } from '../../domain/entities/Conversation';
import { v4 as uuidv4 } from 'uuid';

export class InMemoryConversationRepository implements IConversationRepository {
  private conversations: Map<string, Conversation> = new Map();

  async create(data: ConversationCreate): Promise<Conversation> {
    const now = new Date();
    const conversation: Conversation = {
      id: uuidv4(),
      ...data,
      lastMessage: '',
      lastMessageTime: now,
      unreadCount: 0,
      isGroup: data.isGroup || false,
      createdAt: now,
      updatedAt: now
    };

    this.conversations.set(conversation.id, conversation);
    return conversation;
  }

  async findById(id: string): Promise<Conversation | null> {
    return this.conversations.get(id) || null;
  }

  async findBySessionId(sessionId: string, limit: number = 50, offset: number = 0): Promise<Conversation[]> {
    const sessionConversations = Array.from(this.conversations.values())
      .filter(conv => conv.sessionId === sessionId)
      .sort((a, b) => {
        if (!a.lastMessageTime || !b.lastMessageTime) return 0;
        return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
      })
      .slice(offset, offset + limit);

    return sessionConversations;
  }

  async findByPhoneNumber(sessionId: string, phoneNumber: string): Promise<Conversation | null> {
    for (const conversation of this.conversations.values()) {
      if (conversation.sessionId === sessionId && conversation.phoneNumber === phoneNumber) {
        return conversation;
      }
    }
    return null;
  }

  async update(id: string, data: ConversationUpdate): Promise<Conversation> {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const updatedConversation: Conversation = {
      ...conversation,
      ...data,
      updatedAt: new Date()
    };

    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }

  async delete(id: string): Promise<void> {
    this.conversations.delete(id);
  }

  async updateLastMessage(id: string, message: string, timestamp: Date): Promise<Conversation> {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const updatedConversation: Conversation = {
      ...conversation,
      lastMessage: message,
      lastMessageTime: timestamp,
      updatedAt: new Date()
    };

    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }

  async updateUnreadCount(id: string, count: number): Promise<Conversation> {
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const updatedConversation: Conversation = {
      ...conversation,
      unreadCount: count,
      updatedAt: new Date()
    };

    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }

  // 🔒 NUEVO: Encontrar la última conversación sincronizada para una sesión
  async findLastSynced(sessionId: string): Promise<Conversation | null> {
    const sessionConversations = Array.from(this.conversations.values())
      .filter(conv => conv.sessionId === sessionId)
      .sort((a, b) => {
        if (!a.updatedAt || !b.updatedAt) return 0;
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      });

    return sessionConversations.length > 0 ? sessionConversations[0] : null;
  }
}
