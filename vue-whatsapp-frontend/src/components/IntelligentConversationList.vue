<template>
  <div class="conversation-list-container">
    <!-- 🔄 Chat activo -->
    <div v-if="activeChat" class="chat-view">
      <ConversationChat
        :conversation="activeChat"
        :session-id="sessionId"
        @back="closeChat"
      />
    </div>

    <!-- 🔄 Lista de conversaciones (cuando no hay chat activo) -->
    <div v-else class="conversations-view">
      <!-- 🔄 NUEVO: Contenedor principal con scroll -->
      <div class="sidebar-scroll-container">
        <!-- 📊 Panel de estadísticas de carga -->
        <div class="load-stats-panel bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h3 class="text-sm font-medium text-blue-800 mb-2">📊 Estadísticas de Carga Progresiva</h3>
        
        <!-- 🔍 Información de la sesión actual -->
        <div class="mb-3 p-2 bg-blue-100 rounded text-xs">
          <strong>🔍 Sesión Actual:</strong> {{ sessionId }} | 
          <strong>Estado:</strong> 
          <span v-if="isLoading" class="text-orange-600">🔄 Cargando...</span>
          <span v-else-if="contacts.length > 0" class="text-green-600">✅ Activa con {{ contacts.length }} contactos</span>
          <span v-else class="text-red-600">❌ Sin contactos</span>
        </div>
        
        <!-- ⚠️ Información sobre conversaciones -->
        <div v-if="contacts.length > 0 && contactConversations.length === 0" class="mb-3 p-2 bg-yellow-100 rounded text-xs">
          <strong>⚠️ Nota:</strong> Los contactos están cargados ({{ contacts.length }}), pero las conversaciones no están implementadas en el backend aún. 
          Esto es normal por ahora.
        </div>
        
        <!-- 🎯 ESTADO PRINCIPAL DE CONTACTOS -->
        <div v-if="contacts.length > 0" class="mb-3 p-3 bg-green-100 border border-green-300 rounded text-sm">
          <strong>🎯 CONTACTOS CARGADOS:</strong> 
          <span class="text-green-700 font-bold">{{ contacts.length }} contactos disponibles</span>
          <br>
          <span class="text-xs text-green-600">Los contactos están listos para mostrar en la pestaña "👥 Contactos"</span>
        </div>
        
        <div v-else-if="!isLoading" class="mb-3 p-3 bg-red-100 border border-red-300 rounded text-sm">
          <strong>❌ NO HAY CONTACTOS:</strong> 
          <span class="text-red-700">No se han cargado contactos aún</span>
          <br>
          <span class="text-xs text-red-600">Usa los botones de abajo para cargar contactos</span>
        </div>
        
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
        <div class="text-center">
          <div class="text-lg font-bold text-blue-600">{{ loadStats.totalLoaded }}</div>
          <div class="text-blue-500">Total</div>
        </div>
        <div class="text-center">
          <div class="text-lg font-bold text-green-600">{{ loadStats.contactsCount }}</div>
          <div class="text-green-500">Contactos</div>
        </div>
        <div class="text-center">
          <div class="text-lg font-bold text-purple-600">{{ loadStats.contactChatsCount }}</div>
          <div class="text-purple-500">Chats</div>
        </div>
        <div class="text-center">
            <div class="text-lg font-bold text-orange-600">{{ loadStats.contactConversationsCount }}</div>
            <div class="text-orange-500">Conversaciones</div>
        </div>
        <div class="text-center">
            <div class="text-lg font-bold text-red-600">{{ loadStats.nonContactConversationsCount }}</div>
            <div class="text-red-500">Otros Chats</div>
        </div>
      </div>
      <div class="mt-2 text-xs text-blue-600">
        Tiempo de carga: {{ loadStats.averageLoadTime }}ms | 
        Hit rate: {{ (loadStats.cacheHitRate * 100).toFixed(1) }}%
      </div>
    </div>

    <!-- 🔄 Botones de control -->
    <div class="control-buttons mb-4 flex flex-wrap gap-2">
      <button
        @click="loadContactsOnly"
        :disabled="isLoading"
        class="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
      >
        📱 Cargar Contactos
      </button>
      
      <button
        @click="initializeProgressiveLoading"
        :disabled="isLoading"
        class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
      >
        <span v-if="isLoading">🚀 Inicializando...</span>
        <span v-else>🚀 Inicializar Progresiva</span>
      </button>
      
      <button
        @click="startProgressiveLoad"
        :disabled="isLoading"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        <span v-if="isLoading">🔄 Cargando...</span>
        <span v-else>🔄 Carga Progresiva</span>
      </button>
        

    </div>

      <!-- 🔄 Navegación entre tipos de datos -->
      <div class="navigation-tabs mb-6 bg-white border border-gray-200 rounded-lg">
        <div class="flex border-b border-gray-200">
          <button
            @click="setActiveTab('contacts')"
            :class="[
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'contacts'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            👥 Contactos ({{ contacts.length }})
          </button>
          <button
            @click="setActiveTab('contactChats')"
            :class="[
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'contactChats'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            💬 Chats de Contactos ({{ contactChats.length }})
          </button>
          <button
            @click="setActiveTab('contactConversations')"
            :class="[
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'contactConversations'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            💬 Conversaciones de Contactos ({{ contactConversations.length }})
          </button>
          <button
            @click="setActiveTab('nonContactConversations')"
            :class="[
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'nonContactConversations'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            📱 Otros Chats ({{ nonContactConversations.length }})
          </button>
        </div>
      </div>

      <!-- 👥 Tab: Lista de Contactos -->
      <div v-if="activeTab === 'contacts'" class="contacts-section">
        <!-- 🔍 DEBUG: Mostrar información de depuración -->
        <div class="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded text-xs">
          <strong>🔍 DEBUG:</strong> 
          activeTab: {{ activeTab }} | 
          contacts.length: {{ contacts.length }} | 
          isLoading: {{ isLoading }} | 
          Tipo contacts: {{ typeof contacts }} |
          <br>
          <strong>Estado:</strong> 
          <span v-if="contacts.length > 0" class="text-green-600">✅ {{ contacts.length }} contactos cargados</span>
          <span v-else class="text-red-600">❌ Sin contactos</span>
          <br>
          <strong>Primer contacto:</strong> {{ contacts.length > 0 ? JSON.stringify(contacts[0]).substring(0, 100) + '...' : 'N/A' }}
        </div>
        
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-800 flex items-center">
            👥 Contactos Disponibles
            <span class="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
              Prioridad Alta
            </span>
            <span class="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
              💬 Chat Directo
            </span>
          </h3>
          <div class="text-sm text-gray-500">
            Haz clic en un contacto para abrir el chat directamente
          </div>
        </div>
        
        <div v-if="contacts.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="contact in contacts"
            :key="contact.id"
            @click="selectContact(contact)"
            class="contact-item bg-green-50 border border-green-200 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer hover:bg-green-100 hover:border-green-300"
          >
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                {{ contact.name.charAt(0).toUpperCase() }}
              </div>
              <div class="flex-1">
                <div class="font-medium text-gray-900">{{ contact.name }}</div>
                <div class="text-sm text-gray-600">{{ contact.phoneNumber }}</div>
                <div class="text-xs text-green-600 mt-1">💬 Haz clic para abrir chat</div>
              </div>
              <div class="text-green-500">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
            </div>
          </div>
          
          <!-- 🔄 Elemento de carga para lazy loading -->
          <div
            v-if="canLoadMoreContacts && !isLoadingMoreContacts"
            ref="loadMoreTrigger"
            class="col-span-full flex items-center justify-center py-4"
          >
            <div class="text-center">
              <div class="w-6 h-6 border-2 border-green-300 border-t-green-600 rounded-full animate-spin mx-auto mb-2"></div>
              <div class="text-sm text-green-600">Cargando más contactos...</div>
            </div>
          </div>
          
          <!-- 📊 Información de paginación -->
          <div
            v-if="contactsPaginationInfo"
            class="col-span-full text-center py-3 text-xs text-gray-500 bg-gray-50 rounded-lg"
          >
            📱 {{ contactsPaginationInfo.totalLoaded }} contactos cargados
            <span v-if="contactsPaginationInfo.hasMore" class="text-green-600">
              • Más disponibles
            </span>
            <span v-else class="text-gray-400">
              • Todos los contactos cargados
            </span>
          </div>
        </div>
        
        <div v-else-if="!isLoading" class="text-center py-8 text-gray-500">
          <div class="text-4xl mb-2">👥</div>
          <p>No hay contactos disponibles</p>
          <p class="text-sm mt-1">Haz clic en "Carga Progresiva" para comenzar</p>
        </div>
      </div>

      <!-- 💬 Tab: Chats de Contactos -->
      <div v-if="activeTab === 'contactChats'" class="contact-chats-section">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-800 flex items-center">
            💬 Chats de Contactos
            <span class="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
              Carga Progresiva
            </span>
          </h3>
          <div class="flex items-center space-x-2">
            <div class="text-sm text-gray-500">
              {{ contactChats.length }} chats cargados
            </div>
            <!-- Botón de cargar más chats deshabilitado temporalmente -->
            <span class="px-3 py-1 text-xs bg-gray-400 text-gray-600 rounded-md">
              📚 No disponible
            </span>
            <div v-if="chatPagination.isLoadingMore" class="text-xs text-purple-600">
              🔄 Cargando...
            </div>
          </div>
        </div>
        
        <div v-if="contactChats.length > 0" class="chats-list space-y-3">
          <div
            v-for="chat in contactChats"
            :key="chat.chatId"
            class="chat-item bg-purple-50 border border-purple-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer hover:bg-purple-100 hover:border-purple-300"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-2">
                  <span class="font-medium text-gray-900">
                    {{ chat.contactName || chat.phoneNumber }}
                  </span>
                  <span class="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                    💬 Chat
                  </span>
                  <span
                    v-if="chat.hasUnreadMessages"
                    class="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full"
                  >
                    📨 {{ chat.unreadCount }}
                  </span>
                </div>
                
                <div v-if="chat.lastMessage" class="text-sm text-gray-600 mt-1">
                  {{ chat.lastMessage }}
                </div>
                
                <div v-if="chat.lastMessageTime" class="text-xs text-gray-500 mt-1">
                  {{ formatDate(chat.lastMessageTime) }}
                </div>
              </div>
              

            </div>
            
            <!-- Mensajes del chat (si están cargados) -->
            <div v-if="chatMessages[chat.chatId] && chatMessages[chat.chatId].length > 0" class="mt-3 pt-3 border-t border-purple-200">
              <div class="text-xs text-purple-600 mb-2">
                💬 {{ chatMessages[chat.chatId].length }} mensajes cargados
                <span v-if="chatLoadStates[chat.chatId]?.hasMore" class="text-gray-500">
                  (puede haber más)
                </span>
              </div>
              
              <div class="space-y-2 max-h-32 overflow-y-auto">
                <div
                  v-for="message in chatMessages[chat.chatId]"
                  :key="message.id"
                  class="message-preview text-xs p-2 rounded"
                  :class="message.fromMe ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'"
                >
                  <div class="flex items-center space-x-2">
                    <span class="font-medium">{{ message.fromMe ? 'Tú' : 'Ellos' }}:</span>
                    <span class="flex-1">{{ message.body?.substring(0, 50) }}{{ (message.body && message.body.length > 50) ? '...' : '' }}</span>
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    {{ formatDate(message.timestamp) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else-if="!isLoading" class="text-center py-8 text-gray-500">
          <div class="text-4xl mb-2">💬</div>
          <p>No hay chats de contactos disponibles</p>
          <p class="text-sm mt-1">Haz clic en "Inicializar Progresiva" para comenzar</p>
        </div>
      </div>

      <!-- 💬 Tab: Conversaciones de Contactos -->
      <div v-if="activeTab === 'contactConversations'" class="contact-conversations-section">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-800 flex items-center">
            💬 Conversaciones de Contactos
            <span class="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
              Prioridad Alta
            </span>
          </h3>
          <div class="text-sm text-gray-500">
            {{ selectedContact ? `Mostrando chats de: ${selectedContact.name}` : 'Selecciona un contacto arriba' }}
          </div>
        </div>
        
        <div v-if="contactConversations.length > 0" class="conversations-list space-y-2 overflow-y-auto">
          <div
            v-for="conversation in contactConversations"
            :key="conversation.id"
            @click="openChat(conversation)"
            class="conversation-item bg-blue-50 border border-blue-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer hover:bg-blue-100 hover:border-blue-300"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-2">
                  <span class="font-medium text-gray-900">
                    {{ conversation.contactName || conversation.phoneNumber }}
                  </span>
                  <span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    📱 Contacto
                  </span>
                  <span
                    v-if="conversation.unreadCount > 0"
                    class="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full"
                  >
                    📨 {{ conversation.unreadCount }}
                  </span>
                </div>
                
                <div v-if="conversation.lastMessage" class="text-sm text-gray-600 mt-1">
                  {{ conversation.lastMessage }}
                </div>
                
                <div class="text-xs text-gray-500 mt-1">
                  {{ formatDate(conversation.lastMessageTime) }}
                </div>
              </div>
              
              <div class="text-blue-500 ml-3">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else-if="!isLoading" class="text-center py-8 text-gray-500">
          <div class="text-4xl mb-2">💬</div>
          <p>No hay conversaciones de contactos disponibles</p>
          <p class="text-sm mt-1">Selecciona un contacto para ver sus chats</p>
        </div>
      </div>

      <!-- 📱 Tab: Otras Conversaciones -->
      <div v-if="activeTab === 'nonContactConversations'" class="non-contact-conversations-section">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-800 flex items-center">
            📱 Otras Conversaciones
            <span class="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
              Prioridad Baja
            </span>
          </h3>
          <div class="text-sm text-gray-500">
            Chats que no son contactos agregados
          </div>
        </div>
        
        <div v-if="nonContactConversations.length > 0" class="conversations-list space-y-2">
          <div
            v-for="conversation in nonContactConversations"
            :key="conversation.id"
            @click="openChat(conversation)"
            class="conversation-item bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer hover:bg-gray-100 hover:border-gray-300"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-2">
                  <span class="font-medium text-gray-900">
                    {{ conversation.contactName || conversation.phoneNumber }}
                  </span>
                  <span class="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                    📱 No Contacto
                  </span>
                  <span
                    v-if="conversation.unreadCount > 0"
                    class="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full"
                  >
                    📨 {{ conversation.unreadCount }}
                  </span>
                </div>
                
                <div v-if="conversation.lastMessage" class="text-sm text-gray-600 mt-1">
                  {{ conversation.lastMessage }}
                </div>
                
                <div class="text-xs text-gray-500 mt-1">
                  {{ formatDate(conversation.lastMessageTime) }}
                </div>
              </div>
              
              <div class="text-gray-500 ml-3">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else-if="!isLoading" class="text-center py-8 text-gray-500">
          <div class="text-4xl mb-2">📱</div>
          <p>No hay otras conversaciones disponibles</p>
          <p class="text-sm mt-1">Estas aparecerán después de cargar los contactos</p>
        </div>
      </div>

      <!-- 📱 Lista de Conversaciones (Legacy - mantenida para compatibilidad) -->
      <div v-if="conversations.length > 0 && !contacts.length && !contactConversations.length" class="conversations-list space-y-2">
      <div
        v-for="conversation in conversations"
        :key="conversation.id"
        class="conversation-item bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <div class="flex items-center space-x-2">
              <span class="font-medium text-gray-900">
                {{ conversation.contactName || conversation.phoneNumber }}
              </span>
              <span
                v-if="conversation.isContact"
                class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full"
              >
                📱 Contacto
              </span>
              <span
                v-if="conversation.unreadCount > 0"
                class="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full"
              >
                📨 {{ conversation.unreadCount }}
              </span>
            </div>
            
            <div v-if="conversation.lastMessage" class="text-sm text-gray-600 mt-1">
              {{ conversation.lastMessage }}
            </div>
            
            <div class="text-xs text-gray-500 mt-1">
              {{ formatDate(conversation.lastMessageTime) }}
            </div>
          </div>
        </div>
      </div>
    </div>

      <!-- 📊 Indicador de carga -->
      <div v-if="isLoading" class="loading-indicator text-center py-8">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-4 text-gray-600">{{ loadingMessage }}</p>
    </div>

      <!-- 📊 Mensaje cuando no hay datos -->
      <div v-if="!isLoading && !contacts.length && !contactConversations.length && !nonContactConversations.length && !conversations.length" class="no-data text-center py-8">
        <div class="text-gray-400 text-6xl mb-4">📱</div>
        <p class="text-gray-600">No hay conversaciones disponibles</p>
        <p class="text-sm text-gray-500 mt-2">Haz clic en "Carga Progresiva" para comenzar</p>
      </div>

      <!-- 🔄 Trigger para lazy loading -->
      <div ref="lazyLoadTrigger" class="h-4"></div>
        </div> <!-- 🔄 Cierre del sidebar-scroll-container -->
      </div> <!-- 🔄 Cierre del conversations-view -->
    </div> <!-- 🔄 Cierre del conversation-list-container -->
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { Conversation } from '../types'
import ConversationChat from './ConversationChat.vue'
import { Message } from '../types' // Added Message import

export default defineComponent({
  name: 'IntelligentConversationList',
  components: {
    ConversationChat
  },
  props: {
    sessionId: { type: String, required: true }
  },
  setup(props) {
    const store = useStore()
    const isLoading = ref(false)
    const isLoadingMore = ref(false)
    const conversations = ref<Conversation[]>([])
    
    // 🔄 NUEVO: Variables para carga progresiva
    const contacts = ref<Array<{ id: string; name: string; phoneNumber: string; isContact: boolean }>>([])
    const contactConversations = ref<Conversation[]>([])
    const nonContactConversations = ref<Conversation[]>([])
    const loadingMessage = ref('')
    
    // 🔄 NUEVO: Variables para navegación y selección
    const activeTab = ref<'contacts' | 'contactChats' | 'contactConversations' | 'nonContactConversations'>('contacts')
    const selectedContact = ref<{ id: string; name: string; phoneNumber: string; isContact: boolean } | null>(null)
    const selectedConversation = ref<Conversation | null>(null)
    
    // 🔄 NUEVO: Variable para chat activo
    const activeChat = ref<Conversation | null>(null)
    
    const lazyLoadTrigger = ref<HTMLElement | null>(null)

    // Variables reactivas para el estado de los chats
    const contactChats = ref<Array<{
      chatId: string;
      contactId: string;
      contactName: string;
      phoneNumber: string;
      lastMessage?: string;
      lastMessageTime?: Date;
      unreadCount: number;
      hasUnreadMessages: boolean;
      isContact: boolean;
    }>>([])
    
    const chatMessages = ref<{ [chatId: string]: Message[] }>({})
    const chatLoadStates = ref<{ [chatId: string]: { isLoading: boolean; hasMore: boolean; totalLoaded: number } }>({})
    
    // Variables para paginación de chats
    const chatPagination = ref({
      currentPage: 0,
      hasMore: true,
      isLoadingMore: false
    })

    // Computed properties
    const canLoadMore = computed(() => store.state.whatsapp.canLoadMore)
    
    // 🔄 NUEVO: Computed properties para paginación de contactos
    const canLoadMoreContacts = computed(() => store.getters['whatsapp/canLoadMoreContacts'])
    const contactsPaginationInfo = computed(() => store.getters['whatsapp/contactsPaginationInfo'])
    const isLoadingMoreContacts = computed(() => store.state.whatsapp.contactsPagination.isLoadingMore)
    
    const loadStats = computed(() => {
      const totalLoaded = contacts.value.length + contactChats.value.length + contactConversations.value.length + nonContactConversations.value.length
      const contactsCount = contacts.value.length
      const contactChatsCount = contactChats.value.length
      const contactConversationsCount = contactConversations.value.length
      const nonContactConversationsCount = nonContactConversations.value.length
      
      return {
        totalLoaded,
        contactsCount,
        contactChatsCount,
        contactConversationsCount,
        nonContactConversationsCount,
        averageLoadTime: 0, // TODO: Implementar cálculo de tiempo promedio
        cacheHitRate: 0.8   // TODO: Implementar cálculo de hit rate
      }
    })

    // Métodos
    const startProgressiveLoad = async () => {
      try {
        isLoading.value = true
        loadingMessage.value = '🔄 Iniciando carga progresiva...'
        
        console.log('🔄 Componente: Iniciando carga progresiva')
        
        // 🔄 SOLUCIÓN: Solo cargar contactos por ahora (las conversaciones dan 404)
        console.log('📱 Cargando solo contactos (las conversaciones no están implementadas en el backend)')
        const contactsResult = await store.dispatch('whatsapp/getContacts', props.sessionId)
        
        // Actualizar las variables reactivas
        contacts.value = contactsResult || []
        contactConversations.value = [] // Vaciar porque no existen
        nonContactConversations.value = [] // Vaciar porque no existen
        
        console.log('✅ Componente: Carga progresiva completada (solo contactos):', {
          contacts: contacts.value.length,
          contactConversations: contactConversations.value.length,
          nonContactConversations: nonContactConversations.value.length
        })
        
        // Cambiar automáticamente a la pestaña de contactos
        activeTab.value = 'contacts'
        
        loadingMessage.value = '✅ Contactos cargados correctamente'
        
        // Limpiar el mensaje después de 3 segundos
        setTimeout(() => {
          loadingMessage.value = ''
        }, 3000)
        
      } catch (error) {
        console.error('❌ Error en carga progresiva:', error)
        loadingMessage.value = '❌ Error en la carga'
      } finally {
        isLoading.value = false
      }
    }





    // 🔄 NUEVO: Inicializar carga progresiva completa
    const initializeProgressiveLoading = async () => {
      try {
        isLoading.value = true
        loadingMessage.value = '🔄 Inicializando carga progresiva...'
        
        console.log('🔄 Componente: Inicializando carga progresiva completa')
        console.log('🔄 Estado inicial de variables:', {
          contacts: contacts.value.length,
          contactChats: contactChats.value.length,
          contactConversations: contactConversations.value.length,
          nonContactConversations: nonContactConversations.value.length
        })
        
        // Fase 1: Cargar contactos
        loadingMessage.value = '📱 Fase 1: Cargando contactos...'
        console.log('📱 Fase 1: Llamando a getContacts...')
        const contactsResult = await store.dispatch('whatsapp/getContacts', props.sessionId)
        console.log('📱 Fase 1: Resultado de getContacts:', contactsResult)
        console.log('📱 Fase 1: Tipo de resultado:', typeof contactsResult)
        console.log('📱 Fase 1: Es array:', Array.isArray(contactsResult))
        
        contacts.value = contactsResult || []
        console.log('📱 Fase 1: Contactos asignados a contacts.value:', contacts.value)
        console.log('📱 Fase 1: Longitud de contacts.value:', contacts.value.length)
        
        // 🔄 SOLUCIÓN: Saltar las fases 2 y 3 porque los endpoints no existen
        console.log('⚠️ Fases 2 y 3 omitidas: los endpoints de conversaciones dan 404')
        contactConversations.value = []
        nonContactConversations.value = []
        
        console.log('✅ Componente: Carga progresiva inicializada (solo contactos):', {
          contacts: contacts.value.length,
          contactChats: contactChats.value.length,
          contactConversations: contactConversations.value.length,
          nonContactConversations: nonContactConversations.value.length
        })
        
        // Cambiar a la pestaña de contactos
        activeTab.value = 'contacts'
        console.log('🔄 Tab activo cambiado a:', activeTab.value)
        
        loadingMessage.value = '✅ Contactos cargados correctamente'
        
        // Limpiar el mensaje después de 3 segundos
        setTimeout(() => {
          loadingMessage.value = ''
        }, 3000)
        
      } catch (error) {
        console.error('❌ Error inicializando carga progresiva:', error)
        loadingMessage.value = '❌ Error en la inicialización'
      } finally {
        isLoading.value = false
      }
    }
    



    
    // 🔄 NUEVO: Métodos para navegación y selección
    const setActiveTab = (tab: 'contacts' | 'contactChats' | 'contactConversations' | 'nonContactConversations') => {
      activeTab.value = tab
    }
    
    const selectContact = (contact: { id: string; name: string; phoneNumber: string; isContact: boolean }) => {
      // 🔄 NUEVO: Crear conversación temporal y abrir chat directamente
      const tempConversation: Conversation = {
        id: `temp_${contact.id}`,
        sessionId: props.sessionId,
        phoneNumber: contact.phoneNumber,
        contactName: contact.name,
        lastMessage: '',
        lastMessageTime: new Date(),
        unreadCount: 0,
        isGroup: false,
        isContact: contact.isContact,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      // Abrir el chat directamente
      activeChat.value = tempConversation
      
      console.log('👥 Contacto seleccionado y chat abierto:', contact)
    }
    

    
    const openChat = (conversation: Conversation) => {
      activeChat.value = conversation
      console.log('📱 Abriendo chat:', conversation)
    }
    
    const closeChat = () => {
      activeChat.value = null
      console.log('🔙 Cerrando chat')
    }
    






    // �� NUEVO: Método para cargar solo contactos
    const loadContactsOnly = async () => {
      try {
        isLoading.value = true
        loadingMessage.value = '📱 Cargando solo contactos...'
        
        console.log('📱 Componente: Cargando solo contactos')
        console.log('📱 SessionId a usar:', props.sessionId)
        
        // Verificar que tenemos un sessionId válido
        if (!props.sessionId) {
          throw new Error('No hay sessionId válido')
        }
        
        const contactsResult = await store.dispatch('whatsapp/getContacts', props.sessionId)
        console.log('📱 Resultado de getContacts:', contactsResult)
        console.log('📱 Tipo de resultado:', typeof contactsResult)
        console.log('📱 Es array:', Array.isArray(contactsResult))
        console.log('📱 Longitud del resultado:', contactsResult ? contactsResult.length : 'undefined')
        
        // Asignar a la variable reactiva
        contacts.value = contactsResult || []
        console.log('📱 Contactos asignados a contacts.value:', contacts.value)
        console.log('📱 Longitud de contacts.value:', contacts.value.length)
        console.log('📱 Primer contacto:', contacts.value.length > 0 ? contacts.value[0] : 'N/A')
        
        // Cambiar a la pestaña de contactos
        activeTab.value = 'contacts'
        console.log('🔄 Tab activo cambiado a:', activeTab.value)
        
        // Mostrar mensaje de éxito
        if (contacts.value.length > 0) {
          loadingMessage.value = `✅ ${contacts.value.length} contactos cargados correctamente`
        } else {
          loadingMessage.value = '⚠️ No se encontraron contactos'
        }
        
        // Limpiar el mensaje después de 3 segundos
        setTimeout(() => {
          loadingMessage.value = ''
        }, 3000)
        
      } catch (error) {
        console.error('❌ Error cargando solo contactos:', error)
        loadingMessage.value = '❌ Error cargando contactos: ' + (error instanceof Error ? error.message : 'Error desconocido')
        
        // Limpiar el mensaje después de 5 segundos
        setTimeout(() => {
          loadingMessage.value = ''
        }, 5000)
      } finally {
        isLoading.value = false
      }
    }



    // 🔄 Función para formatear fechas
    const formatDate = (date: string | Date | undefined): string => {
      if (!date) return 'Sin fecha'
      
      const dateObj = typeof date === 'string' ? new Date(date) : date
      
      if (isNaN(dateObj.getTime())) return 'Fecha inválida'
      
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - dateObj.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) {
        return 'Ayer'
      } else if (diffDays < 7) {
        return `Hace ${diffDays} días`
      } else {
        return dateObj.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit'
        })
      }
    }





    // Lifecycle
    onMounted(async () => {
      console.log('🚀 Componente IntelligentConversationList montado')
      console.log('🚀 SessionId recibido:', props.sessionId)
      
      // 🔄 NUEVO: Configurar observer para lazy loading de contactos
      const setupContactsObserver = () => {
        const loadMoreTrigger = document.querySelector('[ref="loadMoreTrigger"]')
        if (loadMoreTrigger) {
          const observer = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting && canLoadMoreContacts.value && !isLoadingMoreContacts.value) {
                  console.log('👁️ Trigger de lazy loading detectado, pero función no implementada')
                  // TODO: Implementar loadMoreContacts si es necesario
                }
              })
            },
            { threshold: 0.1, rootMargin: '100px' }
          )
          
          observer.observe(loadMoreTrigger)
          
          // Cleanup function
          onUnmounted(() => {
            observer.disconnect()
          })
          
          console.log('✅ Observer de lazy loading para contactos configurado')
        }
      }
      
      // 🔄 SOLUCIÓN DIRECTA: Cargar contactos inmediatamente
      try {
        console.log('📱 Cargando contactos directamente al montar el componente...')
        await loadContactsOnly()
        
        // 🔄 NUEVO: Configurar observer después de cargar contactos
        setTimeout(() => {
          setupContactsObserver()
        }, 100)
        
      } catch (error) {
        console.error('❌ Error cargando contactos al montar:', error)
        loadingMessage.value = '❌ Error cargando contactos al iniciar'
      }
    })

    return {
      isLoading, isLoadingMore, conversations, lazyLoadTrigger, canLoadMore, loadStats,
      // 🔄 NUEVO: Variables para carga progresiva
      contacts, contactConversations, nonContactConversations, loadingMessage,
      // 🔄 NUEVO: Variables para navegación y selección
      activeTab, selectedContact, selectedConversation,
      // 🔄 NUEVO: Variable para chat activo
      activeChat,
      startProgressiveLoad,
      // 🔄 NUEVO: Métodos para navegación y selección
      setActiveTab, selectContact, openChat, closeChat,
      formatDate,
      // 🔄 NUEVO: Variables reactivas para el estado de los chats
      contactChats, chatMessages, chatLoadStates, chatPagination,
      // 🔄 NUEVO: Inicializar carga progresiva completa
      initializeProgressiveLoading,
      loadContactsOnly,
      // 🔄 NUEVO: Propiedades de paginación de contactos
      canLoadMoreContacts, contactsPaginationInfo, isLoadingMoreContacts
    }
  }
})
</script>

