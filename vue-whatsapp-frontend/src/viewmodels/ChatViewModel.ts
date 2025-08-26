import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { ConversationModel } from '../models/Conversation'
import { MessageModel } from '../models/Message'
import { WhatsAppSession } from '../models/Session'
import { TimeUtils } from '../utils/timeUtils'

// 🔄 NUEVO: Tipos para las conversaciones del backend
interface ContactChatData {
  chatId: string;
  contactId: string;
  contactName: string;
  phoneNumber: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  hasUnreadMessages: boolean;
  isContact: boolean;
}

export class ChatViewModel {
  private store = useStore()
  
  // Estado reactivo
  public searchQuery = ref('')
  public newMessage = ref('')
  public selectedConversation = ref<ConversationModel | null>(null)
  public isRefreshing = ref(false)
  public showNewConversationNotification = ref(false)
  public messagesContainer = ref<HTMLElement | null>(null)
  
  // 🔄 NUEVO: Variables para carga progresiva
  public isLoading = ref(false)
  public loadingMessage = ref('')
  public activeTab = ref<'chats' | 'contactConversations' | 'nonContactConversations'>('chats')
  public contacts = ref<Array<{ 
    id: string; 
    name: string; 
    phoneNumber: string; 
    isContact: boolean;
    lastMessage?: string;
    lastMessageTime?: Date;
    unreadCount: number;
    hasUnreadMessages: boolean;
  }>>([])
  public contactConversations = ref<ConversationModel[]>([])
  public nonContactConversations = ref<ConversationModel[]>([])
  
  // 📱 NUEVO: Variables para lazy loading de contactos
  public contactsPerPage = ref(20)
  public currentContactsPage = ref(0)
  public isLoadingMoreContactsLocal = ref(false)
  
  // 🔤 NUEVO: Variables para ordenamiento de contactos
  public contactsSortBy = ref<'name' | 'phoneNumber' | 'isContact' | 'lastMessage'>('name')
  public contactsSortOrder = ref<'asc' | 'desc'>('asc')

  constructor(
    private sessionId: string,
    private phoneNumber?: string
  ) {}

  // Computed properties
  get loading(): boolean {
    return this.store.state.whatsapp.loading
  }

  get currentSession(): WhatsAppSession | null {
    return this.store.getters['whatsapp/sessionById'](this.sessionId)
  }

  get conversations(): ConversationModel[] {
    // Usar el getter que ordena por actividad (más reciente primero)
    const storeConversations = this.store.getters['whatsapp/conversationsByActivity'](this.sessionId) || []
    
    console.log('🔄 ChatViewModel: Obteniendo conversaciones ordenadas por actividad', {
      sessionId: this.sessionId,
      count: storeConversations.length
    })
    
    return storeConversations
      .filter((conv: ConversationModel) => conv && conv.id)
      .map((conv: ConversationModel) => ConversationModel.fromData(conv))
  }

  get messages(): MessageModel[] {
    if (!this.selectedConversation.value) return []
    
    const phoneNumber = this.selectedConversation.value.phoneNumber
    if (!phoneNumber) return []
    
    const conversationId = `${this.sessionId}_${phoneNumber}`
    const storeMessages = this.store.state.whatsapp.messages[conversationId] || []
    
    return storeMessages
      .filter((msg: MessageModel) => msg && msg.id)
      .map((msg: MessageModel) => MessageModel.fromData(msg))
      .sort((a: MessageModel, b: MessageModel) => {
        const timeA = new Date(a.timestamp).getTime()
        const timeB = new Date(b.timestamp).getTime()
        return timeA - timeB
      })
  }

  get filteredConversations(): ConversationModel[] {
    if (!this.searchQuery.value) return this.conversations
    
    return this.conversations.filter((conv: ConversationModel) =>
      conv.displayName
        .toLowerCase()
        .includes(this.searchQuery.value.toLowerCase())
    )
  }
  
