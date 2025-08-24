export interface Conversation {
  id: string;
  sessionId: string;
  phoneNumber: string;
  contactName?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  isGroup: boolean;
  isContact?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ConversationModel implements Conversation {
  id: string;
  sessionId: string;
  phoneNumber: string;
  contactName?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  isGroup: boolean;
  isContact?: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<Conversation>) {
    this.id = data.id || '';
    this.sessionId = data.sessionId || '';
    this.phoneNumber = data.phoneNumber || '';
    this.contactName = data.contactName;
    this.lastMessage = data.lastMessage;
    this.lastMessageTime = data.lastMessageTime ? new Date(data.lastMessageTime) : undefined;
    this.unreadCount = data.unreadCount || 0;
    this.isGroup = data.isGroup || false;
    this.isContact = data.isContact || false;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }

  // Métodos de negocio
  get displayName(): string {
    return this.contactName || this.phoneNumber;
  }

  get hasUnreadMessages(): boolean {
    return this.unreadCount > 0;
  }

    get isActive(): boolean {
    return !!(this.lastMessageTime &&
           (Date.now() - this.lastMessageTime.getTime()) < 24 * 60 * 60 * 1000); // 24 horas
  }

  get timeAgo(): string {
    if (!this.lastMessageTime) return '';
    
    const now = new Date();
    const diffInHours = (now.getTime() - this.lastMessageTime.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) return 'Ahora';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d`; // 7 días
    return this.lastMessageTime.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  }

  // Métodos de actualización
  updateLastMessage(message: string, timestamp: Date): void {
    this.lastMessage = message;
    this.lastMessageTime = timestamp;
    this.updatedAt = new Date();
  }

  incrementUnreadCount(): void {
    this.unreadCount++;
    this.updatedAt = new Date();
  }

  resetUnreadCount(): void {
    this.unreadCount = 0;
    this.updatedAt = new Date();
  }

  // Serialización
  toJSON(): Conversation {
    return {
      id: this.id,
      sessionId: this.sessionId,
      phoneNumber: this.phoneNumber,
      contactName: this.contactName,
      lastMessage: this.lastMessage,
      lastMessageTime: this.lastMessageTime,
      unreadCount: this.unreadCount,
      isGroup: this.isGroup,
      isContact: this.isContact,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Factory method
  static fromData(data: Partial<Conversation>): ConversationModel {
    if (!data) {
      throw new Error('Conversation data cannot be null or undefined');
    }
    return new ConversationModel(data);
  }

  static createEmpty(sessionId: string, phoneNumber: string): ConversationModel {
    return new ConversationModel({
      sessionId,
      phoneNumber,
      unreadCount: 0,
      isGroup: false
    });
  }
}