<style scoped>
.conversation-list-container {
  max-width: 800px;
  margin: 0 auto;
  height: 100vh; /* 🔄 NUEVO: Altura completa del viewport */
  display: flex;
  flex-direction: column;
}

/* 🔄 NUEVO: Chat activo ocupa todo el espacio */
.chat-view {
  flex: 1;
  overflow: hidden;
}

/* 🔄 NUEVO: Vista de conversaciones con layout flexible */
.conversations-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 🔄 NUEVO: Contenedor principal con scroll */
.sidebar-scroll-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1rem;
  
  /* 🔄 NUEVO: Estilos de scroll personalizados */
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 #f7fafc;
}

/* 🔄 NUEVO: Estilos de scroll para WebKit (Chrome, Safari, Edge) */
.sidebar-scroll-container::-webkit-scrollbar {
  width: 8px;
}

.sidebar-scroll-container::-webkit-scrollbar-track {
  background: #f7fafc;
  border-radius: 4px;
}

.sidebar-scroll-container::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 4px;
  transition: background 0.2s ease;
}

.sidebar-scroll-container::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

/* 🔄 NUEVO: Contenedor de estadísticas fijo en la parte superior */
.load-stats-panel {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #eff6ff;
  backdrop-filter: blur(8px);
  margin: -1rem -1rem 1rem -1rem;
  padding: 1rem;
  border-radius: 0.5rem 0.5rem 0 0;
}

