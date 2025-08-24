export interface Conversation {
  id: string;
  sessionId: string;
  phoneNumber: string;
  contactName?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  isGroup: boolean;
  isContact: boolean; // Indica si es un contacto agregado en la agenda
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationCreate {
  sessionId: string;
  phoneNumber: string;
  contactName?: string;
  isGroup?: boolean;
}

export interface ConversationUpdate {
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
  contactName?: string;
}
