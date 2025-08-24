import { Module } from 'vuex'
import { Conversation, Message, WhatsAppSession } from '../../types'
import { whatsAppService } from '../../services/whatsAppService'
import { intelligentLoader } from '../../services/intelligentConversationLoader'
import { socketService } from '../../services/socketService'

interface WhatsAppState {
  sessions: WhatsAppSession[]
  conversations: Conversation[]
  contacts: { id: string; name: string; phoneNumber: string; isContact: boolean }[] // 🔄 NUEVO: Lista de contactos para verificar si un número es contacto
  messages: { [conversationId: string]: Message[] }
  currentSession: WhatsAppSession | null
  currentConversation: Conversation | null
  loading: boolean
  error: string | null
  // Nuevas propiedades para paginación
  conversationsPagination: {
    hasMore: boolean
    currentPage: number
    totalLoaded: number
    isLoadingMore: boolean
  }
  // 🔄 NUEVO: Paginación para contactos
  contactsPagination: {
    hasMore: boolean
    currentPage: number
    totalLoaded: number
    isLoadingMore: boolean
  }
  // Estado para progreso de sincronización
  syncProgress: {
    isActive: boolean
    current: number
    total: number
    currentConversation: Conversation | null
  }
  // 🔒 NUEVO: Estado para control de sincronización
  syncControl: {
    isActive: boolean
    queueLength: number
    lastSyncTime: string | null
    canStartNewSync: boolean
  }
}

