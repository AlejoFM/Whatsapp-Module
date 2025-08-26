import { Conversation } from '../types'
import { whatsAppService } from './whatsAppService'

interface LoadStrategy {
  priority: number
  name: string
  description: string
}

interface ConversationBatch {
  conversations: Conversation[]
  source: 'contacts' | 'recent' | 'unread' | 'lazy'
  priority: number
  loadedAt: Date
}

interface ProgressiveLoadResult {
  contacts: Array<{ id: string; name: string; phoneNumber: string; isContact: boolean }>
  contactConversations: Conversation[]
  nonContactConversations: Conversation[]
  total: number
  loadTime: number
}

class IntelligentConversationLoader {
  private loadStrategies: Map<string, LoadStrategy> = new Map()
  private loadedBatches: Map<string, ConversationBatch> = new Map()
  private loadingQueue: Array<() => Promise<void>> = []
  private isProcessing = false

  constructor() {
    this.initializeStrategies()
  }

  private initializeStrategies() {
    this.loadStrategies.set('contacts', {
      priority: 1,
      name: 'Contactos Agregados',
      description: 'Cargar primero conversaciones de contactos ya agregados'
    })

    this.loadStrategies.set('recent', {
      priority: 2,
      name: 'Chats Recientes',
      description: 'Cargar conversaciones con actividad reciente'
    })

    this.loadStrategies.set('unread', {
      priority: 3,
      name: 'No Leídos',
      description: 'Priorizar conversaciones con mensajes no leídos'
    })

    this.loadStrategies.set('lazy', {
      priority: 4,
      name: 'Carga Bajo Demanda',
      description: 'Cargar conversaciones restantes cuando se soliciten'
    })
  }

  // 🎯 ESTRATEGIA PRINCIPAL: Carga inteligente por capas
  async loadConversationsIntelligently(sessionId: string, options: {
    maxContacts?: number
    maxRecent?: number
    maxUnread?: number
    enableLazyLoading?: boolean
  } = {}): Promise<{
    contacts: Conversation[]
    recent: Conversation[]
    unread: Conversation[]
    total: number
    loadTime: number
  }> {
    const startTime = Date.now()
    
    console.log(`🧠 Iniciando carga inteligente para sesión ${sessionId}`)

    try {
      // 🔄 PASO 1: Cargar contactos agregados (más rápido, más confiable)
      const contacts = await this.loadContactsLayer(sessionId, options.maxContacts || 50)
      console.log(`✅ Capa 1 - Contactos cargados: ${contacts.length}`)

      // 🔄 PASO 2: Cargar chats recientes (actividad reciente)
      const recent = await this.loadRecentChatsLayer(sessionId, options.maxRecent || 30)
      console.log(`✅ Capa 2 - Chats recientes cargados: ${recent.length}`)

      // 🔄 PASO 3: Cargar no leídos (prioridad alta)
      const unread = await this.loadUnreadLayer(sessionId, options.maxUnread || 20)
      console.log(`✅ Capa 3 - No leídos cargados: ${unread.length}`)

      // 🔄 PASO 4: Configurar carga lazy para el resto
      if (options.enableLazyLoading) {
        this.setupLazyLoading(sessionId)
      }

      const total = contacts.length + recent.length + unread.length
      const loadTime = Date.now() - startTime

      console.log(`🎯 Carga inteligente completada en ${loadTime}ms: ${total} conversaciones`)

      return { contacts, recent, unread, total, loadTime }

    } catch (error) {
      console.error('❌ Error en carga inteligente:', error)
      throw error
    }
  }