  // 🔄 NUEVO: Computed properties para filtros
  filteredContacts = computed(() => {
    console.log('🔍 ChatViewModel: filteredContacts computed llamado', {
      searchQuery: this.searchQuery.value,
      contactsLength: this.contacts.value.length,
      contacts: this.contacts.value
    })
    
    // 🔍 NUEVO: Filtrar contactos con números de teléfono válidos
    const validContacts = this.contacts.value.filter(contact => {
      const phoneNumber = contact.phoneNumber || ''
      
      // Excluir números que contengan @lid (IDs de sistema)
      if (phoneNumber.includes('@lid')) {
        console.log('🚫 ChatViewModel: Excluyendo contacto con @lid:', phoneNumber)
        return false
      }
      
      // Excluir números muy largos (más de 15 dígitos) que parecen IDs de sistema
      if (phoneNumber.length > 15) {
        console.log('🚫 ChatViewModel: Excluyendo contacto con número muy largo:', phoneNumber)
        return false
      }
      
      // Excluir números que solo contengan dígitos y sean muy largos (IDs numéricos)
      if (/^\d{16,}$/.test(phoneNumber)) {
        console.log('🚫 ChatViewModel: Excluyendo contacto con ID numérico muy largo:', phoneNumber)
        return false
      }
      
      return true
    })
    
    if (!this.searchQuery.value) {
      console.log('🔍 ChatViewModel: Sin búsqueda, retornando contactos válidos:', validContacts.length)
      return validContacts
    }
    
    const filtered = validContacts.filter(contact =>
      contact.name.toLowerCase().includes(this.searchQuery.value.toLowerCase()) ||
      contact.phoneNumber.includes(this.searchQuery.value)
    )
    
    console.log('🔍 ChatViewModel: Con búsqueda, contactos válidos filtrados:', filtered.length)
    return filtered
  })
  
  filteredContactConversations = computed(() => {
    if (!this.searchQuery.value) return this.contactConversations.value
    
    return this.contactConversations.value.filter(conv =>
      (conv.contactName || conv.phoneNumber).toLowerCase().includes(this.searchQuery.value.toLowerCase())
    )
  })
  
  filteredNonContactConversations = computed(() => {
    if (!this.searchQuery.value) return this.nonContactConversations.value
    
    return this.nonContactConversations.value.filter(conv =>
      (conv.contactName || conv.phoneNumber).toLowerCase().includes(this.searchQuery.value.toLowerCase())
    )
  })

  // 📱 NUEVO: Computed properties para lazy loading de contactos
  displayedContacts = computed(() => {
    const startIndex = 0
    const endIndex = (this.currentContactsPage.value + 1) * this.contactsPerPage.value
    
    // Ordenar alfabéticamente por nombre antes de aplicar paginación
    const sortedContacts = [...this.filteredContacts.value].sort((a, b) => {
      let comparison = 0
      
      switch (this.contactsSortBy.value) {
        case 'name':
          const nameA = (a.name || '').toLowerCase().trim()
          const nameB = (b.name || '').toLowerCase().trim()
          
          if (nameA && nameB) {
            comparison = nameA.localeCompare(nameB, 'es', { sensitivity: 'base' })
          } else if (nameA && !nameB) {
            comparison = -1
          } else if (!nameA && nameB) {
            comparison = 1
          } else {
            // Si ninguno tiene nombre, ordenar por número de teléfono
            comparison = (a.phoneNumber || '').localeCompare(b.phoneNumber || '', 'es')
          }
          break
          
        case 'phoneNumber':
          comparison = (a.phoneNumber || '').localeCompare(b.phoneNumber || '', 'es')
          break
          
        case 'isContact':
          // Primero los contactos, luego los no contactos
          if (a.isContact && !b.isContact) comparison = -1
          else if (!a.isContact && b.isContact) comparison = 1
          else {
            // Si tienen el mismo estado, ordenar por nombre
            const nameA = (a.name || '').toLowerCase().trim()
            const nameB = (b.name || '').toLowerCase().trim()
            comparison = nameA.localeCompare(nameB, 'es', { sensitivity: 'base' })
          }
          break
          
        case 'lastMessage':
          // Ordenar por tiempo del último mensaje (más reciente primero)
          const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0
          const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0
          comparison = timeB - timeA // Más reciente primero
          break
      }
      
      // Aplicar orden ascendente o descendente
      return this.contactsSortOrder.value === 'asc' ? comparison : -comparison
    })
    
    return sortedContacts.slice(startIndex, endIndex)
  })

