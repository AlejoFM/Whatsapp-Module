<template>
  <div class="h-screen flex flex-col">
   
    <div class="bg-white shadow-md flex-1 flex flex-col">
      <!-- Header -->
      <div class="border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">
              Chat - {{ currentSession?.clientId || 'Sesión' }}
            </h2>
            <p class="text-sm text-gray-500">
              {{ currentSession?.phoneNumber || 'Sin número de teléfono' }}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <!-- Botón de carga progresiva -->
            <button 
              @click="loadContactsOnly"
              :disabled="isLoading || isRefreshing"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg v-if="isLoading || isRefreshing" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else class="-ml-1 mr-2 h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              {{ isLoading ? 'Cargando...' : '📱 Cargar Contactos' }}
            </button>
            
            <!-- Botón de sincronización rápida -->
            <button 
              @click="refreshConversations"
              :disabled="isRefreshing || isLoading"
              class="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg v-if="isRefreshing" class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else class="-ml-1 mr-2 h-4 w-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              {{ isRefreshing ? 'Sincronizando...' : 'Sincronizar' }}
            </button>
            
            <router-link
              :to="{ name: 'Sessions' }"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              Volver a Sesiones
            </router-link>
          </div>
        </div>

        <!-- Título principal -->
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-2xl font-bold text-gray-800">💬 Chat de WhatsApp</h1>
          <div class="flex space-x-2">
            <button
              @click="refreshConversations"
              :disabled="isRefreshing"
              class="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🔄 {{ isRefreshing ? 'Actualizando...' : 'Actualizar' }}
            </button>
          </div>
        </div>

        <!-- 🚀 Navegación entre pestañas -->
        <div class="mb-4 flex space-x-2">
          <button
            @click="setActiveTab('chats')"
            :class="[
              'px-4 py-2 rounded-lg font-medium transition-all',
              activeTab === 'chats'
                ? 'bg-green-500 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            ]"
          >
            👥 Chats ({{ contacts.length }})
          </button>
          
          <button
            @click="setActiveTab('contactConversations')"
            :class="[
              'px-4 py-2 rounded-lg font-medium transition-all',
              activeTab === 'contactConversations'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            ]"
          >
            💬 Conversaciones Contactos ({{ contactConversations.length }})
          </button>
          
          <button
            @click="setActiveTab('nonContactConversations')"
            :class="[
              'px-4 py-2 rounded-lg font-medium transition-all',
              activeTab === 'nonContactConversations'
                ? 'bg-green-500 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            ]"
          >
            📱 Conversaciones No Contactos ({{ nonContactConversations.length }})
          </button>
        </div>
      </div>

      <!-- Contenedor principal del chat - 80% del viewport height -->
      <div class="flex flex-1 min-h-0 chat-container">
        <!-- Sidebar de conversaciones -->
        <div class="w-1/3 border-r border-gray-200 bg-gray-50 flex flex-col">
          <!-- Header de la sidebar -->
          <div class="p-4 flex-shrink-0 h-full">
            <!-- Notificación de nueva conversación -->
            <div 
              v-if="showNewConversationNotification" 
              class="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded animate-bounce"
            >
              <div class="flex items-center justify-between">
                <span class="flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                  ¡Nueva conversación detectada!
                </span>
                <button @click="hideNotification" class="text-green-700 hover:text-green-900">
                  ×
                </button>
              </div>
            </div>
            
            <div class="mb-4">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Buscar conversaciones..."
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <!-- Pestaña de Chats -->
            <div v-if="activeTab === 'chats'" class="space-y-2">
              
              <!-- 🚀 Botones de carga progresiva -->
              <div class="mb-4 space-y-2">
                <button
                  @click="loadContactConversations(50, 0)"
                  :disabled="isLoading"
                  class="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  💬 Cargar Conversaciones de Chats
                </button>

              </div>
              
              <!-- 🔤 NUEVO: Controles de ordenamiento -->
              <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg sort-controls">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-blue-800">🔤 Ordenar por:</span>
                  <span class="text-xs text-blue-600">
                    {{ contacts.length > 0 ? `${displayedContacts.length} de ${contacts.length} chats` : 'Sin chats' }}
                  </span>
                </div>
                
                <div class="flex space-x-2">
                  <button
                    @click="changeContactsSort('name')"
                    :class="[
                      'px-3 py-1 text-xs rounded-md transition-all flex items-center space-x-1',
                      contactsSortBy === 'name'
                        ? 'bg-blue-500 text-white shadow-md active'
                        : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                    ]"
                  >
                    <span>Nombre</span>
                    <span class="text-xs">{{ getSortIcon('name') }}</span>
                  </button>
                  
                  <button
                    @click="changeContactsSort('phoneNumber')"
                    :class="[
                      'px-3 py-1 text-xs rounded-md transition-all flex items-center space-x-1',
                      contactsSortBy === 'phoneNumber'
                        ? 'bg-blue-500 text-white shadow-md active'
                        : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                    ]"
                  >
                    <span>Teléfono</span>
                    <span class="text-xs">{{ getSortIcon('phoneNumber') }}</span>
                  </button>
                  
                  <button
                    @click="changeContactsSort('lastMessage')"
                    :class="[
                      'px-3 py-1 text-xs rounded-md transition-all flex items-center space-x-1',
                      contactsSortBy === 'lastMessage'
                        ? 'bg-blue-500 text-white shadow-md active'
                        : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
                    ]"
                  >
                    <span>Último Mensaje</span>
                    <span class="text-xs">{{ getSortIcon('lastMessage') }}</span>
                  </button>
                 </div>
               </div>
              
              <!-- 📱 Lista de chats con lazy loading y preview de mensajes -->
              <div 
                class="chats-container max-h-[25rem] overflow-y-auto"
                @scroll="handleContactsScroll"
                ref="contactsContainerRef"
              >
                <div
                  v-for="contact in displayedContacts"
                  :key="contact.id"
                  @click="selectContact(contact)"
                  class="chat-item bg-green-50 border border-green-200 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer hover:bg-green-100 hover:border-green-300 mb-2"
                >
                  <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {{ contact.name.charAt(0).toUpperCase() }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between mb-1">
                        <h3 class="font-semibold text-gray-800 truncate">{{ contact.name }}</h3>
                        <span class="text-xs text-gray-500">
                          {{ formatLastMessageTime(contact.lastMessageTime) }}
                        </span>
                      </div>
                      <p class="text-sm text-gray-600 truncate">{{ contact.phoneNumber }}</p>
                      
                                             <!-- 🔄 NUEVO: Preview del último mensaje -->
                       <div v-if="contact.lastMessage" class="mt-2">
                         <div class="flex items-center space-x-2">
                           <span class="text-xs text-gray-500">
                             📨
                           </span>
                           <p class="text-sm text-gray-700 truncate">
                             {{ contact.lastMessage }}
                           </p>
                         </div>
                       </div>
                      
                                             <!-- 🔄 NUEVO: Indicador de mensajes no leídos -->
                       <div v-if="contact.hasUnreadMessages" class="mt-1">
                         <span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                           {{ contact.unreadCount }} {{ contact.unreadCount === 1 ? 'mensaje' : 'mensajes' }} no leído{{ contact.unreadCount === 1 ? '' : 's' }}
                         </span>
                       </div>
                    </div>
                    <div class="text-xs text-gray-500">
                      <span v-if="contact.isContact" class="bg-green-100 text-green-800 px-2 py-1 rounded">Chat</span>
                    </div>
                  </div>
                </div>
                
                <!-- 🔄 NUEVO: Indicador de carga automática -->
                <div v-if="isLoadingMoreContacts" class="text-center py-3">
                  <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mx-auto"></div>
                  <p class="mt-2 text-xs text-gray-600">Cargando más chats automáticamente...</p>
                </div>
                
                <!-- 📱 NUEVO: Indicador sutil de más chats disponibles -->
                <div v-if="hasMoreContacts && !isLoadingMoreContacts" class="text-center py-2">
                  <div class="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                    <span>{{ remainingContacts }} chats más disponibles</span>
                  </div>
                </div>
                
                <!-- 📊 NUEVO: Contador de chats mostrados -->
                <div v-if="contacts.length > 0" class="text-center py-2">
                  <div class="text-xs text-gray-500 bg-blue-50 rounded-lg px-3 py-2">
                    <span>Mostrando {{ displayedContacts.length }} de {{ contacts.length }} chats</span>
                  </div>
                </div>
              </div>
              
              <!-- 🚫 NUEVO: Indicador de chats filtrados -->
              <div v-if="contacts.length > 0 && filteredContacts.length < contacts.length" class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div class="flex items-center space-x-2">
                  <span class="text-yellow-600">⚠️</span>
                  <span class="text-sm text-yellow-800">
                    Se filtraron {{ contacts.length - filteredContacts.length }} chats con números inválidos
                  </span>
                </div>
                <p class="text-xs text-yellow-600 mt-1">
                  Total de chats válidos: {{ filteredContacts.length }} de {{ contacts.length }}
                </p>
              </div>
            </div>

            <!-- Pestaña de Conversaciones de Contactos -->
            <div v-if="activeTab === 'contactConversations'" class="space-y-2">
              <div class="mb-4 p-3 bg-blue-100 border border-blue-300 rounded text-xs">
                <strong>💬 Conversaciones de Contactos:</strong> {{ contactConversations.length }} encontradas
              </div>
              
              <div
                v-for="conversation in filteredContactConversations"
                :key="conversation.id"
                @click="selectConversation(conversation)"
                class="conversation-item bg-blue-50 border border-blue-200 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer hover:bg-blue-100 hover:border-blue-300"
              >
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {{ conversation.contactName ? conversation.contactName.charAt(0).toUpperCase() : '?' }}
                  </div>
                  <div class="flex-1">
                    <h3 class="font-semibold text-gray-800">{{ conversation.contactName || conversation.phoneNumber }}</h3>
                    <p class="text-sm text-gray-600">{{ conversation.phoneNumber }}</p>
                    <p v-if="conversation.lastMessage" class="text-xs text-gray-500 truncate">
                      {{ conversation.lastMessage }}
                    </p>
                  </div>
                  <div class="text-xs text-gray-500">
                    <span v-if="conversation.hasUnreadMessages" class="bg-red-100 text-red-800 px-2 py-1 rounded">
                      {{ conversation.unreadCount }}
                    </span>
                  </div>
                </div>
              </div>
              
              <!-- Mensaje cuando no hay conversaciones -->
              <div v-if="!isLoading && contactConversations.length === 0" class="text-center py-8 text-gray-500">
                <div class="text-4xl mb-2">💬</div>
                <p>No hay conversaciones de contactos</p>
                <p class="text-sm mt-1">Haz clic en "💬 Cargar Conversaciones de Contactos" para comenzar</p>
              </div>
            </div>

            <!-- Pestaña de Conversaciones No Contactos -->
            <div v-if="activeTab === 'nonContactConversations'" class="space-y-2">
              <div class="mb-4 p-3 bg-green-100 border border-green-300 rounded text-xs">
                <strong>📱 Conversaciones No Contactos:</strong> {{ nonContactConversations.length }} encontradas
              </div>
              
              <div
                v-for="conversation in filteredNonContactConversations"
                :key="conversation.id"
                @click="selectConversation(conversation)"
                class="conversation-item bg-green-50 border border-green-200 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer hover:bg-green-100 hover:border-green-300"
              >
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {{ conversation.contactName ? conversation.contactName.charAt(0).toUpperCase() : '?' }}
                  </div>
                  <div class="flex-1">
                    <h3 class="font-semibold text-gray-800">{{ conversation.contactName || conversation.phoneNumber }}</h3>
                    <p class="text-sm text-gray-600">{{ conversation.phoneNumber }}</p>
                    <p v-if="conversation.lastMessage" class="text-xs text-gray-500 truncate">
                      {{ conversation.lastMessage }}
                    </p>
                  </div>
                  <div class="text-xs text-gray-500">
                    <span v-if="conversation.hasUnreadMessages" class="bg-red-100 text-red-800 px-2 py-1 rounded">
                      {{ conversation.unreadCount }}
                    </span>
                  </div>
                </div>
              </div>
              
              <!-- Mensaje cuando no hay conversaciones -->
              <div v-if="!isLoading && nonContactConversations.length === 0" class="text-center py-8 text-gray-500">
                <div class="text-4xl mb-2">📱</div>
                <p>No hay conversaciones no contactos</p>
                <p class="text-sm mt-1">Haz clic en "📱 Cargar Conversaciones No Contactos" para comenzar</p>
              </div>
            </div>
            
            <!-- 📊 Indicador de carga -->
            <div v-if="isLoading" class="text-center py-4">
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p class="mt-2 text-xs text-gray-600">{{ loadingMessage }}</p>
            </div>
            
            <!-- 📊 Mensaje cuando no hay datos -->
            <div v-if="!isLoading && !contacts.length && !contactConversations.length && !nonContactConversations.length" class="text-center py-8 text-gray-500">
              <div class="text-gray-400 text-4xl mb-2">📱</div>
              <p class="text-sm">No hay conversaciones disponibles</p>
              <p class="text-xs mt-1">Haz clic en "Carga Progresiva" para comenzar</p>
            </div>
          </div>
        </div>

        <!-- Área de chat -->
        <div class="flex-1 flex flex-col min-h-0">
          <div v-if="selectedConversation" class="flex-1 flex flex-col min-h-0">
            <!-- 🔄 NUEVO: Usar el componente ConversationChat completamente funcional -->
            <ConversationChat
              :conversation="selectedConversation as any"
              :session-id="sessionId"
              @back="closeChat"
            />
          </div>

          <!-- Estado sin conversación seleccionada -->
          <div v-else class="flex-1 flex items-center justify-center">
            <div class="text-center">
              <div class="text-6xl mb-4">💬</div>
              <p class="text-gray-500 text-lg mb-2">Selecciona una conversación para comenzar a chatear</p>
              <p class="text-xs text-gray-400">Haz clic en cualquier contacto o conversación de la lista</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, watch, computed, ref } from 'vue'