const whatsapp: Module<WhatsAppState, unknown> = {
  namespaced: true,
  
  state: (): WhatsAppState => ({
    sessions: [],
    conversations: [],
    contacts: [], // 🔄 NUEVO: Inicializar lista de contactos vacía
    messages: {},
    currentSession: null,
    currentConversation: null,
    loading: false,
    error: null,
    // Inicializar paginación
    conversationsPagination: {
      hasMore: true,
      currentPage: 0,
      totalLoaded: 0,
      isLoadingMore: false
    },
    // 🔄 NUEVO: Inicializar paginación de contactos
    contactsPagination: {
      hasMore: true,
      currentPage: 0,
      totalLoaded: 0,
      isLoadingMore: false
    },
    // Inicializar progreso de sincronización
    syncProgress: {
      isActive: false,
      current: 0,
      total: 0,
      currentConversation: null
    },
    // 🔒 Inicializar control de sincronización
    syncControl: {
      isActive: false,
      queueLength: 0,
      lastSyncTime: null,
      canStartNewSync: true
    }
  }),

  mutations: {
    SET_LOADING(state, loading: boolean) {
      state.loading = loading
    },
    SET_ERROR(state, error: string | null) {
      state.error = error
    },
    SET_SESSIONS(state, sessions: WhatsAppSession[]) {
      state.sessions = sessions
    },
    ADD_SESSION(state, session: WhatsAppSession) {
      state.sessions.push(session)
    },
    UPDATE_SESSION(state, updatedSession: WhatsAppSession) {
      const index = state.sessions.findIndex(s => s.id === updatedSession.id)
      if (index !== -1) {
        state.sessions[index] = updatedSession
      }
    },
    SET_CONVERSATIONS(state, conversations: Conversation[]) {
      state.conversations = conversations
    },
    SET_CONTACTS(state, contacts: { id: string; name: string; phoneNumber: string; isContact: boolean }[]) {
      state.contacts = contacts
    },
    ADD_CONVERSATION(state, conversation: Conversation) {
      const exists = state.conversations.find(c => c.id === conversation.id)
      if (!exists) {
        state.conversations.unshift(conversation)
      }
    },
    UPDATE_CONVERSATION(state, updatedConversation: Conversation) {
      const index = state.conversations.findIndex(c => c.id === updatedConversation.id)
      if (index !== -1) {
        // Remover la conversación de su posición actual
        state.conversations.splice(index, 1)
        // Agregar al principio para que aparezca primero (más reciente)
        state.conversations.unshift(updatedConversation)
        
        console.log('🔄 Store: Conversación actualizada y movida al principio', {
          conversationId: updatedConversation.id,
          phoneNumber: updatedConversation.phoneNumber,
          lastMessage: updatedConversation.lastMessage,
          unreadCount: updatedConversation.unreadCount
        })
      }
    },
    SET_MESSAGES(state, { conversationId, messages }: { conversationId: string, messages: Message[] }) {
      state.messages[conversationId] = messages
    },
    ADD_MESSAGE(state, message: Message) {
      // 🔄 NUEVO: Generar conversationId basado en si el mensaje es enviado o recibido
      let conversationId: string
      
      if (message.fromMe) {
        // Si es un mensaje enviado por nosotros, usar 'to' (destinatario)
        // Normalizar el número para remover sufijos como @c.us
        const normalizedTo = normalizePhoneNumber(message.to)
        conversationId = `${message.sessionId}_${normalizedTo}`
        console.log('💾 Store: Mensaje ENVIADO, usando conversationId basado en destinatario:', conversationId)
      } else {
        // Si es un mensaje recibido, usar 'from' (remitente)
        // Normalizar el número para remover sufijos como @c.us
        const normalizedFrom = normalizePhoneNumber(message.from)
        conversationId = `${message.sessionId}_${normalizedFrom}`
        console.log('💾 Store: Mensaje RECIBIDO, usando conversationId basado en remitente:', conversationId)
      }
      
      console.log('💾 Store: Agregando mensaje', {
        messageId: message.id,
        from: message.from,
        to: message.to,
        fromMe: message.fromMe,
        conversationId,
        existingMessages: state.messages[conversationId]?.length || 0
      })
      
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = []
      }
      
      const exists = state.messages[conversationId].find(m => m.id === message.id)
      if (!exists) {
        // 🔄 NUEVO: Crear nueva referencia del array para que Vue detecte el cambio
        const updatedMessages = [message, ...state.messages[conversationId]]
        state.messages[conversationId] = updatedMessages
        
        console.log('✅ Store: Mensaje agregado a conversación', conversationId, 'Total mensajes:', state.messages[conversationId].length)
      } else {
        console.log('⚠️ Store: Mensaje duplicado, no se agregó')
      }
    },
    SET_CURRENT_SESSION(state, session: WhatsAppSession) {
      state.currentSession = session
    },
    SET_CURRENT_CONVERSATION(state, conversation: Conversation) {
      state.currentConversation = conversation
    },
    SET_CONVERSATIONS_PAGINATION(state, pagination: Partial<WhatsAppState['conversationsPagination']>) {
      state.conversationsPagination = { ...state.conversationsPagination, ...pagination }
    },
    // 🔄 NUEVO: Mutación para paginación de contactos
    SET_CONTACTS_PAGINATION(state, pagination: Partial<WhatsAppState['contactsPagination']>) {
      state.contactsPagination = { ...state.contactsPagination, ...pagination }
    },
    
    APPEND_CONVERSATIONS(state, conversations: Conversation[]) {
      // Agregar nuevas conversaciones sin duplicar
      conversations.forEach(newConv => {
        const exists = state.conversations.find(c => c.id === newConv.id)
        if (!exists) {
          state.conversations.push(newConv)
        }
      })
    },
    // 🔄 NUEVO: Mutación para agregar más contactos
    APPEND_CONTACTS(state, contacts: { id: string; name: string; phoneNumber: string; isContact: boolean }[]) {
      // Agregar nuevos contactos sin duplicar
      contacts.forEach(newContact => {
        const exists = state.contacts.find(c => c.id === newContact.id)
        if (!exists) {
          state.contacts.push(newContact)
        }
      })
    },
    
    // Mutaciones para progreso de sincronización
    SET_SYNC_PROGRESS(state, progress: { current: number, total: number, conversation: Conversation }) {
      state.syncProgress = { 
        isActive: true,
        current: progress.current,
        total: progress.total,
        currentConversation: progress.conversation
      }
    },
    CLEAR_SYNC_PROGRESS(state) {
      state.syncProgress = {
        isActive: false,
        current: 0,
        total: 0,
        currentConversation: null
      }
    },
    
    // 🔒 NUEVO: Mutaciones para control de sincronización
    SET_SYNC_CONTROL(state, control: Partial<WhatsAppState['syncControl']>) {
      state.syncControl = { ...state.syncControl, ...control }
    },
    
    UPDATE_SYNC_STATUS(state, { isActive, queueLength, lastSyncTime }: { 
      isActive: boolean, 
      queueLength: number, 
      lastSyncTime: string | null 
    }) {
      state.syncControl.isActive = isActive
      state.syncControl.queueLength = queueLength
      state.syncControl.lastSyncTime = lastSyncTime
      state.syncControl.canStartNewSync = !isActive
    }
  },

  actions: {
    async createSession({ commit }, { clientId, phoneNumber }: { clientId: string, phoneNumber?: string }) {
      try {
        commit('SET_LOADING', true)
        commit('SET_ERROR', null)
        
        const session = await whatsAppService.createSession({ clientId, phoneNumber })
        commit('ADD_SESSION', session)
        
        return session
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error creating session'
        commit('SET_ERROR', errorMessage)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },

    async connectSession({ commit }, sessionId: string) {
      try {
        commit('SET_LOADING', true)
        commit('SET_ERROR', null)
        
        const result = await whatsAppService.connectSession(sessionId)
        commit('UPDATE_SESSION', result.session)
        
        socketService.joinSession(sessionId)
        
        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error connecting session'
        commit('SET_ERROR', errorMessage)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },

    async disconnectSession({ commit }, sessionId: string) {
      try {
        commit('SET_LOADING', true)
        commit('SET_ERROR', null)
        
        await whatsAppService.disconnectSession(sessionId)
        
        socketService.leaveSession(sessionId)
        
        const session = await whatsAppService.getSessionStatus(sessionId)
        commit('UPDATE_SESSION', session)
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error disconnecting session'
        commit('SET_ERROR', errorMessage)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },

    async getConversations({ commit, state }, sessionId: string, resetPagination: boolean = false) {
      try {
        if (resetPagination) {
          commit('SET_CONVERSATIONS_PAGINATION', {
            hasMore: true,
            currentPage: 0,
            totalLoaded: 0,
            isLoadingMore: false
          })
          commit('SET_CONVERSATIONS', [])
        }

        const { currentPage, totalLoaded } = state.conversationsPagination
        const limit = 100 // Aargar más conversaciones por página
        const offset = resetPagination ? 0 : totalLoaded

        commit('SET_LOADING', true)
        commit('SET_ERROR', null)
        
        console.log('📥 Store: Solicitando conversaciones con paginación:', {
          sessionId,
          page: currentPage,
          limit,
          offset,
          totalLoaded
        })
        
        // Intentar obtener del caché primero
        const conversations = await whatsAppService.getConversations(sessionId, limit, offset)
        
        console.log('📥 Store: Conversaciones recibidas (caché/backend):', {
          sessionId,
          count: conversations.length,
          limit,
          offset,
          source: 'caché o backend',
          conversations: conversations.map((c: Conversation) => ({
            id: c.id,
            phoneNumber: c.phoneNumber,
            contactName: c.contactName,
            sessionId: c.sessionId
          }))
        })
        
        // Filtrar conversaciones duplicadas
        const filteredConversations = filterDuplicateConversations(conversations)
        
        if (resetPagination) {
          commit('SET_CONVERSATIONS', filteredConversations)
        } else {
          commit('APPEND_CONVERSATIONS', filteredConversations)
        }
        
        // Actualizar estado de paginación
        const hasMore = conversations.length === limit
        const newTotalLoaded = resetPagination ? filteredConversations.length : totalLoaded + filteredConversations.length
        
        commit('SET_CONVERSATIONS_PAGINATION', {
          hasMore,
          currentPage: currentPage + 1,
          totalLoaded: newTotalLoaded,
          isLoadingMore: false
        })
        
        console.log('🧹 Store: Conversaciones procesadas y paginación actualizada:', {
          original: conversations.length,
          filtradas: filteredConversations.length,
          removidas: conversations.length - filteredConversations.length,
          paginacion: {
            hasMore,
            currentPage: currentPage + 1,
            totalLoaded: newTotalLoaded
          }
        })
        
        return filteredConversations
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error getting conversations'
        commit('SET_ERROR', errorMessage)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },

    async loadMoreConversations({ commit, state }, sessionId: string) {
      if (!state.conversationsPagination.hasMore || state.conversationsPagination.isLoadingMore) {
        return []
      }

      commit('SET_CONVERSATIONS_PAGINATION', { isLoadingMore: true })
      
      try {
        // Cargar más conversaciones directamente del repositorio local
        // sin depender de la sincronización de WhatsApp
        const { totalLoaded } = state.conversationsPagination
        const limit = 100
        const offset = totalLoaded
        
        console.log('📚 Store: Cargando más conversaciones del repositorio local:', {
          sessionId,
          limit,
          offset,
          totalLoaded
        })
        
        const conversations = await whatsAppService.getConversations(sessionId, limit, offset)
        
        if (conversations.length > 0) {
          // Filtrar conversaciones duplicadas
          const filteredConversations = filterDuplicateConversations(conversations)
          
          // Agregar al estado existente
          commit('APPEND_CONVERSATIONS', filteredConversations)
          
          // Actualizar paginación
          const hasMore = conversations.length === limit
          const newTotalLoaded = totalLoaded + filteredConversations.length
          
          commit('SET_CONVERSATIONS_PAGINATION', {
            hasMore,
            currentPage: state.conversationsPagination.currentPage + 1,
            totalLoaded: newTotalLoaded,
            isLoadingMore: false
          })
          
          console.log('✅ Store: Más conversaciones cargadas exitosamente:', {
            nuevas: filteredConversations.length,
            total: newTotalLoaded,
            hasMore
          })
          
          return filteredConversations
        } else {
          // No hay más conversaciones disponibles
          commit('SET_CONVERSATIONS_PAGINATION', {
            hasMore: false,
            isLoadingMore: false
          })
          
          console.log('📭 Store: No hay más conversaciones disponibles')
          return []
        }
      } catch (error) {
        console.error('❌ Store: Error cargando más conversaciones:', error)
        commit('SET_CONVERSATIONS_PAGINATION', { isLoadingMore: false })
        throw error
      }
    },

    async loadAllConversations({ state, dispatch }, sessionId: string) {
      console.log('🔄 Store: Iniciando carga de todas las conversaciones disponibles')
      
      // Resetear paginación y cargar primera página
      await dispatch('getConversations', sessionId)
      
      // Continuar cargando mientras haya más páginas
      while (state.conversationsPagination.hasMore) {
        console.log('📚 Store: Cargando página adicional de conversaciones...')
        await dispatch('loadMoreConversations', sessionId)
        
        // Pequeña pausa para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      console.log('✅ Store: Todas las conversaciones han sido cargadas:', {
        total: state.conversationsPagination.totalLoaded
      })
      
      return state.conversations
    },

    async getConversationsRealtime({ commit }, sessionId: string) {
      try {
        commit('SET_LOADING', true)
        commit('SET_ERROR', null)
        
        const conversations = await whatsAppService.getConversationsRealtime(sessionId)
        
        // Filtrar conversaciones duplicadas ANTES de establecerlas
        const filteredConversations = filterDuplicateConversations(conversations)
        
        commit('SET_CONVERSATIONS', filteredConversations)
        
        console.log('🧹 Conversaciones realtime filtradas:', {
          original: conversations.length,
          filtradas: filteredConversations.length,
          removidas: conversations.length - filteredConversations.length
        })
        
        return filteredConversations
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error getting conversations in real-time'
        commit('SET_ERROR', errorMessage)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },

    async getMessages({ commit }, { sessionId, phoneNumber }: { sessionId: string, phoneNumber: string }) {
      try {
        commit('SET_LOADING', true)
        commit('SET_ERROR', null)
        
        const messages = await whatsAppService.getMessages(sessionId, phoneNumber)
        const conversationId = `${sessionId}_${phoneNumber}`
        commit('SET_MESSAGES', { conversationId, messages })
        
        return messages
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error getting messages'
        commit('SET_ERROR', errorMessage)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },

    async sendMessage({ commit, state }, { sessionId, to, body }: { sessionId: string, to: string, body: string }) {
      try {
        commit('SET_LOADING', true)
        commit('SET_ERROR', null)
        
        console.log('📤 Store: Enviando mensaje', { sessionId, to, body })
        
        const message = await whatsAppService.sendMessage(sessionId, { to, body })
        console.log('✅ Store: Mensaje enviado exitosamente', message)
        
        // Agregar el mensaje al estado
        commit('ADD_MESSAGE', message)
        console.log('💾 Store: Mensaje agregado al estado')
        
        // 🔄 NUEVO: Generar el mismo conversationId que usa ADD_MESSAGE
        const conversationId = `${sessionId}_${to}`
        console.log('🔍 Store: ConversationId generado para actualización:', conversationId)
        
        // Actualizar la conversación correspondiente
        const normalizedPhone = normalizePhoneNumber(to)
        console.log('🔍 Store: Buscando conversación para actualizar:', {
          to,
          normalizedPhone,
          sessionId,
          conversationId,
          totalConversations: state.conversations.length
        })
        
        const existingConversation = state.conversations.find(c => 
          c.sessionId === sessionId && normalizePhoneNumber(c.phoneNumber) === normalizedPhone
        )
        
        if (existingConversation) {
          console.log('✅ Store: Conversación encontrada para actualizar:', {
            id: existingConversation.id,
            phoneNumber: existingConversation.phoneNumber,
            contactName: existingConversation.contactName
          })
          
          // Actualizar la conversación con el nuevo mensaje
          const updatedConversation = {
            ...existingConversation,
            lastMessage: message.body || '',
            lastMessageTime: message.timestamp,
            contactName: formatContactDisplayName(existingConversation.phoneNumber, existingConversation.contactName),
            updatedAt: new Date()
          }
          
          console.log('🔄 Store: Actualizando conversación con mensaje enviado:', {
            conversationId: existingConversation.id,
            lastMessage: updatedConversation.lastMessage,
            lastMessageTime: updatedConversation.lastMessageTime
          })
          
          commit('UPDATE_CONVERSATION', updatedConversation)
          
          // Verificar que la conversación se actualizó correctamente
          console.log('✅ Store: Conversación actualizada exitosamente. Estado final:', {
            totalConversations: state.conversations.length,
            primeraConversacion: state.conversations[0] ? {
              id: state.conversations[0].id,
              phoneNumber: state.conversations[0].phoneNumber,
              lastMessage: state.conversations[0].lastMessage,
              lastMessageTime: state.conversations[0].lastMessageTime
            } : null
          })
        } else {
          console.log('❌ Store: No se encontró conversación para actualizar:', {
            normalizedPhone,
            sessionId,
            availableConversations: state.conversations.map(c => ({
              id: c.id,
              phoneNumber: c.phoneNumber,
              sessionId: c.sessionId
            }))
          })
        }
        
        return message
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error sending message'
        commit('SET_ERROR', errorMessage)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },

    async loadSessions({ commit }) {
      try {
        commit('SET_LOADING', true)
        commit('SET_ERROR', null)
        
        const sessions = await whatsAppService.getAllSessions()
        commit('SET_SESSIONS', sessions)
        
        return sessions
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error loading sessions'
        commit('SET_ERROR', errorMessage)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },

    setCurrentSession({ commit }, session: WhatsAppSession) {
      commit('SET_CURRENT_SESSION', session)
    },

    setCurrentConversation({ commit }, conversation: Conversation) {
      commit('SET_CURRENT_CONVERSATION', conversation)
    },

    // Autenticación inteligente
    async detectExistingSession({ commit }, phoneNumber: string) {
      try {
        commit('SET_LOADING', true)
        commit('SET_ERROR', null)
        
        console.log(`🔍 Detectando sesión existente para ${phoneNumber}`)
        const existingSession = await whatsAppService.detectExistingSession(phoneNumber)
        
        if (existingSession) {
          console.log(`✅ Sesión existente detectada: ${existingSession.id}`)
          commit('SET_CURRENT_SESSION', existingSession)
          return existingSession
        } else {
          console.log(`❌ No se encontró sesión existente para ${phoneNumber}`)
          return null
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error detecting existing session'
        commit('SET_ERROR', errorMessage)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },

    async linkPhoneToSession({ commit }, { phoneNumber, sessionId }: { phoneNumber: string, sessionId: string }) {
      try {
        commit('SET_LOADING', true)
        commit('SET_ERROR', null)
        
        console.log(`🔗 Vinculando ${phoneNumber} a sesión ${sessionId}`)
        const success = await whatsAppService.linkPhoneToSession(phoneNumber, sessionId)
        
        if (success) {
          console.log(`✅ Número vinculado exitosamente`)
          return true
        } else {
          console.log(`❌ No se pudo vincular el número`)
          return false
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error linking phone to session'
        commit('SET_ERROR', errorMessage)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },

    // Métodos de caché
    clearConversationCache(_, sessionId: string) {
      whatsAppService.clearConversationCache(sessionId)
      console.log(`🗑️ Caché de conversaciones limpiado para sesión ${sessionId}`)
    },

    getCacheStats() {
      return whatsAppService.getCacheStats()
    },

    // 🧠 Carga inteligente de conversaciones
    async loadConversationsIntelligently({ commit }, sessionId: string) {
      try {
        commit('SET_LOADING', true)
        commit('SET_ERROR', null)
        
        console.log('🧠 Store: Iniciando carga inteligente de conversaciones')
        
        // Usar el cargador inteligente
        const result = await intelligentLoader.loadConversationsIntelligently(sessionId, {
          maxContacts: 50,      // Máximo 50 contactos
          maxRecent: 30,        // Máximo 30 chats recientes
          maxUnread: 20,        // Máximo 20 no leídos
          enableLazyLoading: true // Habilitar carga lazy
        })
        
        // Combinar todas las conversaciones
        const allConversations = [
          ...result.contacts,
          ...result.recent,
          ...result.unread
        ]
        
        // Filtrar duplicados
        const filteredConversations = filterDuplicateConversations(allConversations)
        
        // Establecer conversaciones en el estado
        commit('SET_CONVERSATIONS', filteredConversations)
        
        // Actualizar paginación
        commit('SET_CONVERSATIONS_PAGINATION', {
          hasMore: true, // Siempre puede haber más con carga lazy
          currentPage: 1,
          totalLoaded: filteredConversations.length,
          isLoadingMore: false
        })
        
        console.log('✅ Store: Carga inteligente completada:', {
          contacts: result.contacts.length,
          recent: result.recent.length,
          unread: result.unread.length,
          total: result.total,
          loadTime: result.loadTime,
          filtered: filteredConversations.length
        })
        
        return filteredConversations
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error en carga inteligente'
        commit('SET_ERROR', errorMessage)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },

    // 🔄 NUEVO: Carga progresiva de conversaciones usando los nuevos endpoints
    async loadConversationsProgressively({ commit }, sessionId: string) {
      try {
        commit('SET_LOADING', true)
        commit('SET_ERROR', null)
        
        console.log('🔄 Store: Iniciando carga progresiva de conversaciones')
        
        // Usar el nuevo método del servicio de WhatsApp
        const result = await whatsAppService.loadConversationsProgressive(sessionId, {
          maxContacts: 100,           // Máximo 100 contactos
          maxNonContacts: 200,        // Máximo 200 conversaciones no contactos
          enableParallel: true        // Cargar en paralelo para mayor velocidad
        })
        
        console.log('✅ Store: Carga progresiva completada:', {
          contacts: result.contacts.length,
          contactConversations: result.contactConversations.length,
          nonContactConversations: result.nonContactConversations.length,
          total: result.total,
          loadTime: result.loadTime
        })
        
        // Retornar el resultado completo para que el componente lo maneje
        return result
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error en carga progresiva'
        commit('SET_ERROR', errorMessage)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },

    // 🔄 NUEVO: Métodos individuales para testing y uso directo
    async getContacts({ commit, state }, { sessionId, resetPagination = false }: { sessionId: string, resetPagination?: boolean }) {
      try {
        commit('SET_LOADING', true)
        commit('SET_ERROR', null)
        
        // 🔄 NUEVO: Resetear paginación si es necesario
        if (resetPagination) {
          commit('SET_CONTACTS_PAGINATION', {
            hasMore: true,
            currentPage: 0,
            totalLoaded: 0,
            isLoadingMore: false
          })
          commit('SET_CONTACTS', [])
        }

        const { currentPage, totalLoaded } = state.contactsPagination
        const limit = 50 // Cargar 50 contactos por página
        const offset = resetPagination ? 0 : totalLoaded

        console.log('👥 Store: Obteniendo contactos con paginación:', {
          sessionId,
          page: currentPage,
          limit,
          offset,
          totalLoaded
        })
        
        const contacts = await whatsAppService.getContacts(sessionId, limit, offset)
        
        console.log('👥 Store: Contactos recibidos:', {
          sessionId,
          count: contacts.length,
          limit,
          offset,
          source: 'backend'
        })
        
        // 🔄 NUEVO: Actualizar el store con los contactos
        if (resetPagination) {
          commit('SET_CONTACTS', contacts)
        } else {
          commit('APPEND_CONTACTS', contacts)
        }
        
        // 🔄 NUEVO: Actualizar estado de paginación
        const hasMore = contacts.length === limit
        const newTotalLoaded = resetPagination ? contacts.length : totalLoaded + contacts.length
        
        commit('SET_CONTACTS_PAGINATION', {
          hasMore,
          currentPage: currentPage + 1,
          totalLoaded: newTotalLoaded,
          isLoadingMore: false
        })
        
        console.log('✅ Store: Contactos obtenidos y paginación actualizada:', {
          original: contacts.length,
          paginacion: {
            hasMore,
            currentPage: currentPage + 1,
            totalLoaded: newTotalLoaded
          }
        })
        
        return contacts
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error obteniendo contactos'
        commit('SET_ERROR', errorMessage)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },

    // 🔄 NUEVO: Cargar más contactos
    async loadMoreContacts({ commit, state }, sessionId: string) {
      if (!state.contactsPagination.hasMore || state.contactsPagination.isLoadingMore) {
        return []
      }

      commit('SET_CONTACTS_PAGINATION', { isLoadingMore: true })
      
      try {
        const { totalLoaded } = state.contactsPagination
        const limit = 50
        const offset = totalLoaded
        
        console.log('📚 Store: Cargando más contactos:', {
          sessionId,
          limit,
          offset,
          totalLoaded
        })
        
        const contacts = await whatsAppService.getContacts(sessionId, limit, offset)
        
        // Agregar nuevos contactos al final
        commit('APPEND_CONTACTS', contacts)
        
        // Actualizar estado de paginación
        const hasMore = contacts.length === limit
        const newTotalLoaded = totalLoaded + contacts.length
        
        commit('SET_CONTACTS_PAGINATION', {
          hasMore,
          currentPage: state.contactsPagination.currentPage + 1,
          totalLoaded: newTotalLoaded,
          isLoadingMore: false
        })
        
        console.log('✅ Store: Más contactos cargados:', {
          nuevos: contacts.length,
          total: newTotalLoaded,
          hasMore
        })
        
        return contacts
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error cargando más contactos'
        commit('SET_ERROR', errorMessage)
        throw error
      } finally {
        commit('SET_CONTACTS_PAGINATION', { isLoadingMore: false })
      }
    },

    async getContactConversations({ commit }, sessionId: string) {
      try {
        commit('SET_LOADING', true)
        commit('SET_ERROR', null)
        
        console.log('💬 Store: Obteniendo conversaciones de contactos')
        const conversations = await whatsAppService.getContactConversations(sessionId)
        
        console.log('✅ Store: Conversaciones de contactos obtenidas:', conversations.length)
        return conversations
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error obteniendo conversaciones de contactos'
        commit('SET_ERROR', errorMessage)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },

    async getNonContactConversations({ commit }, sessionId: string) {
      try {
        commit('SET_LOADING', true)
        commit('SET_ERROR', null)
        
        console.log('📱 Store: Obteniendo conversaciones no contactos')
        const conversations = await whatsAppService.getNonContactConversations(sessionId)
        
        console.log('✅ Store: Conversaciones no contactos obtenidas:', conversations.length)
        return conversations
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error obteniendo conversaciones no contactos'
        commit('SET_ERROR', errorMessage)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },

    // 🔄 NUEVO: Métodos para carga por lotes
    async getContactChatsBatch({ commit }, { sessionId, limit = 50, offset = 0 }) {
      try {
        commit('SET_LOADING', true)
        commit('SET_ERROR', null)
        
        console.log('💬 Store: Obteniendo conversaciones de contactos por lotes:', { limit, offset })
        const conversations = await whatsAppService.getContactChatsBatch(sessionId, limit, offset)
        
        console.log('✅ Store: Conversaciones de contactos por lotes obtenidas:', conversations.length)
        return conversations
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error obteniendo conversaciones de contactos por lotes'
        commit('SET_ERROR', errorMessage)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },

    async getNonContactChatsBatch({ commit }, { sessionId, limit = 50, offset = 0 }) {
      try {
        commit('SET_LOADING', true)
        commit('SET_ERROR', null)
        
        console.log('📱 Store: Obteniendo conversaciones no contactos por lotes:', { limit, offset })
        const conversations = await whatsAppService.getNonContactChatsBatch(sessionId, limit, offset)
        
        console.log('✅ Store: Conversaciones no contactos por lotes obtenidas:', conversations.length)
        return conversations
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error obteniendo conversaciones no contactos por lotes'
        commit('SET_ERROR', errorMessage)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },



    // 🔄 NUEVO: Obtener mensajes de un chat específico
    async fetchChatMessages({ commit }, { sessionId, chatId, limit = 2, includeFromMe = true }: { sessionId: string, chatId: string, limit?: number, includeFromMe?: boolean }) {
      try {
        commit('SET_LOADING', true)
        commit('SET_ERROR', null)
        
        console.log('💬 Store: Obteniendo mensajes del chat')
        const messages = await whatsAppService.fetchChatMessages(sessionId, chatId, limit, includeFromMe)
        
        console.log('✅ Store: Mensajes obtenidos:', messages.length)
        return messages
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error obteniendo mensajes del chat'
        commit('SET_ERROR', errorMessage)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },

    // 🔄 NUEVO: Cargar más mensajes de un chat bajo demanda
    async loadChatMessagesOnDemand({ commit }, { sessionId, chatId, currentLimit, additionalLimit = 10 }: { sessionId: string, chatId: string, currentLimit: number, additionalLimit?: number }) {
      try {
        commit('SET_LOADING', true)
        commit('SET_ERROR', null)
        
        console.log('📚 Store: Cargando más mensajes del chat')
        const result = await whatsAppService.loadChatMessagesOnDemand(sessionId, chatId, currentLimit, additionalLimit)
        
        console.log('✅ Store: Mensajes adicionales cargados:', result.messages.length)
        return result
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error cargando mensajes adicionales'
        commit('SET_ERROR', errorMessage)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },

    // 🔄 NUEVO: Métodos para gestión de caché
    async refreshConversationsCache({ commit }, sessionId: string) {
      try {
        commit('SET_LOADING', true)
        commit('SET_ERROR', null)
        
        console.log('🔄 Store: Refrescando caché de conversaciones')
        
        // Limpiar caché y recargar
        whatsAppService.clearConversationCache(sessionId)
        
        // Recargar conversaciones
        const result = await whatsAppService.loadConversationsProgressive(sessionId, {
          maxContacts: 100,
          maxNonContacts: 200,
          enableParallel: true
        })
        
        // Actualizar estado
        commit('SET_CONVERSATIONS', [...result.contactConversations, ...result.nonContactConversations])
        
        console.log('✅ Store: Caché refrescado')
        return result
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error refrescando caché'
        commit('SET_ERROR', errorMessage)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },

    async clearConversationsCache({ commit }, sessionId: string) {
      try {
        commit('SET_LOADING', true)
        commit('SET_ERROR', null)
        
        console.log('🗑️ Store: Limpiando caché de conversaciones')
        
        // Limpiar caché
        whatsAppService.clearConversationCache(sessionId)
        
        // Limpiar estado
        commit('SET_CONVERSATIONS', [])
        commit('SET_CONVERSATIONS_PAGINATION', {
          hasMore: true,
          currentPage: 0,
          totalLoaded: 0,
          isLoadingMore: false
        })
        
        console.log('✅ Store: Caché limpiado')
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error limpiando caché'
        commit('SET_ERROR', errorMessage)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },

    // 🦥 Cargar más conversaciones de forma lazy
    async loadMoreConversationsLazy({ commit, state }, sessionId: string) {
      if (state.conversationsPagination.isLoadingMore) {
        return []
      }
      
      try {
        commit('SET_CONVERSATIONS_PAGINATION', { isLoadingMore: true })
        
        console.log('🦥 Store: Cargando más conversaciones de forma lazy')
        
        // Usar el cargador inteligente para carga lazy
        const newConversations = await intelligentLoader.loadMoreConversationsLazy(sessionId, 20)
        
        if (newConversations.length > 0) {
          // Agregar al estado existente
          commit('APPEND_CONVERSATIONS', newConversations)
          
          // Actualizar paginación
          const newTotal = state.conversationsPagination.totalLoaded + newConversations.length
          commit('SET_CONVERSATIONS_PAGINATION', {
            totalLoaded: newTotal,
            isLoadingMore: false
          })
          
          console.log('✅ Store: Conversaciones lazy cargadas:', {
            nuevas: newConversations.length,
            total: newTotal
          })
          
          return newConversations
        } else {
          // No hay más conversaciones
          commit('SET_CONVERSATIONS_PAGINATION', {
            hasMore: false,
            isLoadingMore: false
          })
          
          console.log('📭 Store: No hay más conversaciones para cargar')
          return []
        }
        
      } catch (error) {
        console.error('❌ Store: Error en carga lazy:', error)
        commit('SET_CONVERSATIONS_PAGINATION', { isLoadingMore: false })
        throw error
      }
    },

    // 📊 Obtener estadísticas de carga inteligente
    getIntelligentLoadStats(_, sessionId: string) {
      return intelligentLoader.getLoadStats(sessionId)
    },

    // WebSocket event handlers
    handleMessageReceived({ commit, state }, message: Message) {
      console.log('🔄 Store: Procesando handleMessageReceived', {
        messageId: message.id,
        from: message.from,
        body: message.body?.substring(0, 50) + '...',
        sessionId: message.sessionId
      });
      
      // Agregar el mensaje al estado
      commit('ADD_MESSAGE', message)
      
      // Buscar conversación existente por número normalizado
      const normalizedPhone = normalizePhoneNumber(message.from)
      console.log('🔍 Store: Buscando conversación para número normalizado:', {
        originalPhone: message.from,
        normalizedPhone,
        sessionId: message.sessionId,
        totalConversations: state.conversations.length
      })
      
      const existingConversation = state.conversations.find(c => 
        c.sessionId === message.sessionId && normalizePhoneNumber(c.phoneNumber) === normalizedPhone
      )
      
      if (existingConversation) {
        console.log('✅ Store: Conversación existente encontrada:', {
          id: existingConversation.id,
          phoneNumber: existingConversation.phoneNumber,
          contactName: existingConversation.contactName
        })
        
        // Actualizar la conversación existente
        const updatedConversation = {
          ...existingConversation,
          lastMessage: message.body || '',
          lastMessageTime: message.timestamp,
          unreadCount: (existingConversation.unreadCount || 0) + 1,
          updatedAt: new Date()
        }
        
        console.log('🔄 Store: Actualizando conversación existente', {
          conversationId: existingConversation.id,
          phoneNumber: existingConversation.phoneNumber,
          contactName: existingConversation.contactName,
          unreadCount: updatedConversation.unreadCount,
          lastMessage: updatedConversation.lastMessage
        })
        
        commit('UPDATE_CONVERSATION', updatedConversation)
      } else {
        console.log('❌ Store: No se encontró conversación existente para:', {
          normalizedPhone,
          sessionId: message.sessionId,
          availableConversations: state.conversations.map(c => ({
            id: c.id,
            phoneNumber: c.phoneNumber,
            sessionId: c.sessionId
          }))
        })
        
        // Crear nueva conversación privada si no existe
        if (message.from.endsWith('@c.us')) {
          console.log('🆕 Store: Creando nueva conversación privada para mensaje recibido')
          
          // 🔄 NUEVO: Verificar si es un contacto existente
          const isExistingContact = state.contacts && state.contacts.some(contact => 
            normalizePhoneNumber(contact.phoneNumber) === normalizedPhone
          )
          
          const newConversation: Conversation = {
            id: `${message.sessionId}_${normalizedPhone}`,
            sessionId: message.sessionId,
            phoneNumber: message.from,
            contactName: isExistingContact ? 
              (state.contacts?.find(c => normalizePhoneNumber(c.phoneNumber) === normalizedPhone)?.name || formatContactDisplayName(message.from)) :
              formatContactDisplayName(message.from),
            lastMessage: message.body || '',
            lastMessageTime: message.timestamp,
            unreadCount: 1,
            isGroup: false,
            isContact: isExistingContact, // Marcar como contacto si existe
            createdAt: new Date(),
            updatedAt: new Date()
          }
          
          console.log('✅ Store: Nueva conversación creada:', {
            id: newConversation.id,
            phoneNumber: newConversation.phoneNumber,
            contactName: newConversation.contactName,
            isContact: newConversation.isContact
          })
          
          commit('ADD_CONVERSATION', newConversation)
        }
      }
      
      console.log('✅ Store: Mensaje procesado y conversación actualizada');
      
      // 🔄 NUEVO: Log adicional para verificar el estado final
      console.log('📊 Store: Estado final después de procesar mensaje:', {
        totalConversations: state.conversations.length,
        totalMessages: Object.keys(state.messages).length,
        conversationsUpdated: state.conversations.slice(0, 3).map(c => ({
          id: c.id,
          phoneNumber: c.phoneNumber,
          lastMessage: c.lastMessage,
          unreadCount: c.unreadCount
        }))
      });
    },

    handleSessionStatusChanged({ commit }, session: WhatsAppSession) {
      commit('UPDATE_SESSION', session)
    },

    handleConnectionStatusChanged({ commit }, { sessionId, isConnected }: { sessionId: string, isConnected: boolean }) {
      commit('UPDATE_SESSION', { id: sessionId, isConnected, isAuthenticated: isConnected } as WhatsAppSession)
    },

    handleNewConversation({ commit, state }, { sessionId, conversation }: { sessionId: string, conversation: Conversation }) {
      if (state.currentSession?.id === sessionId) {
        commit('ADD_CONVERSATION', conversation)
      }
    },

    handleConversationUpdated({ commit, state }, { sessionId, conversation }: { sessionId: string, conversation: Conversation }) {
      if (state.currentSession?.id === sessionId) {
        commit('UPDATE_CONVERSATION', conversation)
      }
    },

    handleConversationsSynced({ commit, state }, { sessionId, conversations }: { sessionId: string, conversations: Conversation[] }) {
      const currentSessionId = state.currentSession?.id
      if (currentSessionId === sessionId) {
        commit('SET_CONVERSATIONS', conversations)
        console.log(`Conversaciones sincronizadas para la sesión ${sessionId}:`, conversations.length)
      } else {
        console.log(`Ignorando conversaciones de sesión ${sessionId} (sesión actual: ${currentSessionId})`)
      }
    },

    handleSyncProgress({ commit, state }, { sessionId, progress }: { sessionId: string, progress: { current: number, total: number, conversation: Conversation } }) {
      const currentSessionId = state.currentSession?.id
      if (currentSessionId === sessionId) {
        // Actualizar conversación individual en tiempo real
        commit('UPDATE_CONVERSATION', progress.conversation)
        
        // Actualizar progreso de sincronización
        commit('SET_SYNC_PROGRESS', progress)
        
        // Mostrar indicador de progreso
        console.log(`🔄 Sincronizando conversación ${progress.current}/${progress.total}: ${progress.conversation.phoneNumber}`)
        
        // Si se completó la sincronización, limpiar progreso después de 2 segundos
        if (progress.current >= progress.total) {
          setTimeout(() => {
            commit('CLEAR_SYNC_PROGRESS')
          }, 2000)
        }
      }
    },

    // Acción para forzar sincronización completa
    async forceFullSync({ commit }, sessionId: string) {
      try {
        commit('SET_LOADING', true)
        commit('SET_ERROR', null)
        
        // Llamar al endpoint de sincronización completa
        const response = await fetch(`/api/whatsapp/sessions/${sessionId}/force-full-sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }
        
        const result = await response.json()
        console.log('✅ Sincronización completa iniciada:', result)
        
        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error en sincronización completa'
        commit('SET_ERROR', errorMessage)
        console.error('❌ Error en sincronización completa:', error)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    // 🔒 NUEVO: Consultar estado de sincronización
    async getSyncStatus({ commit }, sessionId: string) {
      try {
        // Llamar al endpoint para obtener estadísticas de sincronización
        const response = await fetch(`/api/whatsapp/sessions/${sessionId}/sync-status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`)
        }
        
        const syncStats = await response.json()
        console.log('🔍 Estado de sincronización obtenido:', syncStats)
        
        // Actualizar el estado del store
        commit('UPDATE_SYNC_STATUS', {
          isActive: syncStats.isActive,
          queueLength: syncStats.queueLength,
          lastSyncTime: syncStats.lastSyncTime
        })
        
        return syncStats
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error consultando estado de sincronización'
        commit('SET_ERROR', errorMessage)
        console.error('❌ Error consultando estado de sincronización:', error)
        throw error
      }
    },
    
    // 🔒 NUEVO: Verificar si se puede iniciar sincronización
    async checkSyncAvailability({ }, sessionId: string) {
      try {
        await this.dispatch('whatsapp/getSyncStatus', sessionId)
        return true
      } catch (error) {
        console.error('❌ Error verificando disponibilidad de sincronización:', error)
        return false
      }
    }
  },

  getters: {
    connectedSessions: (state) => state.sessions.filter(s => s.isConnected),
    disconnectedSessions: (state) => state.sessions.filter(s => !s.isConnected),
    sessionById: (state) => (id: string) => state.sessions.find(s => s.id === id),
    conversationById: (state) => (id: string) => state.conversations.find(c => c.id === id),
    messagesByConversation: (state) => (sessionId: string, phoneNumber: string) => {
      const conversationId = `${sessionId}_${phoneNumber}`
      const messages = state.messages[conversationId] || []
      
      console.log('🔍 Store: Obteniendo mensajes para conversación', {
        sessionId,
        phoneNumber,
        conversationId,
        messageCount: messages.length
      })
      
      const sortedMessages = messages.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime()
        const timeB = new Date(b.timestamp).getTime()
        return timeB - timeA
      }).reverse()
      
      console.log('📋 Store: Mensajes ordenados retornados', sortedMessages.length)
      return sortedMessages
    },
    
    // Obtener conversaciones ordenadas por última actividad (más reciente primero)
    conversationsByActivity: (state) => (sessionId: string) => {
      const sessionConversations = state.conversations.filter(c => c.sessionId === sessionId)
      
      return sessionConversations.sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0
        return timeB - timeA // Más reciente primero
      })
    },
    
    // Getters para paginación
    canLoadMoreConversations: (state) => state.conversationsPagination.hasMore && !state.conversationsPagination.isLoadingMore,
    
    // 🔄 NUEVO: Getter para canLoadMore (compatibilidad con el componente)
    canLoadMore: (state) => state.conversationsPagination.hasMore && !state.conversationsPagination.isLoadingMore,
    
    // Getters para sincronización
    conversationsPaginationInfo: (state) => state.conversationsPagination,
    
    // 🔄 NUEVO: Getters para paginación de contactos
    canLoadMoreContacts: (state) => state.contactsPagination.hasMore && !state.contactsPagination.isLoadingMore,
    contactsPaginationInfo: (state) => state.contactsPagination,
    
    // 🔒 NUEVO: Getters para control de sincronización
    syncControlInfo: (state) => state.syncControl,
    canStartSync: (state) => state.syncControl.canStartNewSync,
    syncQueueLength: (state) => state.syncControl.queueLength,
    lastSyncTime: (state) => state.syncControl.lastSyncTime
  }
}

// Función para filtrar conversaciones duplicadas y solo chats privados
function filterDuplicateConversations(conversations: Conversation[]): Conversation[] {
  console.log('🧹 Filtrando conversaciones duplicadas y solo chats privados...')
  
  // Filtrar solo conversaciones privadas (@c.us) y mantener grupos si no hay conversaciones privadas
  const privateConversations = conversations.filter(conv => {
    const isPrivate = conv.phoneNumber.endsWith('@c.us')
    const isGroup = conv.phoneNumber.endsWith('@g.us')
    
    // Si es grupo, solo mantenerlo si no hay conversaciones privadas
    if (isGroup) {
      const hasPrivateConversations = conversations.some(c => c.phoneNumber.endsWith('@c.us'))
      if (hasPrivateConversations) {
        console.log(`🚫 Ignorando conversación de grupo (hay conversaciones privadas): ${conv.phoneNumber}`)
        return false
      }
    }
    
    return isPrivate || isGroup
  })
  
  console.log(`🔒 Conversaciones válidas encontradas: ${privateConversations.length} de ${conversations.length}`)
  
  const filtered: Conversation[] = []
  const phoneMap = new Map<string, Conversation>()
  
  privateConversations.forEach(conv => {
    // Normalizar número de teléfono
    const normalizedPhone = normalizePhoneNumber(conv.phoneNumber)
    
    // Aplicar formateo de nombre de contacto
    const formattedConversation = {
      ...conv,
      contactName: formatContactDisplayName(conv.phoneNumber, conv.contactName)
    }
    
    if (phoneMap.has(normalizedPhone)) {
      const existing = phoneMap.get(normalizedPhone)!
      
      // Estrategia más conservadora: mantener ambas conversaciones si tienen IDs diferentes
      if (existing.id !== conv.id) {
        // Si tienen IDs diferentes, mantener ambas (pueden ser de diferentes sesiones o momentos)
        console.log(`🔄 Manteniendo conversación adicional con ID diferente:`, {
          existente: existing.id,
          nueva: conv.id,
          phoneNumber: normalizedPhone
        })
        filtered.push(formattedConversation)
      } else {
        // Mismo ID, actualizar si es más reciente
        const existingTime = existing.lastMessageTime ? new Date(existing.lastMessageTime).getTime() : 0
        const currentTime = conv.lastMessageTime ? new Date(conv.lastMessageTime).getTime() : 0
        
        if (currentTime > existingTime) {
          console.log(`🔄 Actualizando conversación existente con datos más recientes:`, {
            id: conv.id,
            phoneNumber: normalizedPhone
          })
          const index = filtered.findIndex(c => c.id === existing.id)
          if (index !== -1) {
            filtered[index] = formattedConversation
          }
        }
      }
    } else {
      // Primera vez que vemos este número
      phoneMap.set(normalizedPhone, formattedConversation)
      filtered.push(formattedConversation)
    }
  })
  
  console.log(`🧹 Filtrado completado: ${conversations.length} → ${filtered.length} conversaciones válidas`)
  return filtered
}

// Función helper para normalizar números de teléfono
function normalizePhoneNumber(phone: string): string {
  console.log('🔧 Normalizando número:', { original: phone })
  
  // Remover sufijos comunes de WhatsApp
  let normalized = phone.replace(/@c\.us$/, '')
  normalized = normalized.replace(/@s\.whatsapp\.net$/, '')
  normalized = normalized.replace(/@g\.us$/, '')
  
  console.log('🔧 Después de remover sufijos:', { normalized })
  
  // Remover caracteres no numéricos excepto + y -
  normalized = normalized.replace(/[^\d+\-]/g, '')
  
  console.log('🔧 Después de limpiar caracteres:', { normalized })
  
  // Asegurar que tenga el formato correcto
  if (normalized.startsWith('+')) {
    // Mantener el + al inicio
    normalized = '+' + normalized.substring(1).replace(/[^\d]/g, '')
  } else if (normalized.startsWith('54')) {
    // Agregar + para números argentinos
    normalized = '+' + normalized
  } else if (normalized.length === 10 && !normalized.startsWith('+')) {
    // Agregar +54 para números argentinos de 10 dígitos
    normalized = '+' + normalized
  }
  
  console.log('📱 Número normalizado final:', { original: phone, normalized })
  return normalized
}

// Función para formatear nombres de contacto de manera legible
function formatContactDisplayName(phoneNumber: string, contactName?: string): string {
  console.log('🎨 Formateando nombre de contacto:', { phoneNumber, contactName })
  
  // Si hay un nombre de contacto y es diferente al número, usarlo
  if (contactName && contactName !== phoneNumber && !phoneNumber.includes('@')) {
    console.log('✅ Usando nombre de contacto agendado:', contactName)
    return contactName
  }
  
  // Si no hay nombre o es igual al número, formatear el número
  const normalized = normalizePhoneNumber(phoneNumber)
  
  // Formatear número según el país (solo los que importan)
  const formatted = formatPhoneNumberByCountry(normalized)
  
  console.log('📱 Número formateado por país:', { original: phoneNumber, normalized, formatted })
  return formatted
}

// Función para formatear números de teléfono según el país (solo los relevantes)
function formatPhoneNumberByCountry(normalized: string): string {
  // Argentina (+54) - Formato: +54 - 9 - 11 - xxxx-xxxx
  if (normalized.startsWith('+54')) {
    const countryCode = normalized.substring(0, 3)  // +54
    const mobilePrefix = normalized.substring(3, 4) // 9
    const areaCode = normalized.substring(4, 6)     // 11, 15, etc.
    const firstPart = normalized.substring(6, 10)   // xxxx
    const secondPart = normalized.substring(10, 14) // xxxx
    
    return `${countryCode} - ${mobilePrefix}  ${areaCode}  ${firstPart}-${secondPart}`
  }
  
  // Chile (+56) - Formato: +56 - 9 - xxxx-xxxx
  if (normalized.startsWith('+56')) {
    const countryCode = normalized.substring(0, 3)  // +56
    const mobilePrefix = normalized.substring(3, 4) // 9
    const firstPart = normalized.substring(4, 8)    // xxxx
    const secondPart = normalized.substring(8, 12)  // xxxx
    
    return `${countryCode} - ${mobilePrefix} - ${firstPart}-${secondPart}`
  }
  
  // Uruguay (+598) - Formato: +598 - 9x - xxx-xxxx
  if (normalized.startsWith('+598')) {
    const countryCode = normalized.substring(0, 4)  // +598
    const mobilePrefix = normalized.substring(4, 6) // 9x
    const firstPart = normalized.substring(6, 9)    // xxx
    const secondPart = normalized.substring(9, 13)  // xxxx
    
    return `${countryCode} - ${mobilePrefix} - ${firstPart}-${secondPart}`
  }
  
  // Perú (+51) - Formato: +51 - 9xx - xxx-xxx
  if (normalized.startsWith('+51')) {
    const countryCode = normalized.substring(0, 3)  // +51
    const mobilePrefix = normalized.substring(3, 6) // 9xx
    const firstPart = normalized.substring(6, 9)    // xxx
    const secondPart = normalized.substring(9, 12)  // xxx
    
    return `${countryCode} - ${mobilePrefix} - ${firstPart}-${secondPart}`
  }
  
  // Paraguay (+595) - Formato: +595 - 9xx - xxx-xxx
  if (normalized.startsWith('+595')) {
    const countryCode = normalized.substring(0, 4)  // +595
    const mobilePrefix = normalized.substring(4, 7) // 9xx
    const firstPart = normalized.substring(7, 10)   // xxx
    const secondPart = normalized.substring(10, 13) // xxx
    
    return `${countryCode} - ${mobilePrefix} - ${firstPart}-${secondPart}`
  }
  
  // Colombia (+57) - Formato: +57 - 3xx - xxx-xxxx
  if (normalized.startsWith('+57')) {
    const countryCode = normalized.substring(0, 3)  // +57
    const mobilePrefix = normalized.substring(3, 6) // 3xx
    const firstPart = normalized.substring(6, 9)    // xxx
    const secondPart = normalized.substring(9, 13)  // xxxx
    
    return `${countryCode} - ${mobilePrefix} - ${firstPart}-${secondPart}`
  }
  
  // España (+34) - Formato: +34 - 6xx - xxx-xxx
  if (normalized.startsWith('+34')) {
    const countryCode = normalized.substring(0, 3)  // +34
    const mobilePrefix = normalized.substring(3, 6) // 6xx
    const firstPart = normalized.substring(6, 9)    // xxx
    const secondPart = normalized.substring(9, 12)  // xxx
    
    return `${countryCode} - ${mobilePrefix} - ${firstPart}-${secondPart}`
  }
  
  // Para otros países, usar formato genérico simple
  return formatGenericNumber(normalized)
}

// Formato genérico simple para otros países
function formatGenericNumber(normalized: string): string {
  // Si tiene 10-15 dígitos, aplicar formato básico
  if (normalized.length >= 10 && normalized.length <= 15) {
    const countryCode = normalized.substring(0, 3)  // +xx
    const remaining = normalized.substring(3)
    
    // Dividir el resto en grupos de 3-4 dígitos
    if (remaining.length <= 8) {
      const mid = Math.ceil(remaining.length / 2)
      const firstPart = remaining.substring(0, mid)
      const secondPart = remaining.substring(mid)
      
      return `${countryCode} - ${firstPart}-${secondPart}`
    } else {
      const firstPart = remaining.substring(0, 4)
      const secondPart = remaining.substring(4, 8)
      const thirdPart = remaining.substring(8)
      
      if (thirdPart) {
        return `${countryCode} - ${firstPart}-${secondPart}-${thirdPart}`
      } else {
        return `${countryCode} - ${firstPart}-${secondPart}`
      }
    }
  }
  
  // Para números muy cortos o largos, mantener sin formato
  return normalized
}

export default whatsapp