  hasMoreContacts = computed(() => {
    return this.displayedContacts.value.length < this.filteredContacts.value.length
  })

  remainingContacts = computed(() => {
    return this.filteredContacts.value.length - this.displayedContacts.value.length
  })

  // Métodos de negocio
  async initialize(): Promise<void> {
    try {
      console.log('🚀 ChatViewModel: Inicializando...')
      
      // Cargar contactos automáticamente al inicializar
      console.log('📱 ChatViewModel: Cargando contactos automáticamente...')
      await this.loadContactsOnly()
      
      // 🔄 NUEVO: Configurar watchers automáticos para mensajes
      this.setupMessageWatchers()
      
      // 🔄 NUEVO: Actualizar información de contactos desde mensajes existentes
      this.updateContactsFromMessages()
      
      // Cargar todas las conversaciones disponibles en lugar de solo la primera página
      console.log('💬 ChatViewModel: Cargando conversaciones...')
      // await this.store.dispatch('whatsapp/loadAllConversations', this.sessionId)
      
      if (this.phoneNumber) {
        const conversation = this.conversations.find(
          (c: ConversationModel) => c.phoneNumber === this.phoneNumber
        )
        if (conversation) {
          await this.selectConversation(conversation)
        }
      }
      
      console.log('✅ ChatViewModel: Inicialización completada')
    } catch (error) {
      console.error('❌ Error en inicialización del ChatViewModel:', error)
    }
  }
  
  // �� NUEVO: Método para cargar solo contactos
  async loadContactsOnly(): Promise<void> {
    try {
      this.isLoading.value = true
      this.loadingMessage.value = '📱 Cargando solo contactos...'
      
      console.log('📱 ChatViewModel: Cargando solo contactos')
      
      // 🔄 NUEVO: Llamar al store con paginación (resetear para primera carga)
      const contactsResult = await this.store.dispatch('whatsapp/getContacts', {
        sessionId: this.sessionId,
        resetPagination: true
      })
      
      // Actualizar solo la variable de contactos
      this.contacts.value = contactsResult || []
      this.contactConversations.value = [] // Vaciar conversaciones
      this.nonContactConversations.value = [] // Vaciar conversaciones
      
      console.log('✅ ChatViewModel: Solo contactos cargados:', {
        contacts: this.contacts.value.length,
        contactConversations: this.contactConversations.value.length,
        nonContactConversations: this.nonContactConversations.value.length
      })
      
              // Cambiar automáticamente a la pestaña de chats
        this.activeTab.value = 'chats'
        
        // Mostrar mensaje de éxito
        if (this.contacts.value.length > 0) {
          this.loadingMessage.value = `✅ ${this.contacts.value.length} chats cargados correctamente`
        } else {
          this.loadingMessage.value = '⚠️ No se encontraron chats'
        }
      
      // Limpiar el mensaje después de 3 segundos
      setTimeout(() => {
        this.loadingMessage.value = ''
      }, 3000)
      
    } catch (error) {
      console.error('❌ Error cargando solo contactos:', error)
      this.loadingMessage.value = '❌ Error cargando contactos: ' + (error instanceof Error ? error.message : 'Error desconocido')
      
      // Limpiar el mensaje después de 5 segundos
      setTimeout(() => {
        this.loadingMessage.value = ''
      }, 5000)
    } finally {
      this.isLoading.value = false
    }
  }

  // 🔄 NUEVO: Método para cargar conversaciones de contactos
  async loadContactConversations(limit: number = 50, offset: number = 0): Promise<void> {
    try {
      console.log('💬 ChatViewModel: Cargando conversaciones de contactos:', { limit, offset })
      
      // Llamar al store para obtener conversaciones de contactos
      const result = await this.store.dispatch('whatsapp/getContactChatsBatch', {
        sessionId: this.sessionId,
        limit,
        offset
      })
      
      if (result && result.length > 0) {
        // Si es la primera página, reemplazar; si no, agregar
        if (offset === 0) {
          this.contactConversations.value = result.map((conv: ContactChatData) => ConversationModel.fromData(conv))
        } else {
          this.contactConversations.value.push(...result.map((conv: ContactChatData) => ConversationModel.fromData(conv)))
        }
        
        console.log('✅ ChatViewModel: Conversaciones de contactos cargadas:', {
          nuevas: result.length,
          total: this.contactConversations.value.length
        })
      }
      
    } catch (error) {
      console.error('❌ Error cargando conversaciones de contactos:', error)
    }
  }

