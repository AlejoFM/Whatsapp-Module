import { IWhatsAppSessionRepository } from '../../domain/repositories/IWhatsAppSessionRepository';
import { WhatsAppSession, WhatsAppSessionCreate, WhatsAppSessionUpdate } from '../../domain/entities/WhatsAppSession';
import { v4 as uuidv4 } from 'uuid';

export class InMemoryWhatsAppSessionRepository implements IWhatsAppSessionRepository {
  private sessions: Map<string, WhatsAppSession> = new Map();

  async create(data: WhatsAppSessionCreate): Promise<WhatsAppSession> {
    const now = new Date();
    const session: WhatsAppSession = {
      id: uuidv4(),
      clientId: data.clientId,
      phoneNumber: data.phoneNumber || '',
      isConnected: false,
      isAuthenticated: false,
      lastSeen: now,
      createdAt: now,
      updatedAt: now
    };

    this.sessions.set(session.id, session);
    return session;
  }

  async findById(id: string): Promise<WhatsAppSession | null> {
    return this.sessions.get(id) || null;
  }

  async findByClientId(clientId: string): Promise<WhatsAppSession | null> {
    for (const session of this.sessions.values()) {
      if (session.clientId === clientId) {
        return session;
      }
    }
    return null;
  }

  async findAll(): Promise<WhatsAppSession[]> {
    return Array.from(this.sessions.values());
  }

  async update(id: string, data: WhatsAppSessionUpdate): Promise<WhatsAppSession> {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error('Session not found');
    }

    const updatedSession: WhatsAppSession = {
      ...session,
      ...data,
      updatedAt: new Date()
    };

    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async delete(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async findByPhoneNumber(phoneNumber: string): Promise<WhatsAppSession | null> {
    for (const session of this.sessions.values()) {
      if (session.phoneNumber === phoneNumber) {
        return session;
      }
    }
    return null;
  }
}