  // 🔄 NUEVO: Carga progresiva usando los nuevos endpoints
  async loadConversationsProgressive(sessionId: string, options: {
    maxContacts?: number
    maxNonContacts?: number
    enableParallel?: boolean
    showProgress?: boolean
  } = {}): Promise<ProgressiveLoadResult> {
    const startTime = Date.now()
    const { maxContacts = 50, maxNonContacts = 100, enableParallel = true, showProgress = true } = options
    
    console.log(`🔄 Iniciando carga progresiva para sesión ${sessionId}`)
    
    if (showProgress) {
      this.showProgressIndicator('Iniciando carga progresiva...')
    }
    
    try {
      let contacts: Array<{ id: string; name: string; phoneNumber: string; isContact: boolean }> = []
      let contactConversations: Conversation[] = []
      let nonContactConversations: Conversation[] = []
      
      if (enableParallel) {
        // Cargar en paralelo para mayor velocidad
        if (showProgress) {
          this.showProgressIndicator('Cargando datos en paralelo...')
        }
        
        console.log(`🚀 Cargando datos en paralelo...`)
        
        const [contactsResult, contactConversationsResult, nonContactConversationsResult] = await Promise.all([
          whatsAppService.getContacts(sessionId),
          whatsAppService.getContactConversations(sessionId, maxContacts, 0),
          whatsAppService.getNonContactConversations(sessionId, maxNonContacts, 0)
        ])
        
        contacts = contactsResult
        contactConversations = contactConversationsResult
        nonContactConversations = nonContactConversationsResult
        
      } else {
        // Cargar secuencialmente para mejor control y progreso visual
        if (showProgress) {
          this.showProgressIndicator('Fase 1: Cargando contactos...')
        }
        console.log(`📱 Fase 1: Cargando contactos...`)
        contacts = await whatsAppService.getContacts(sessionId)
        
        if (showProgress) {
          this.showProgressIndicator('Fase 2: Cargando conversaciones de contactos...')
        }
        console.log(`👥 Fase 2: Cargando conversaciones de contactos...`)
        contactConversations = await whatsAppService.getContactConversations(sessionId, maxContacts, 0)
        
        if (showProgress) {
          this.showProgressIndicator('Fase 3: Cargando conversaciones no contactos...')
        }
        console.log(`📱 Fase 3: Cargando conversaciones no contactos...`)
        nonContactConversations = await whatsAppService.getNonContactConversations(sessionId, maxNonContacts, 0)
      }
      
      const total = contacts.length + contactConversations.length + nonContactConversations.length
      const loadTime = Date.now() - startTime
      
      if (showProgress) {
        this.showProgressIndicator(`Carga completada: ${total} elementos en ${loadTime}ms`)
        setTimeout(() => this.hideProgressIndicator(), 2000)
      }
      
      console.log(`✅ Carga progresiva completada en ${loadTime}ms: ${total} elementos`)
      
      return { contacts, contactConversations, nonContactConversations, total, loadTime }
      
    } catch (error) {
      if (showProgress) {
        this.showProgressIndicator('Error en la carga')
        setTimeout(() => this.hideProgressIndicator(), 3000)
      }
      console.error('❌ Error en carga progresiva:', error)
      throw error
    }
  }

  // 📱 CAPA 1: Contactos agregados (más confiable)
  private async loadContactsLayer(sessionId: string, maxContacts: number): Promise<Conversation[]> {
    try {
      console.log(`📱 Cargando capa de contactos (máx: ${maxContacts})`)
      


      // Si no hay caché, usar el nuevo método de conversaciones de contactos
      const conversations = await whatsAppService.getContactConversations(sessionId, maxContacts, 0)
      


      console.log(`📱 Contactos cargados del backend: ${conversations.length}`)
      return conversations

    } catch (error) {
      console.error('❌ Error cargando contactos:', error)
      return []
    }
  }