import { useStore } from 'vuex'
import { ChatViewModel } from '../viewmodels/ChatViewModel'
import ConversationChat from '../components/ConversationChat.vue'
import { ConversationModel } from '../models/Conversation'
import { socketService } from '../services/socketService'

export default defineComponent({
  name: 'ChatView',
  components: {
    ConversationChat
  },
  props: {
    sessionId: {
      type: String,
      required: true
    },
    phoneNumber: {
      type: String,
      default: ''
    }
  },
  setup(props) {
    // Usar el store de Vuex
    const store = useStore()
    
    // Crear instancia del ViewModel
    const viewModel = new ChatViewModel(props.sessionId, props.phoneNumber)
    
    // Extraer estado reactivo del ViewModel
    const {
      searchQuery,
      newMessage,
      selectedConversation,
      isRefreshing,
      showNewConversationNotification,
      messagesContainer,
      canLoadMoreConversations,
      conversationsPaginationInfo,
      isLoadingMoreConversations,
      isLoading,
      loadingMessage,
      activeTab,
      contacts,
      contactConversations,
      nonContactConversations,
      filteredContacts,
      filteredContactConversations,
      filteredNonContactConversations,
      messages,
      formatTime,
      contactsPerPage,
      hasMoreContacts,
      remainingContacts,
      isLoadingMoreContacts,
      isLoadingMoreContactsLocal,
      displayedContacts,
      contactsSortBy
    } = viewModel.reactiveState

    // Extraer métodos del ViewModel
    const {
      selectConversation,
      sendMessage,
      refreshConversations,
      refreshMessages,
      loadMoreConversations,
      scrollToBottom,
      showNotification,
      hideNotification,
      clearSearch,
      cleanup,
      setActiveTab,
      selectContact,
      loadContactsOnly,
      loadContactConversations,
      loadMoreContacts,
      changeContactsSort,
      getSortIcon
    } = viewModel.reactiveMethods

    // Computed properties del ViewModel
    const loading = computed(() => viewModel.loading)
    const currentSession = computed(() => viewModel.currentSession)
    const conversations = computed(() => viewModel.conversations)
    const filteredConversations = computed(() => viewModel.filteredConversations)
    
    // Computed properties para sincronización
    const isSyncing = computed(() => store.state.whatsapp.syncProgress.isActive)
    
    // Método para iniciar sincronización completa
    const startFullSync = async () => {
      try {
        await store.dispatch('whatsapp/forceFullSync', props.sessionId)
        console.log('✅ Sincronización completa iniciada')
      } catch (error) {
        console.error('❌ Error al iniciar sincronización completa:', error)
      }
    }
    
    // 🔄 NUEVO: Función para cerrar el chat
    const closeChat = () => {
      selectedConversation.value = null
      console.log('🔙 Chat cerrado')
    }
    
    // 📱 NUEVO: Referencia al contenedor de contactos para detectar scroll
    const contactsContainerRef = ref<HTMLElement | null>(null)
    
    // 📱 NUEVO: Método para detectar scroll y cargar más contactos automáticamente
    const handleContactsScroll = (event: Event) => {
      const target = event.target as HTMLElement
      if (!target) return
      
      const { scrollTop, scrollHeight, clientHeight } = target
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight
      
      // Si estamos al 85% del scroll y hay más contactos, cargar automáticamente
      // Usamos 85% en lugar de 90% para una experiencia más fluida
      if (scrollPercentage >= 0.85 && hasMoreContacts.value && !isLoadingMoreContactsLocal.value) {
        console.log('📱 Scroll detectado al final, cargando más contactos automáticamente...', {
          scrollPercentage: Math.round(scrollPercentage * 100) + '%',
          contactosMostrados: displayedContacts.value.length,
          totalContactos: contacts.value.length,
          restantes: remainingContacts.value
        })
        
        // Cargar más contactos
        loadMoreContacts()
      }
    }


    onMounted(async () => {
      // 🔄 NUEVO: Inicializar WebSocket para mensajes en tiempo real
      socketService.connect()
      console.log('🔌 ChatView: WebSocket inicializado para mensajes en tiempo real')
      
      await viewModel.initialize()
    })

    // Escuchar cambios en las conversaciones para mostrar notificaciones
    watch(conversations, (newConversations, oldConversations) => {
      if (!newConversations || newConversations.length === 0) return
      
      if (props.phoneNumber && !selectedConversation.value) {
        const conversation = newConversations.find(
          (c: ConversationModel) => c.phoneNumber === props.phoneNumber
        )
        if (conversation) {
          selectConversation(conversation)
        }
      }

      // Mostrar notificación si hay nuevas conversaciones
      if (oldConversations && newConversations.length > oldConversations.length) {
        showNotification('¡Nueva conversación detectada!')
      }
    }, { deep: false })

    // Cleanup al desmontar
    onMounted(() => {
      return () => {
        cleanup()
      }
    })

    return {
      // Estado reactivo
      searchQuery,
      newMessage,
      selectedConversation,
      loading,
      currentSession,
      conversations,
      messages,
      filteredConversations,
      isRefreshing,
      isSyncing,
      showNewConversationNotification,
      messagesContainer,
      canLoadMoreConversations,
      conversationsPaginationInfo,
      isLoadingMoreConversations,
      isLoading,
      loadingMessage,
      activeTab,
      contacts,
      contactConversations,
      nonContactConversations,
      filteredContacts,
      filteredContactConversations,
      filteredNonContactConversations,
      formatTime,
      contactsPerPage,
      hasMoreContacts,
      remainingContacts,
      isLoadingMoreContacts,
      isLoadingMoreContactsLocal,
      displayedContacts,
      contactsSortBy,

      // Métodos
      selectConversation,
      sendMessage,
      refreshConversations,
      refreshMessages,
      loadMoreConversations,
      scrollToBottom,
      showNotification,
      hideNotification,
      clearSearch,
      startFullSync,
      setActiveTab,
      selectContact,
      loadContactsOnly,
      loadContactConversations,
      loadMoreContacts,
      closeChat,
      handleContactsScroll,
      contactsContainerRef,
      changeContactsSort,
      getSortIcon,
      formatLastMessageTime: viewModel.formatLastMessageTime,
      setupMessageWatchers: viewModel.setupMessageWatchers
    }
  }
})
</script>

