import axios from 'axios'
import { WhatsAppSession, Conversation, Message, CreateSessionRequest, SendMessageRequest, ApiResponse } from '../types'
import { conversationCache } from './conversationCache'
import { smartAuthService } from './smartAuthService'

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const whatsAppService = {
  // Sesiones
  async createSession(data: CreateSessionRequest): Promise<WhatsAppSession> {
    const response = await api.post<ApiResponse<WhatsAppSession>>('/whatsapp/sessions', data)
    return response.data.data
  },

  async getAllSessions(): Promise<WhatsAppSession[]> {
    const response = await api.get<ApiResponse<WhatsAppSession[]>>('/whatsapp/sessions')
    return response.data.data
  },

  async getSessionStatus(sessionId: string): Promise<WhatsAppSession> {
    const response = await api.get<ApiResponse<WhatsAppSession>>(`/whatsapp/sessions/${sessionId}`)
    return response.data.data
  },

  async connectSession(sessionId: string): Promise<{ qrCode: string; session: WhatsAppSession }> {
    const response = await api.post<ApiResponse<{ qrCode: string; session: WhatsAppSession }>>(`/whatsapp/sessions/${sessionId}/connect`)
    return response.data.data
  },

  async disconnectSession(sessionId: string): Promise<void> {
    await api.post(`/whatsapp/sessions/${sessionId}/disconnect`)
  },

  // Mensajes
  async sendMessage(sessionId: string, data: SendMessageRequest): Promise<Message> {
    const response = await api.post<ApiResponse<Message>>(`/whatsapp/sessions/${sessionId}/messages`, data)
    return response.data.data
  },

  // 🔄 ACTUALIZADO: Usar el nuevo endpoint fetchChatMessages
  async getMessages(sessionId: string, phoneNumber: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    console.log(`💬 Obteniendo mensajes usando nuevo endpoint para: ${phoneNumber}`)
    
    try {
      // Usar el nuevo endpoint fetchChatMessages en lugar del legacy
      const messages = await this.fetchChatMessages(sessionId, phoneNumber, limit, true)
      
      // Aplicar offset si es necesario (para compatibilidad con el método anterior)
      if (offset > 0 && messages.length > offset) {
        return messages.slice(offset)
      }
      
      return messages
    } catch (error) {
      console.error('❌ Error obteniendo mensajes:', error)
      return []
    }
  },

  // 🔄 NUEVO: Obtener contactos de WhatsApp
  async getContacts(sessionId: string, limit: number = 100, offset: number = 0): Promise<Array<{ id: string; name: string; phoneNumber: string; isContact: boolean }>> {
    console.log(`👥 Obteniendo contactos para sesión ${sessionId}: limit=${limit}, offset=${offset}`)
    
    try {
      const response = await api.get<ApiResponse<Array<{ id: string; name: string; phoneNumber: string; isContact: boolean }>>>(
        `/whatsapp/sessions/${sessionId}/contacts`,
        { params: { limit, offset } }
      )
      
      const contacts = response.data.data
      console.log(`✅ Contactos obtenidos exitosamente: ${contacts.length}`)
      
      return contacts
    } catch (error) {
      console.error('❌ Error obteniendo contactos:', error)
      return []
    }
  },

  // 🔄 NUEVO: Obtener conversaciones de contactos (prioridad alta)
  async getContactConversations(sessionId: string, limit: number = 100, offset: number = 0): Promise<Conversation[]> {
    console.log(`👥 Obteniendo conversaciones de contactos: limit=${limit}, offset=${offset}`)
    
    try {
      const response = await api.get<ApiResponse<Conversation[]>>(
        `/whatsapp/sessions/${sessionId}/conversations/contacts`,
        { params: { limit, offset } }
      )
      
      const conversations = response.data.data
      console.log(`✅ Conversaciones de contactos obtenidas: ${conversations.length}`)
      
      // Guardar en caché para futuras consultas
      if (conversations.length > 0) {
        conversationCache.setConversations(sessionId, conversations)
      }
      
      return conversations
    } catch (error) {
      console.error('❌ Error obteniendo conversaciones de contactos:', error)
      return []
    }
  },

  // 🔄 NUEVO: Obtener conversaciones que no son contactos (prioridad baja)
  async getNonContactConversations(sessionId: string, limit: number = 100, offset: number = 0): Promise<Conversation[]> {
    console.log(`📱 Obteniendo conversaciones no contactos: limit=${limit}, offset=${offset}`)
    
    try {
      const response = await api.get<ApiResponse<Conversation[]>>(
        `/whatsapp/sessions/${sessionId}/conversations/non-contacts`,
        { params: { limit, offset } }
      )
      
      const conversations = response.data.data
      console.log(`✅ Conversaciones no contactos obtenidas: ${conversations.length}`)
      
      // Guardar en caché para futuras consultas
      if (conversations.length > 0) {
        conversationCache.setConversations(sessionId, conversations)
      }
      
      return conversations
    } catch (error) {
      console.error('❌ Error obteniendo conversaciones no contactos:', error)
      return []
    }
  },

  // Conversaciones (método legacy - mantenido para compatibilidad)
  async getConversations(sessionId: string, limit: number = 200, offset: number = 0): Promise<Conversation[]> {
    // Intentar obtener del caché primero
    const cached = conversationCache.getConversations(sessionId)
    if (cached && cached.length > 0) {
      console.log(`📦 Conversaciones obtenidas del caché: ${cached.length}`)
      
      // Aplicar paginación al caché
      const start = offset
      const end = offset + limit
      const paginatedConversations = cached.slice(start, end)
      
      // Actualizar timestamp de sincronización
      conversationCache.updateLastSync(sessionId)
      
      return paginatedConversations
    }

    // Si no hay caché, hacer petición al backend
    console.log(`🌐 Obteniendo conversaciones del backend para sesión ${sessionId}`)
    const response = await api.get<ApiResponse<Conversation[]>>(`/whatsapp/sessions/${sessionId}/conversations`, {
      params: { limit, offset }
    })
    
    const conversations = response.data.data
    
    // Guardar en caché para futuras consultas
    if (conversations.length > 0) {
      conversationCache.setConversations(sessionId, conversations)
      console.log(`💾 Conversaciones guardadas en caché: ${conversations.length}`)
    }
    
    return conversations
  },

  async getConversationsRealtime(sessionId: string, limit: number = 200, offset: number = 0): Promise<Conversation[]> {
    const response = await api.get<ApiResponse<Conversation[]>>(`/whatsapp/sessions/${sessionId}/conversations/realtime`, {
      params: { limit, offset }
    })
    return response.data.data
  },

  async getConversation(sessionId: string, phoneNumber: string): Promise<Conversation> {
    const response = await api.get<ApiResponse<Conversation>>(`/whatsapp/sessions/${sessionId}/conversations/${phoneNumber}`)
    return response.data.data
  },

  // 🔄 NUEVO: Método para carga progresiva de conversaciones
  async loadConversationsProgressive(sessionId: string, options: {
    maxContacts?: number
    maxNonContacts?: number
    enableParallel?: boolean
  } = {}): Promise<{
    contacts: Array<{ id: string; name: string; phoneNumber: string; isContact: boolean }>
    contactConversations: Conversation[]
    nonContactConversations: Conversation[]
    total: number
    loadTime: number
  }> {
    const startTime = Date.now()
    const { maxContacts = 50, maxNonContacts = 100, enableParallel = true } = options
    
    console.log(`🔄 Iniciando carga progresiva para sesión ${sessionId}`)
    
    try {
      let contacts: Array<{ id: string; name: string; phoneNumber: string; isContact: boolean }> = []
      let contactConversations: Conversation[] = []
      let nonContactConversations: Conversation[] = []
      
      if (enableParallel) {
        // Cargar en paralelo para mayor velocidad
        console.log(`🚀 Cargando datos en paralelo...`)
        
        const [contactsResult, contactConversationsResult, nonContactConversationsResult] = await Promise.all([
          this.getContacts(sessionId),
          this.getContactConversations(sessionId, maxContacts, 0),
          this.getNonContactConversations(sessionId, maxNonContacts, 0)
        ])
        
        contacts = contactsResult
        contactConversations = contactConversationsResult
        nonContactConversations = nonContactConversationsResult
        
      } else {
        // Cargar secuencialmente para mejor control
        console.log(`📱 Fase 1: Cargando contactos...`)
        contacts = await this.getContacts(sessionId)
        
        console.log(`👥 Fase 2: Cargando conversaciones de contactos...`)
        contactConversations = await this.getContactConversations(sessionId, maxContacts, 0)
        
        console.log(`📱 Fase 3: Cargando conversaciones no contactos...`)
        nonContactConversations = await this.getNonContactConversations(sessionId, maxNonContacts, 0)
      }
      
      const total = contacts.length + contactConversations.length + nonContactConversations.length
      const loadTime = Date.now() - startTime
      
      console.log(`✅ Carga progresiva completada en ${loadTime}ms: ${total} elementos`)
      
      return { contacts, contactConversations, nonContactConversations, total, loadTime }
      
    } catch (error) {
      console.error('❌ Error en carga progresiva:', error)
      throw error
    }
  },

  // 🔄 NUEVO: Obtener chats de contactos en lotes
  async getContactChatsBatch(sessionId: string, limit: number = 20, offset: number = 0): Promise<Array<{
    chatId: string;
    contactId: string;
    contactName: string;
    phoneNumber: string;
    lastMessage?: string;
    lastMessageTime?: Date;
    unreadCount: number;
    hasUnreadMessages: boolean;
    isContact: boolean;
  }>> {
    console.log(`👥 Obteniendo lotes de chats de contactos: limit=${limit}, offset=${offset}`)
    
    try {
      const response = await api.get<ApiResponse<Array<{
        chatId: string;
        contactId: string;
        contactName: string;
        phoneNumber: string;
        lastMessage?: string;
        lastMessageTime?: Date;
        unreadCount: number;
        hasUnreadMessages: boolean;
        isContact: boolean;
      }>>>(
        `/whatsapp/sessions/${sessionId}/chats/contacts`,
        { params: { limit, offset } }
      )
      
      const chats = response.data.data
      console.log(`✅ Chats de contactos obtenidos: ${chats.length}`)
      
      return chats
    } catch (error) {
      console.error('❌ Error obteniendo chats de contactos:', error)
      return []
    }
  },

  // 🔄 NUEVO: Obtener chats no contactos en lotes
  async getNonContactChatsBatch(sessionId: string, limit: number = 20, offset: number = 0): Promise<Array<{
    chatId: string;
    contactId: string;
    contactName: string;
    phoneNumber: string;
    lastMessage?: string;
    lastMessageTime?: Date;
    unreadCount: number;
    hasUnreadMessages: boolean;
    isContact: boolean;
  }>> {
    console.log(`📱 Obteniendo lotes de chats no contactos: limit=${limit}, offset=${offset}`)
    
    try {
      const response = await api.get<ApiResponse<Array<{
        chatId: string;
        contactId: string;
        contactName: string;
        phoneNumber: string;
        lastMessage?: string;
        lastMessageTime?: Date;
        unreadCount: number;
        hasUnreadMessages: boolean;
        isContact: boolean;
      }>>>(
        `/whatsapp/sessions/${sessionId}/chats/non-contacts`,
        { params: { limit, offset } }
      )
      
      const chats = response.data.data
      console.log(`✅ Chats no contactos obtenidos: ${chats.length}`)
      
      return chats
    } catch (error) {
      console.error('❌ Error obteniendo chats no contactos:', error)
      return []
    }
  },

  // 🔄 NUEVO: Obtener mensajes de un chat específico
  async fetchChatMessages(sessionId: string, chatId: string, limit: number = 50, includeFromMe: boolean = true): Promise<Message[]> {
    console.log(`💬 Obteniendo mensajes del chat ${chatId}: limit=${limit}, includeFromMe=${includeFromMe}`)
    
    try {
      const response = await api.get<ApiResponse<Message[]>>(
        `/whatsapp/sessions/${sessionId}/chats/${chatId}/messages`,
        { params: { limit, includeFromMe } }
      )
      
      const messages = response.data.data
      console.log(`✅ Mensajes obtenidos: ${messages.length}`)
      
      return messages
    } catch (error) {
      console.error('❌ Error obteniendo mensajes del chat:', error)
      return []
    }
  },

  // 🔄 NUEVO: Obtener mensajes de un chat con filtros avanzados
  async fetchChatMessagesAdvanced(
    sessionId: string, 
    chatId: string, 
    options: {
      limit?: number;
      includeFromMe?: boolean;
      fromDate?: Date;
      toDate?: Date;
      messageType?: string;
      searchText?: string;
    } = {}
  ): Promise<Message[]> {
    console.log(`🔍 Obteniendo mensajes avanzados del chat ${chatId}:`, options)
    
    try {
      const params: {
        limit?: number;
        includeFromMe?: boolean;
        fromDate?: string;
        toDate?: string;
        messageType?: string;
        searchText?: string;
      } = {}
      
      if (options.limit !== undefined) params.limit = options.limit
      if (options.includeFromMe !== undefined) params.includeFromMe = options.includeFromMe
      if (options.fromDate) params.fromDate = options.fromDate.toISOString()
      if (options.toDate) params.toDate = options.toDate.toISOString()
      if (options.messageType) params.messageType = options.messageType
      if (options.searchText) params.searchText = options.searchText
      
      const response = await api.get<ApiResponse<Message[]>>(
        `/whatsapp/sessions/${sessionId}/chats/${chatId}/messages/advanced`,
        { params }
      )
      
      const messages = response.data.data
      console.log(`✅ Mensajes avanzados obtenidos: ${messages.length}`)
      
      return messages
    } catch (error) {
      console.error('❌ Error obteniendo mensajes avanzados del chat:', error)
      return []
    }
  },

  // 🔄 NUEVO: Cargar más mensajes de un chat bajo demanda
  async loadChatMessagesOnDemand(sessionId: string, chatId: string, currentLimit: number, additionalLimit: number = 10): Promise<{
    messages: Message[];
    hasMore: boolean;
    totalLoaded: number;
  }> {
    console.log(`📚 Cargando más mensajes del chat ${chatId}: current=${currentLimit}, additional=${additionalLimit}`)
    
    try {
      const response = await api.post<ApiResponse<{
        messages: Message[];
        hasMore: boolean;
        totalLoaded: number;
      }>>(
        `/whatsapp/sessions/${sessionId}/chats/${chatId}/messages/load-more`,
        { currentLimit, additionalLimit }
      )
      
      const result = response.data.data
      console.log(`✅ Mensajes adicionales cargados: ${result.messages.length}, hasMore: ${result.hasMore}`)
      
      return result
    } catch (error) {
      console.error('❌ Error cargando mensajes adicionales:', error)
      return {
        messages: [],
        hasMore: false,
        totalLoaded: currentLimit
      }
    }
  },

  // Autenticación inteligente
  async detectExistingSession(phoneNumber: string): Promise<WhatsAppSession | null> {
    return smartAuthService.detectExistingSession(phoneNumber)
  },

  async linkPhoneToSession(phoneNumber: string, sessionId: string): Promise<boolean> {
    return smartAuthService.linkPhoneToSession(phoneNumber, sessionId)
  },

  // Métodos de caché
  clearConversationCache(sessionId: string): void {
    conversationCache.clearSession(sessionId)
  },

  getCacheStats() {
    return conversationCache.getCacheStats()
  }
}