  // 🕒 CAPA 2: Chats recientes (actividad reciente)
  private async loadRecentChatsLayer(sessionId: string, maxRecent: number): Promise<Conversation[]> {
    try {
      console.log(`🕒 Cargando capa de chats recientes (máx: ${maxRecent})`)
      
      // Obtener conversaciones ordenadas por última actividad
      const conversations = await whatsAppService.getConversationsRealtime(sessionId, maxRecent * 2, 0)
      
      // Filtrar por actividad reciente (últimos 7 días)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const recent = conversations
        .filter(c => c.lastMessageTime && new Date(c.lastMessageTime) > sevenDaysAgo)
        .sort((a, b) => {
          const aTime = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0
          const bTime = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0
          return bTime - aTime
        })
        .slice(0, maxRecent)

      console.log(`🕒 Chats recientes cargados: ${recent.length}`)
      return recent

    } catch (error) {
      console.error('❌ Error cargando chats recientes:', error)
      return []
    }
  }

  // 📨 CAPA 3: Conversaciones no leídas (prioridad alta)
  private async loadUnreadLayer(sessionId: string, maxUnread: number): Promise<Conversation[]> {
    try {
      console.log(`📨 Cargando capa de no leídos (máx: ${maxUnread})`)
      
      // Obtener conversaciones con mensajes no leídos

      const contacts = await whatsAppService.getContacts(sessionId)
      const contactIds = contacts.map(c => c.id)
      const chats = await whatsAppService.getContactChatsBatch(sessionId, maxUnread * 3, 0)
      const conversations = chats.filter(c => contactIds.includes(c.contactId))
      
      // Mapear chats a objetos Conversation
      const mappedConversations: Conversation[] = conversations.map(chat => ({
        id: chat.chatId,
        sessionId,
        phoneNumber: chat.phoneNumber,
        contactName: chat.contactName,
        lastMessage: chat.lastMessage,
        lastMessageTime: chat.lastMessageTime,
        unreadCount: chat.unreadCount,
        isGroup: false,
        isContact: chat.isContact,
        createdAt: new Date(),
        updatedAt: new Date()
      }))
      
      // Filtrar por mensajes no leídos y ordenar por cantidad
      const unread = mappedConversations
        .filter(c => c.unreadCount > 0)
        .sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0))
        .slice(0, maxUnread)