/* 🔄 NUEVO: Botones de control fijos */
.control-buttons {
  position: sticky;
  top: 0;
  z-index: 9;
  background: white;
  padding: 1rem 0;
  margin: 0 -1rem 1rem -1rem;
  padding-left: 1rem;
  padding-right: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

/* 🔄 NUEVO: Navegación de pestañas fija */
.navigation-tabs {
  position: sticky;
  top: 0;
  z-index: 8;
  background: white;
  margin: 0 -1rem 1.5rem -1rem;
  padding: 0 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.conversation-item {
  cursor: pointer;
  transition: all 0.2s ease;
}

.conversation-item:hover {
  transform: translateY(-1px);
}

.lazy-load-trigger {
  border-top: 2px dashed #e5e7eb;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 🔄 NUEVO: Responsive design para el sidebar */
@media (max-width: 768px) {
  .conversation-list-container {
    max-width: 100%;
    height: 100vh;
  }
  
  .sidebar-scroll-container {
    padding: 0.5rem;
  }
  
  .load-stats-panel,
  .control-buttons,
  .navigation-tabs {
    margin-left: -0.5rem;
    margin-right: -0.5rem;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }
}

/* 🔄 NUEVO: Animaciones suaves para el scroll */
.sidebar-scroll-container {
  scroll-behavior: smooth;
}

/* 🔄 NUEVO: Estilos para elementos dentro del scroll */
.contacts-section,
.contact-chats-section,
.contact-conversations-section,
.non-contact-conversations-section {
  padding-bottom: 2rem;
}
</style>
