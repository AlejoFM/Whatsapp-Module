export interface WhatsAppSession {
  id: string
  clientId: string
  phoneNumber: string
  isConnected: boolean
  isAuthenticated: boolean
  qrCode?: string
  lastSeen: Date
  createdAt: Date
  updatedAt: Date
}

export interface Conversation {
  id: string
  sessionId: string
  phoneNumber: string
  contactName?: string
  lastMessage?: string
  lastMessageTime?: Date
  unreadCount: number
  isGroup: boolean
  isContact: boolean // Indica si es un contacto agregado en la agenda
  createdAt: Date
  updatedAt: Date
}

export interface Message {
  id: string
  sessionId: string
  fromMe: boolean
  from: string
  to: string
  body: string
  timestamp: Date
  type: string
  status: string
  metadata?: Record<string, unknown>
}

export interface CreateSessionRequest {
  clientId: string
  phoneNumber?: string
}

export interface SendMessageRequest {
  to: string
  body: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}