  // 🔄 NUEVO: Método para cargar conversaciones no contactos
  async loadNonContactConversations(limit: number = 50, offset: number = 0): Promise<void> {
    try {
      console.log('💬 ChatViewModel: Cargando conversaciones no contactos:', { limit, offset })
      
      // Llamar al store para obtener conversaciones no contactos
      const result = await this.store.dispatch('whatsapp/getNonContactChatsBatch', {
        sessionId: this.sessionId,
        limit,
        offset
      })
      
      if (result && result.length > 0) {
        // Si es la primera página, reemplazar; si no, agregar
        if (offset === 0) {
          this.nonContactConversations.value = result.map((conv: ContactChatData) => ConversationModel.fromData(conv))
        } else {
          this.nonContactConversations.value.push(...result.map((conv: ContactChatData) => ConversationModel.fromData(conv)))
        }
        
        console.log('✅ ChatViewModel: Conversaciones no contactos cargadas:', {
          nuevas: result.length,
          total: this.nonContactConversations.value.length
        })
      }
      
    } catch (error) {
      console.error('❌ Error cargando conversaciones no contactos:', error)
    }
  }

  // 🔄 NUEVO: Método para cargar más contactos
  async loadMoreContacts(): Promise<void> {
    try {
      console.log('📚 ChatViewModel: Cargando más contactos...')
      
      // Activar estado de carga
      this.isLoadingMoreContactsLocal.value = true
      
      // Simular un pequeño delay para mejor UX
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Incrementar la página actual para mostrar más contactos
      this.currentContactsPage.value += 1
      
      console.log('✅ ChatViewModel: Página incrementada:', {
        paginaActual: this.currentContactsPage.value,
        contactosMostrados: this.displayedContacts.value.length,
        totalContactos: this.contacts.value.length
      })
      
      // No necesitamos cargar del backend porque ya tenemos todos los contactos
      // Solo estamos implementando lazy loading en el frontend
      
    } catch (error) {
      console.error('❌ Error cargando más contactos:', error)
    } finally {
      // Desactivar estado de carga
      this.isLoadingMoreContactsLocal.value = false
    }
  }
  
  // 🔤 NUEVO: Método para cambiar el ordenamiento de contactos
  changeContactsSort(sortBy: 'name' | 'phoneNumber' | 'isContact' | 'lastMessage'): void {
    // Si ya está ordenado por el mismo campo, cambiar el orden
    if (this.contactsSortBy.value === sortBy) {
      this.contactsSortOrder.value = this.contactsSortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      // Si es un campo diferente, establecer orden ascendente por defecto
      this.contactsSortBy.value = sortBy
      this.contactsSortOrder.value = 'asc'
    }
    
    // Resetear la paginación cuando cambia el ordenamiento
    this.currentContactsPage.value = 0
    
    console.log('🔤 ChatViewModel: Ordenamiento cambiado:', {
      sortBy: this.contactsSortBy.value,
      sortOrder: this.contactsSortOrder.value
    })
  }
  
  // 🔤 NUEVO: Método para obtener el ícono del ordenamiento actual
  getSortIcon(sortBy: 'name' | 'phoneNumber' | 'isContact' | 'lastMessage'): string {
    if (this.contactsSortBy.value !== sortBy) {
      return '↕️' // Sin ordenamiento
    }
    
    return this.contactsSortOrder.value === 'asc' ? '↑' : '↓'
  }