<style scoped>
/* Estilos personalizados para el chat */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 #f7fafc;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f7fafc;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

/* Asegurar que el contenedor principal ocupe exactamente el 80% del viewport */
.chat-container {
  height: 80vh;
  max-height: 80vh;
}

/* 📱 Estilos para el lazy loading de contactos */
.contacts-container {
  scrollbar-width: thin;
  scrollbar-color: #10b981 #d1fae5;
}

.contacts-container::-webkit-scrollbar {
  width: 4px;
}

.contacts-container::-webkit-scrollbar-track {
  background: #d1fae5;
  border-radius: 2px;
}

.contacts-container::-webkit-scrollbar-thumb {
  background: #10b981;
  border-radius: 2px;
}

.contacts-container::-webkit-scrollbar-thumb:hover {
  background: #059669;
}

.contact-item {
  transition: all 0.2s ease-in-out;
}

.contact-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
}

/* 🔄 Animaciones para el lazy loading */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.contact-item {
  animation: fadeInUp 0.3s ease-out;
}

/* 📊 Estilos para la información de paginación */
.pagination-info {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.75rem;
  color: #0369a1;
  text-align: center;
  margin: 8px 0;
}

/* 📱 Estilos para el indicador de scroll automático */
.scroll-indicator {
  transition: all 0.3s ease-in-out;
}

.scroll-indicator:hover {
  transform: scale(1.05);
}

/* 🔄 Animación para el indicador de carga automática */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.1);
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* 🔤 Estilos para los controles de ordenamiento */
.sort-controls {
  transition: all 0.2s ease-in-out;
}

.sort-controls button {
  transition: all 0.2s ease-in-out;
}

.sort-controls button:hover {
  transform: translateY(-1px);
}

.sort-controls button:active {
  transform: translateY(0);
}

/* 🎯 Indicador de ordenamiento activo */
.sort-controls button.active {
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

/* 📱 Responsive para controles de ordenamiento */
@media (max-width: 640px) {
  .sort-controls .flex {
    flex-direction: column;
    space-y: 2px;
  }
  
  .sort-controls button {
    width: 100%;
    justify-content: center;
  }
}

/* 🚫 Estilos para el indicador de contactos filtrados */
.filtered-contacts-warning {
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 🎨 Estilos para el ícono de advertencia */
.filtered-contacts-warning svg {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