      console.log(`📨 No leídos cargados: ${unread.length}`)
      return unread

    } catch (error) {
      console.error('❌ Error cargando no leídos:', error)
      return []
    }
  }

  // 🦥 CAPA 4: Carga lazy (bajo demanda)
  private setupLazyLoading(sessionId: string): void {
    console.log(`🦥 Configurando carga lazy para sesión ${sessionId}`)
    
    // Crear un observador de intersección para detectar cuando el usuario llega al final
    this.createIntersectionObserver(sessionId)
    
    // Configurar carga automática cuando se necesite
    this.setupAutoLoad(sessionId)
  }

  // 👁️ Observador de intersección para carga lazy
  private createIntersectionObserver(sessionId: string): void {
    // Este método se implementará en el componente Vue
    console.log(`👁️ Observador de intersección configurado para ${sessionId}`)
  }

  // ⚡ Carga automática cuando se necesite
  private setupAutoLoad(sessionId: string): void {
    // Cargar más conversaciones automáticamente cuando el usuario esté inactivo
    let autoLoadTimeout: NodeJS.Timeout | null = null
    
    const scheduleAutoLoad = () => {
      if (autoLoadTimeout) clearTimeout(autoLoadTimeout)
      
      autoLoadTimeout = setTimeout(async () => {
        console.log(`⏰ Carga automática programada para ${sessionId}`)
        await this.loadMoreConversationsLazy(sessionId)
      }, 30000) // 30 segundos de inactividad
    }

    // Escuchar eventos de actividad del usuario
    const userActivityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    userActivityEvents.forEach(event => {
      document.addEventListener(event, scheduleAutoLoad, { passive: true })
    })
  }

  // 🦥 Cargar más conversaciones de forma lazy
  async loadMoreConversationsLazy(sessionId: string, batchSize: number = 20): Promise<Conversation[]> {
    try {
      console.log(`🦥 Cargando más conversaciones de forma lazy (batch: ${batchSize})`)
      


      // Cargar desde el backend
      const offset = 0

      const contacts = await whatsAppService.getContacts(sessionId)
      const contactIds = contacts.map(c => c.id)

      const chats = await whatsAppService.getContactChatsBatch(sessionId, batchSize, offset)
      const conversations = chats.filter(c => contactIds.includes(c.contactId))
      const nonContactChats = await whatsAppService.getNonContactChatsBatch(sessionId, batchSize, offset)
      const nonContactConversations = nonContactChats.filter(c => !contactIds.includes(c.contactId))

      // Mapear chats a objetos Conversation
      const mappedConversations: Conversation[] = conversations.map(chat => ({
        id: chat.chatId,
        sessionId,
        phoneNumber: chat.phoneNumber,
        contactName: chat.contactName,
        lastMessage: chat.lastMessage,
        lastMessageTime: chat.lastMessageTime,
        unreadCount: chat.unreadCount,
        isGroup: false,
        isContact: chat.isContact,
        createdAt: new Date(),
        updatedAt: new Date()
      }))

      const mappedNonContactConversations: Conversation[] = nonContactConversations.map(chat => ({

        id: chat.chatId,
        sessionId,
        phoneNumber: chat.phoneNumber,
        contactName: chat.contactName,
        lastMessage: chat.lastMessage,
        lastMessageTime: chat.lastMessageTime,
        unreadCount: chat.unreadCount,
        isGroup: false,
        isContact: chat.isContact,
        createdAt: new Date(),
        updatedAt: new Date()
      }))


      const allConversations = [...mappedConversations, ...mappedNonContactConversations]

      console.log(`🦥 No hay nuevas conversaciones para cargar`)
      return allConversations

    } catch (error) {
      console.error('❌ Error en carga lazy:', error)
      return []
    }
  }

  // 📊 Obtener estadísticas de carga
  getLoadStats(sessionId: string): {
    totalLoaded: number
    contactsCount: number
    recentCount: number
    unreadCount: number
    cacheHitRate: number
    averageLoadTime: number
  } {
    const batch = this.loadedBatches.get(sessionId)

    return {
      totalLoaded: 0,
      contactsCount: 0,
      recentCount: 0,
      unreadCount: 0,
      cacheHitRate: 0, // Placeholder
      averageLoadTime: batch ? Date.now() - batch.loadedAt.getTime() : 0
    }
  }

  // 🔄 Métodos de indicador de progreso
  private showProgressIndicator(message: string): void {
    // Crear o actualizar indicador de progreso en el DOM
    let progressElement = document.getElementById('progressive-load-progress')
    
    if (!progressElement) {
      progressElement = document.createElement('div')
      progressElement.id = 'progressive-load-progress'
      progressElement.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50'
      progressElement.style.transition = 'all 0.3s ease'
      document.body.appendChild(progressElement)
    }
    
    progressElement.textContent = message
    progressElement.style.opacity = '1'
    progressElement.style.transform = 'translateY(0)'
    
    console.log(`📊 Progreso: ${message}`)
  }

  private hideProgressIndicator(): void {
    const progressElement = document.getElementById('progressive-load-progress')
    if (progressElement) {
      progressElement.style.opacity = '0'
      progressElement.style.transform = 'translateY(-20px)'
      
      setTimeout(() => {
        if (progressElement.parentNode) {
          progressElement.parentNode.removeChild(progressElement)
        }
      }, 300)
    }
  }

  // 🧹 Limpiar recursos
  cleanup(sessionId: string): void {
    this.loadedBatches.delete(sessionId)
    this.loadingQueue = this.loadingQueue.filter(() => false)
    this.isProcessing = false
    
    // Ocultar indicador de progreso si existe
    this.hideProgressIndicator()
    
    console.log(`🧹 Recursos limpiados para sesión ${sessionId}`)
  }
}

export const intelligentLoader = new IntelligentConversationLoader()