  //  NUEVO: Método para carga progresiva completa
  async startProgressiveLoad(): Promise<void> {
    try {
      this.isLoading.value = true
      this.loadingMessage.value = '🔄 Iniciando carga progresiva...'
      
      console.log('🔄 ChatViewModel: Iniciando carga progresiva')
      
      // 1. Cargar contactos (ya implementado)
      await this.loadContactsOnly()
      
      // 2. Cargar conversaciones de contactos (primer lote)
      this.loadingMessage.value = '💬 Cargando conversaciones de contactos...'
      await this.loadContactConversations(50, 0)
      
      // 3. Cargar conversaciones no contactos (primer lote)
      this.loadingMessage.value = '💬 Cargando conversaciones no contactos...'
      await this.loadNonContactConversations(50, 0)
      
      console.log('✅ ChatViewModel: Carga progresiva completada:', {
        contacts: this.contacts.value.length,
        contactConversations: this.contactConversations.value.length,
        nonContactConversations: this.nonContactConversations.value.length
      })
      
      // Cambiar automáticamente a la pestaña de chats
      this.activeTab.value = 'chats'
      
      this.loadingMessage.value = ''
      
    } catch (error) {
      console.error('❌ Error en carga progresiva:', error)
      this.loadingMessage.value = '❌ Error en la carga'
    } finally {
      this.isLoading.value = false
    }
  }
  
  // 🔄 NUEVO: Métodos para navegación y selección
  setActiveTab(tab: 'chats' | 'contactConversations' | 'nonContactConversations'): void {
    this.activeTab.value = tab
  }
  
