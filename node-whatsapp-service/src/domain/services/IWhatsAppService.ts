import { WhatsAppSession, WhatsAppSessionCreate } from '../entities/WhatsAppSession';
import { Message, MessageCreate } from '../entities/Message';
import { Conversation } from '../entities/Conversation';

export interface IWhatsAppService {
  // Gestión de sesiones
  createSession(data: WhatsAppSessionCreate): Promise<WhatsAppSession>;
  connectSession(sessionId: string): Promise<{ qrCode: string; session: WhatsAppSession }>;
  disconnectSession(sessionId: string): Promise<void>;
  getSessionStatus(sessionId: string): Promise<WhatsAppSession>;
  getAllSessions(): Promise<WhatsAppSession[]>;
  
  // Gestión de mensajes
  sendMessage(sessionId: string, to: string, body: string): Promise<Message>;
  getMessages(sessionId: string, phoneNumber: string, limit?: number, offset?: number): Promise<Message[]>;
  
  // Gestión de conversaciones
  getConversations(sessionId: string, limit?: number, offset?: number): Promise<Conversation[]>;
  getConversationsRealtime(sessionId: string, limit?: number, offset?: number): Promise<Conversation[]>;
  getConversation(sessionId: string, phoneNumber: string): Promise<Conversation | null>;
  
  // 🔄 NUEVO: Métodos separados para obtener datos de forma progresiva
  getContacts(sessionId: string): Promise<Array<{ 
    id: string; 
    name: string; 
    phoneNumber: string; 
    isContact: boolean;
    lastMessage?: string;
    lastMessageTime?: Date;
    unreadCount: number;
    hasUnreadMessages: boolean;
  }>>;
  
  // 🚀 NUEVO: Método para obtener preview específico de un contacto
  getContactPreview(sessionId: string, contactId: string): Promise<{
    lastMessage?: string;
    lastMessageTime?: Date;
    unreadCount: number;
    hasUnreadMessages: boolean;
  }>;
  
  // 🚀 NUEVO: Método para obtener previews de múltiples contactos de manera eficiente
  getContactsPreviews(sessionId: string, contactIds: string[]): Promise<Map<string, {
    lastMessage?: string;
    lastMessageTime?: Date;
    unreadCount: number;
    hasUnreadMessages: boolean;
  }>>;
  getContactConversations(sessionId: string, limit?: number, offset?: number): Promise<Conversation[]>;
  getNonContactConversations(sessionId: string, limit?: number, offset?: number): Promise<Conversation[]>;
  
  // 🚀 NUEVO: Estrategia de carga progresiva para chats y mensajes
  getContactChatsBatch(sessionId: string, limit?: number, offset?: number): Promise<Array<{
    chatId: string;
    contactId: string;
    contactName: string;
    phoneNumber: string;
    lastMessage?: string;
    lastMessageTime?: Date;
    unreadCount: number;
    hasUnreadMessages: boolean;
    isContact: boolean;
  }>>;
  
  getNonContactChatsBatch(sessionId: string, limit?: number, offset?: number): Promise<Array<{
    chatId: string;
    contactId: string;
    contactName: string;
    phoneNumber: string;
    lastMessage?: string;
    lastMessageTime?: Date;
    unreadCount: number;
    hasUnreadMessages: boolean;
    isContact: boolean;
  }>>;
  
  fetchChatMessages(sessionId: string, chatId: string, limit?: number, includeFromMe?: boolean): Promise<Message[]>;
  
  // 🚀 NUEVO: Método avanzado para obtener mensajes con más opciones de búsqueda
  fetchChatMessagesAdvanced(
    sessionId: string, 
    chatId: string, 
    options: {
      limit?: number;
      includeFromMe?: boolean;
      fromDate?: Date;
      toDate?: Date;
      messageType?: string;
      searchText?: string;
    }
  ): Promise<Message[]>;
  
  loadChatMessagesOnDemand(sessionId: string, chatId: string, currentLimit: number, additionalLimit?: number): Promise<{
    messages: Message[];
    hasMore: boolean;
    totalLoaded: number;
  }>;
  
  // Sincronización
  forceSync(sessionId: string): Promise<void>;
  forceFullSync(sessionId: string): Promise<void>;
  
  // Sincronización progresiva
  progressiveSync(sessionId: string, batchSize?: number): Promise<{
    totalConversations: number;
    processedConversations: number;
    isComplete: boolean;
  }>;
  continueProgressiveSync(sessionId: string, offset: number, batchSize?: number): Promise<{
    totalConversations: number;
    processedConversations: number;
    isComplete: boolean;
  }>;
  
  // Eventos en tiempo real
  onMessageReceived(callback: (message: Message) => void): void;
  onSessionStatusChanged(callback: (session: WhatsAppSession) => void): void;
  onConnectionStatusChanged(callback: (sessionId: string, isConnected: boolean) => void): void;
  onNewConversation(callback: (conversation: Conversation) => void): void;
  onConversationsSynced(callback: (sessionId: string, conversations: Conversation[]) => void): void;
  onSyncProgress(callback: (sessionId: string, progress: { current: number, total: number, conversation: Conversation }) => void): void;
  
  // 🔒 Control de sincronización
  isSyncActive(sessionId: string): boolean;
  getSyncStats(sessionId: string): {
    isActive: boolean;
    queueLength: number;
    lastSyncTime: Date | undefined;
  };
}