  async selectContact(contact: { id: string; name: string; phoneNumber: string; isContact: boolean }): Promise<void> {
    console.log('👥 Contacto seleccionado:', contact)
    
    try {
      // 🔍 Buscar si ya existe una conversación con este contacto
      const existingConversation = this.conversations.find(
        conv => conv.phoneNumber === contact.phoneNumber
      )
      
      if (existingConversation) {
        // ✅ Si ya existe, seleccionarla directamente
        console.log('✅ Conversación existente encontrada, seleccionando...')
        await this.selectConversation(existingConversation)
        console.log('✅ Chat abierto con conversación existente y mensajes cargados')
      } else {
        // 🆕 Si no existe, crear una nueva conversación
        console.log('🆕 Creando nueva conversación para contacto...')
        
        const newConversation = new ConversationModel({
          id: `${this.sessionId}_${contact.phoneNumber}`,
          sessionId: this.sessionId,
          phoneNumber: contact.phoneNumber,
          contactName: contact.name,
          lastMessage: '',
          lastMessageTime: new Date(),
          unreadCount: 0,
          isGroup: false,
          isContact: contact.isContact,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        
        // 🔄 Agregar la nueva conversación al store
        this.store.commit('whatsapp/ADD_CONVERSATION', newConversation)
        console.log('✅ Nueva conversación agregada al store')
        
        // ✅ Seleccionar la nueva conversación
        await this.selectConversation(newConversation)
        
        console.log('✅ Nueva conversación creada, seleccionada y mensajes cargados:', newConversation.contactName)
      }
      
    } catch (error) {
      console.error('❌ Error al seleccionar contacto:', error)
    }
  }

  async selectConversation(conversation: ConversationModel): Promise<void> {
    this.selectedConversation.value = conversation
    
    // Marcar mensajes como leídos
    if (conversation.unreadCount > 0) {
      console.log('👁️ ChatViewModel: Marcando mensajes como leídos para', conversation.phoneNumber)
      
      // Actualizar la conversación para marcar como leída
      const updatedConversation = {
        ...conversation,
        unreadCount: 0
      }
      
      // Actualizar en el store
      this.store.commit('whatsapp/UPDATE_CONVERSATION', updatedConversation)
    }
    
    // Cargar mensajes de la conversación
    await this.refreshMessages()
    
    // Scroll al final de los mensajes
    this.scrollToBottom()
  }

  async sendMessage(): Promise<void> {
    if (!this.newMessage.value.trim() || !this.selectedConversation.value) return

    try {
      await this.store.dispatch('whatsapp/sendMessage', {
        sessionId: this.sessionId,
        to: this.selectedConversation.value.phoneNumber,
        body: this.newMessage.value
      })
      
      this.newMessage.value = ''
      this.scrollToBottom()
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  async refreshConversations(): Promise<void> {
    this.isRefreshing.value = true
    
    try {
      // Usar loadAllConversations para obtener todas las conversaciones actualizadas
      await this.store.dispatch('whatsapp/loadAllConversations', this.sessionId)
      console.log('✅ Todas las conversaciones han sido actualizadas')
    } catch (error) {
      console.error('Error al sincronizar conversaciones:', error)
    } finally {
      this.isRefreshing.value = false
    }
  }

  async loadMoreConversations(): Promise<void> {
    try {
      await this.store.dispatch('whatsapp/loadMoreConversations', this.sessionId)
      console.log('📚 Conversaciones adicionales cargadas')
    } catch (error) {
      console.error('Error al cargar más conversaciones:', error)
    }
  }

  // Getters para acceder a la paginación del store
  get canLoadMoreConversations(): boolean {
    return this.store.getters['whatsapp/canLoadMoreConversations']
  }

  get conversationsPaginationInfo() {
    return this.store.getters['whatsapp/conversationsPaginationInfo']
  }

  get isLoadingMoreConversations(): boolean {
    return this.store.state.whatsapp.conversationsPagination.isLoadingMore
  }

  // 🔄 NUEVO: Getters para paginación de contactos
  get canLoadMoreContacts(): boolean {
    return this.store.getters['whatsapp/canLoadMoreContacts']
  }

  get contactsPaginationInfo() {
    return this.store.getters['whatsapp/contactsPaginationInfo']
  }

  get isLoadingMoreContacts(): boolean {
    return this.store.state.whatsapp.contactsPagination.isLoadingMore
  }

  async refreshMessages(): Promise<void> {
    if (this.selectedConversation.value) {
      try {
        console.log('🔄 ChatViewModel: Cargando mensajes para conversación:', {
          phoneNumber: this.selectedConversation.value.phoneNumber,
          contactName: this.selectedConversation.value.contactName
        })
        
        const loadedMessages = await this.store.dispatch('whatsapp/fetchChatMessages', {
          sessionId: this.sessionId,
          chatId: this.selectedConversation.value.phoneNumber,
          limit: 100,
          includeFromMe: true
        })
        
        // 🔄 NUEVO: Sincronizar mensajes del backend con el store
        if (loadedMessages && loadedMessages.length > 0) {
          console.log(`🔄 ChatViewModel: Sincronizando ${loadedMessages.length} mensajes del backend con el store`)
          
          // 🔍 DEBUG: Verificar conversationId que se está usando
          const conversationId = this.getConversationId()
          console.log(`🔍 ChatViewModel: ConversationId para sincronización: ${conversationId}`)
          
          // Agregar cada mensaje al store usando la mutación ADD_MESSAGE
          for (const message of loadedMessages) {
            try {
              // Verificar si el mensaje ya existe en el store
              const existingMessages = this.store.state.whatsapp.messages[conversationId] || []
              const messageExists = existingMessages.some((m: MessageModel) => m.id === message.id)
              
              if (!messageExists) {
                console.log(`📥 ChatViewModel: Agregando mensaje del backend al store: ${message.id} - "${message.body?.substring(0, 30)}..."`)
                
                // 🔄 IMPORTANTE: Asegurar que el mensaje tenga el formato correcto para el store
                const messageForStore = {
                  ...message,
                  sessionId: this.sessionId,
                  id: message.id,
                  fromMe: message.fromMe,
                  from: message.from,
                  to: message.to,
                  body: message.body || '',
                  type: message.type || 'text',
                  status: message.status || 'delivered',
                  timestamp: message.timestamp ? new Date(message.timestamp) : new Date()
                }
                
                console.log(`📤 ChatViewModel: Mensaje preparado para store:`, messageForStore)
                
                // 🔄 IMPORTANTE: Usar commit directo para evitar problemas de async
                this.store.commit('whatsapp/ADD_MESSAGE', messageForStore)
                
                console.log(`✅ ChatViewModel: Mensaje agregado exitosamente al store: ${message.id}`)
              } else {
                console.log(`✅ ChatViewModel: Mensaje ya existe en store: ${message.id}`)
              }
            } catch (error) {
              console.error(`❌ ChatViewModel: Error agregando mensaje ${message.id} al store:`, error)
            }
          }
          
          console.log(`✅ ChatViewModel: Sincronización completada: ${loadedMessages.length} mensajes procesados`)
          
          // 🔍 DEBUG: Verificar estado final del store
          const finalMessages = this.store.state.whatsapp.messages[conversationId] || []
          console.log(`🔍 ChatViewModel: Estado final del store para ${conversationId}: ${finalMessages.length} mensajes`)
        }
        
        console.log('✅ ChatViewModel: Mensajes cargados y sincronizados exitosamente')
      } catch (error) {
        console.error('❌ ChatViewModel: Error al cargar mensajes:', error)
      }
    } else {
      console.log('⚠️ ChatViewModel: No hay conversación seleccionada para cargar mensajes')
    }
  }

  scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer.value) {
        this.messagesContainer.value.scrollTop = this.messagesContainer.value.scrollHeight
      } else {
        const chatContainer = document.querySelector('.overflow-y-auto')
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight
        }
      }
    }, 50)
  }

  // �� NUEVO: Método para configurar watchers automáticos de mensajes
  setupMessageWatchers(): void {
    console.log('👁️ ChatViewModel: Configurando watchers automáticos de mensajes')
    
    // Watcher para cambios en los mensajes del store
    this.store.watch(
      (state) => state.whatsapp.messages,
      () => {
        console.log('🔄 ChatViewModel: Cambio detectado en mensajes del store, actualizando contactos...')
        this.updateContactsFromMessages()
      },
      { deep: true }
    )
    
    // Watcher para cambios en conversaciones (por si se agregan nuevas)
    this.store.watch(
      (state) => state.whatsapp.conversations,
      (newConversations, oldConversations) => {
        if (newConversations && oldConversations && newConversations.length !== oldConversations.length) {
          console.log('🔄 ChatViewModel: Cambio detectado en conversaciones, actualizando contactos...')
          this.updateContactsFromMessages()
        }
      },
      { deep: false }
    )
    
    console.log('✅ ChatViewModel: Watchers automáticos configurados')
  }

  // 🔄 NUEVO: Método para actualizar información de contactos desde el backend
  updateContactsFromMessages(): void {
    console.log('🔄 ChatViewModel: Actualizando información de contactos desde el backend')
    
    // Ya no es necesario este método porque el backend proporciona directamente
    // la información de preview. Solo mantenemos el método por compatibilidad.
    console.log('✅ ChatViewModel: Los contactos ya incluyen preview desde el backend')
  }
  
  // 🔄 NUEVO: Función helper para generar conversationId consistente
  private getConversationId(): string {
    if (!this.selectedConversation.value?.phoneNumber) return ''
    const normalizedPhone = this.normalizePhoneNumber(this.selectedConversation.value.phoneNumber)
    return `${this.sessionId}_${normalizedPhone}`
  }

  // 🔄 NUEVO: Función helper para normalizar números de teléfono (igual que el store)
  private normalizePhoneNumber(phone: string): string {
    // Remover sufijos comunes de WhatsApp
    let normalized = phone.replace(/@c\.us$/, '')
    normalized = normalized.replace(/@s\.whatsapp\.net$/, '')
    normalized = normalized.replace(/@g\.us$/, '')
    
    // Remover caracteres no numéricos excepto + y -
    normalized = normalized.replace(/[^\d+\-]/g, '')
    
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
    
    return normalized
  }

  // 🔄 NUEVO: Método para formatear el tiempo del último mensaje
  formatLastMessageTime(dateString: string | Date | undefined): string {
    if (!dateString) return ''
    
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      // Si es hoy, mostrar solo la hora
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } else if (diffInHours < 48) {
      // Si es ayer
      return 'Ayer'
    } else if (diffInHours < 168) {
      // Si es esta semana, mostrar el día
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      // Si es más antiguo, mostrar la fecha
      return date.toLocaleDateString([], { 
        day: '2-digit', 
        month: '2-digit' 
      })
    }
  }

  formatTime(dateString: string | Date): string {
    return TimeUtils.formatDateTime(dateString)
  }

  showNotification(message: string, duration: number = 5000): void {
    this.showNewConversationNotification.value = true
    setTimeout(() => {
      this.showNewConversationNotification.value = false
    }, duration)
  }

  hideNotification(): void {
    this.showNewConversationNotification.value = false
  }

  clearSearch(): void {
    this.searchQuery.value = ''
  }

  cleanup(): void {
    this.searchQuery.value = ''
    this.newMessage.value = ''
    this.selectedConversation.value = null
    this.isRefreshing.value = false
    this.showNewConversationNotification.value = false
  }

  get reactiveState() {
    return {
      searchQuery: this.searchQuery,
      newMessage: this.newMessage,
      selectedConversation: this.selectedConversation,
      isRefreshing: this.isRefreshing,
      showNewConversationNotification: this.showNewConversationNotification,
      messagesContainer: this.messagesContainer,
      canLoadMoreConversations: this.canLoadMoreConversations,
      conversationsPaginationInfo: this.conversationsPaginationInfo,
      isLoadingMoreConversations: this.isLoadingMoreConversations,
      // 🔄 NUEVO: Getters para paginación de contactos
      canLoadMoreContacts: this.canLoadMoreContacts,
      contactsPaginationInfo: this.contactsPaginationInfo,
      isLoadingMoreContacts: this.isLoadingMoreContacts,
      // 🔄 NUEVO: Variables para carga progresiva
      isLoading: this.isLoading,
      loadingMessage: this.loadingMessage,
      activeTab: this.activeTab,
      contacts: this.contacts,
      contactConversations: this.contactConversations,
      nonContactConversations: this.nonContactConversations,
      // 📱 NUEVO: Variables para lazy loading de contactos
      contactsPerPage: this.contactsPerPage,
      currentContactsPage: this.currentContactsPage,
      isLoadingMoreContactsLocal: this.isLoadingMoreContactsLocal,
      // 🔤 NUEVO: Variables para ordenamiento de contactos
      contactsSortBy: this.contactsSortBy,
      contactsSortOrder: this.contactsSortOrder,
      // 🔄 NUEVO: Computed properties para filtros
      filteredContacts: this.filteredContacts,
      filteredContactConversations: this.filteredContactConversations,
      filteredNonContactConversations: this.filteredNonContactConversations,
      // 📱 NUEVO: Computed properties para lazy loading de contactos
      displayedContacts: this.displayedContacts,
      hasMoreContacts: this.hasMoreContacts,
      remainingContacts: this.remainingContacts,
      messages: this.messages,
      formatTime: this.formatTime
    }
  }

  get reactiveMethods() {
    return {
      selectConversation: this.selectConversation.bind(this),
      sendMessage: this.sendMessage.bind(this),
      refreshConversations: this.refreshConversations.bind(this),
      refreshMessages: this.refreshMessages.bind(this),
      loadMoreConversations: this.loadMoreConversations.bind(this),
      scrollToBottom: this.scrollToBottom.bind(this),
      formatTime: this.formatTime.bind(this),
      showNotification: this.showNotification.bind(this),
      hideNotification: this.hideNotification.bind(this),
      clearSearch: this.clearSearch.bind(this),
      cleanup: this.cleanup.bind(this),
      // 🔄 NUEVO: Métodos para navegación y selección
      setActiveTab: this.setActiveTab.bind(this),
      selectContact: this.selectContact.bind(this),
      startProgressiveLoad: this.startProgressiveLoad.bind(this),
      loadContactsOnly: this.loadContactsOnly.bind(this),
      loadContactConversations: this.loadContactConversations.bind(this),
      loadNonContactConversations: this.loadNonContactConversations.bind(this),
      // 🔄 NUEVO: Método para cargar más contactos
      loadMoreContacts: this.loadMoreContacts.bind(this),
      // 🔤 NUEVO: Método para cambiar el ordenamiento de contactos
      changeContactsSort: this.changeContactsSort.bind(this),
      // 🔤 NUEVO: Método para obtener el ícono del ordenamiento actual
      getSortIcon: this.getSortIcon.bind(this),
      // 🔄 NUEVO: Método para formatear tiempo del último mensaje
      formatLastMessageTime: this.formatLastMessageTime.bind(this),
      // 🔄 NUEVO: Método para actualizar contactos desde mensajes
      updateContactsFromMessages: this.updateContactsFromMessages.bind(this),
      // 🔄 NUEVO: Método para configurar watchers automáticos
      setupMessageWatchers: this.setupMessageWatchers.bind(this)
    }
  }
}
