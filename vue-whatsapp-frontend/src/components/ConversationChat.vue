<template>
  <div class="conversation-chat-container">
    <!-- 🎯 Header de la conversación -->
    <div class="chat-header bg-white border-b border-gray-200 p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <button
            @click="$emit('back')"
            class="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
          
          <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
               :class="conversation.isContact ? 'bg-green-500' : 'bg-gray-500'">
            {{ getInitials(conversation.contactName || conversation.phoneNumber) }}
          </div>
          
          <div>
            <h3 class="font-semibold text-gray-900">
              {{ conversation.contactName || conversation.phoneNumber }}
            </h3>
            <p class="text-sm text-gray-500">
              {{ conversation.isContact ? 'Contacto' : 'No Contacto' }} • 
              {{ conversation.unreadCount > 0 ? `${conversation.unreadCount} no leídos` : 'Todos leídos' }}
            </p>
          </div>
        </div>
        
        <div class="flex items-center space-x-2">
          <span class="px-2 py-1 text-xs rounded-full"
                :class="conversation.isContact ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'">
            {{ conversation.isContact ? '📱 Contacto' : '📱 No Contacto' }}
          </span>
          
          <!-- 🔄 NUEVO: Botón de debug para verificar estado del store -->
          <button
            @click="debugStoreState"
            class="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200 transition-colors"
            title="Debug estado del store"
          >
            🐛 Debug
          </button>
          
          <!-- 🔄 NUEVO: Botón para forzar sincronización -->
          <button
            @click="forceSyncWithStore"
            class="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full hover:bg-orange-200 transition-colors"
            title="Forzar sincronización con el store"
          >
            🔄 Sync
          </button>
          
          <!-- 🔄 NUEVO: Botón para verificar mutaciones -->
          <button
            @click="debugMutations"
            class="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full hover:bg-red-200 transition-colors"
            title="Debug mutaciones del store"
          >
            🔍 Mutations
          </button>
          
          <!-- 🔄 NUEVO: Botón para verificar sincronización del backend -->
          <button
            @click="debugBackendSync"
            class="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200 transition-colors"
            title="Debug sincronización con backend"
          >
            🔗 Backend
          </button>
          
          <!-- 🔄 NUEVO: Botón para sincronización forzada -->
          <button
            @click="() => forceSyncMessagesToStore()"
            class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition-colors"
            title="Sincronización forzada de mensajes"
          >
            🔄 Force Sync
          </button>
        </div>
      </div>
      
      <!-- 🔍 Barra de búsqueda de mensajes -->
      <div class="mt-3">
        <div class="relative">
          <input
            v-model="searchQuery"
            @input="onSearchInput"
            @keydown.enter="searchMessages(searchQuery)"
            type="text"
            placeholder="🔍 Buscar en mensajes..."
            class="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          <button
            v-if="searchQuery"
            @click="clearSearch"
            class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <!-- 🔄 NUEVO: Indicador de mensajes nuevos -->
        <div v-if="hasNewMessages" class="mt-2 text-center">
          <div class="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full animate-pulse">
            <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Nuevos mensajes recibidos
          </div>
        </div>
      </div>
    </div>

    <!-- 📱 Área de mensajes -->
    <div class="messages-area flex-1 overflow-y-auto p-4 bg-gray-50">
      <div v-if="isLoadingMessages" class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-2 text-gray-600">
          {{ searchQuery ? 'Buscando mensajes...' : 'Cargando mensajes...' }}
        </p>
      </div>
      
      <div v-else-if="storeMessages.length === 0" class="text-center py-8 text-gray-500">
        <div class="text-4xl mb-2">💬</div>
        <p v-if="searchQuery">No se encontraron mensajes para "{{ searchQuery }}"</p>
        <p v-else>No hay mensajes en esta conversación</p>
        <p class="text-sm mt-1" v-if="!searchQuery">¡Sé el primero en escribir!</p>
      </div>
      
      <div v-else class="space-y-3">
        <!-- 🔍 Indicador de búsqueda activa -->
        <div v-if="searchQuery" class="text-center py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <p class="text-sm text-blue-700">
            🔍 Mostrando resultados para "{{ searchQuery }}" ({{ storeMessages.length }} mensajes)
          </p>
        </div>
        
        <div
          v-for="message in storeMessages"
          :key="message.id"
          class="message-item"
          :class="message.fromMe ? 'message-outgoing' : 'message-incoming'"
        >
          <div class="flex" :class="message.fromMe ? 'justify-end' : 'justify-start'">
            <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg"
                 :class="message.fromMe 
                   ? 'bg-blue-600 text-white' 
                   : 'bg-white text-gray-900 border border-gray-200'">
              <div class="message-content">
                <p class="text-sm">{{ message.body }}</p>
                <div class="flex items-center justify-between mt-1">
                  <span class="text-xs opacity-75">
                    {{ formatMessageTime(message.timestamp) }}
                  </span>
                  <span v-if="message.fromMe" class="text-xs opacity-75">
                    {{ getMessageStatus(message.status) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 🔄 Botón para cargar más mensajes -->
        <div v-if="!searchQuery && storeMessages.length > 0" class="text-center py-4">
          <button
            @click="loadMoreMessages"
            :disabled="isLoadingMore"
            class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="isLoadingMore">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mx-auto"></div>
            </span>
            <span v-else>📚 Cargar más mensajes</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 📝 Área de escritura -->
    <div class="message-input-area bg-white border-t border-gray-200 p-4">
      <div class="flex items-center space-x-3">
        <div class="flex-1">
          <textarea
            v-model="newMessage"
            @keydown.enter.prevent="sendMessage"
            placeholder="Escribe un mensaje..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows="2"
          ></textarea>
        </div>
        
        <button
          @click="sendMessage"
          :disabled="!newMessage.trim() || isSending"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span v-if="isSending">📤</span>
          <span v-else>📤</span>
        </button>
      </div>
      
      <div v-if="isSending" class="mt-2 text-sm text-gray-500 text-center">
        Enviando mensaje...
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, computed, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { Conversation, Message } from '../types'
import { whatsAppService } from '../services/whatsAppService'
import { socketService } from '../services/socketService'

export default defineComponent({
  name: 'ConversationChat',
  props: {
    conversation: {
      type: Object as () => Conversation,
      required: true
    },
    sessionId: {
      type: String,
      required: true
    }
  },
  emits: ['back'],
  setup(props) {
    const store = useStore()
    const messages = ref<Message[]>([])
    const newMessage = ref('')
    const isLoadingMessages = ref(false)
    const isSending = ref(false)
    const searchQuery = ref('')
    const isLoadingMore = ref(false)
    const hasNewMessages = ref(false)
    let searchTimeout: NodeJS.Timeout | null = null

    // Cargar mensajes cuando se monta el componente o cambia la conversación
    const loadMessages = async () => {
      try {
        isLoadingMessages.value = true
        console.log(`📱 Cargando mensajes para: ${props.conversation.contactName || props.conversation.phoneNumber}`)
        
        // Usar el nuevo método fetchChatMessages que consume el endpoint del backend
        const loadedMessages = await whatsAppService.fetchChatMessages(
          props.sessionId,
          props.conversation.phoneNumber, // Usar phoneNumber como chatId
          100, // 🔄 IMPORTANTE: Límite de 100 para obtener todos los mensajes disponibles
          true  // Incluir mensajes propios
        )
        
        // 🔄 NUEVO: Sincronizar mensajes del backend con el store
        if (loadedMessages.length > 0) {
          console.log(`🔄 Sincronizando ${loadedMessages.length} mensajes del backend con el store`)
          
          // 🔍 DEBUG: Verificar conversationId que se está usando
          const conversationId = getConversationId()
          console.log(`🔍 ConversationId para sincronización: ${conversationId}`)
          
          // Agregar cada mensaje al store usando la mutación ADD_MESSAGE
          for (const message of loadedMessages) {
            try {
              // Verificar si el mensaje ya existe en el store
              const existingMessages = store.state.whatsapp.messages[conversationId] || []
              const messageExists = existingMessages.some((m: Message) => m.id === message.id)
              
              if (!messageExists) {
                console.log(`📥 Agregando mensaje del backend al store: ${message.id} - "${message.body?.substring(0, 30)}..."`)
                
                // 🔄 IMPORTANTE: Asegurar que el mensaje tenga el formato correcto para el store
                const messageForStore = {
                  ...message,
                  sessionId: props.sessionId,
                  // 🔍 DEBUG: Verificar que el mensaje tenga todos los campos necesarios
                  id: message.id,
                  fromMe: message.fromMe,
                  from: message.from,
                  to: message.to,
                  body: message.body || '',
                  type: message.type || 'text',
                  status: message.status || 'delivered',
                  timestamp: message.timestamp ? new Date(message.timestamp) : new Date()
                }
                
                console.log(`📤 Mensaje preparado para store:`, messageForStore)
                
                // 🔄 IMPORTANTE: Usar commit directo para evitar problemas de async
                store.commit('whatsapp/ADD_MESSAGE', messageForStore)
                
                console.log(`✅ Mensaje agregado exitosamente al store: ${message.id}`)
              } else {
                console.log(`✅ Mensaje ya existe en store: ${message.id}`)
              }
            } catch (error) {
              console.error(`❌ Error agregando mensaje ${message.id} al store:`, error)
            }
          }
          
          console.log(`✅ Sincronización completada: ${loadedMessages.length} mensajes procesados`)
          
          // 🔍 DEBUG: Verificar estado final del store
          const finalMessages = store.state.whatsapp.messages[conversationId] || []
          console.log(`🔍 Estado final del store para ${conversationId}: ${finalMessages.length} mensajes`)
        }
        
        // Actualizar mensajes locales
        messages.value = loadedMessages
        console.log(`✅ Mensajes cargados: ${loadedMessages.length}`)
        
      } catch (error) {
        console.error('❌ Error cargando mensajes:', error)
      } finally {
        isLoadingMessages.value = false
      }
    }

    // 🔄 NUEVO: Cargar más mensajes usando el endpoint on-demand
    const loadMoreMessages = async () => {
      try {
        isLoadingMore.value = true
        console.log(`📚 Cargando más mensajes para: ${props.conversation.contactName || props.conversation.phoneNumber}`)
        
        const result = await whatsAppService.loadChatMessagesOnDemand(
          props.sessionId,
          props.conversation.phoneNumber,
          messages.value.length,
          100 // 🔄 IMPORTANTE: Límite de 100 para consistencia con loadMessages() y obtener todos los mensajes
        )
        
        // 🔄 NUEVO: Sincronizar mensajes adicionales con el store
        if (result.messages.length > 0) {
          console.log(`🔄 Sincronizando ${result.messages.length} mensajes adicionales con el store`)
          
          result.messages.forEach((message) => {
            const conversationId = getConversationId()
            const existingMessages = store.state.whatsapp.messages[conversationId] || []
            const messageExists = existingMessages.some((m: Message) => m.id === message.id)
            
            if (!messageExists) {
              console.log(`📥 Agregando mensaje adicional al store: ${message.id}`)
              
              // 🔄 IMPORTANTE: Usar commit directo para evitar problemas de async
              store.commit('whatsapp/ADD_MESSAGE', {
                ...message,
                sessionId: props.sessionId
              })
            }
          })
          
          console.log(`✅ Sincronización de mensajes adicionales completada`)
        }
        
        // Agregar los nuevos mensajes al inicio (mensajes más antiguos)
        messages.value = [...result.messages, ...messages.value]
        console.log(`✅ Mensajes adicionales cargados: ${result.messages.length}, total: ${messages.value.length}`)
        
      } catch (error) {
        console.error('❌ Error cargando más mensajes:', error)
      } finally {
        isLoadingMore.value = false
      }
    }

    // 🔄 NUEVO: Cargar mensajes con filtros avanzados
    const loadMessagesAdvanced = async (options: {
      limit?: number;
      includeFromMe?: boolean;
      fromDate?: Date;
      toDate?: Date;
      messageType?: string;
      searchText?: string;
    } = {}) => {
      try {
        isLoadingMessages.value = true
        console.log(`🔍 Cargando mensajes avanzados para: ${props.conversation.contactName || props.conversation.phoneNumber}`)
        
        const loadedMessages = await whatsAppService.fetchChatMessagesAdvanced(
          props.sessionId,
          props.conversation.phoneNumber,
          options
        )
        
        // 🔄 NUEVO: Sincronizar mensajes avanzados con el store
        if (loadedMessages.length > 0) {
          console.log(`🔄 Sincronizando ${loadedMessages.length} mensajes avanzados con el store`)
          
          loadedMessages.forEach(async (message) => {
            const conversationId = getConversationId()
            const existingMessages = store.state.whatsapp.messages[conversationId] || []
            const messageExists = existingMessages.some((m: Message) => m.id === message.id)
            
            if (!messageExists) {
              console.log(`📥 Agregando mensaje avanzado al store: ${message.id}`)
              
              // 🔄 IMPORTANTE: Usar commit directo para evitar problemas de async
              store.commit('whatsapp/ADD_MESSAGE', {
                ...message,
                sessionId: props.sessionId
              })
            }
          })
          
          console.log(`✅ Sincronización de mensajes avanzados completada`)
        }
        
        messages.value = loadedMessages
        console.log(`✅ Mensajes avanzados cargados: ${loadedMessages.length}`)
        
      } catch (error) {
        console.error('❌ Error cargando mensajes avanzados:', error)
      } finally {
        isLoadingMessages.value = false
      }
    }

    // 🔄 NUEVO: Buscar mensajes por texto con debounce
    const searchMessages = async (searchText: string) => {
      if (!searchText.trim()) {
        await loadMessages() // Si no hay texto de búsqueda, cargar todos los mensajes
        return
      }
      
      await loadMessagesAdvanced({
        limit: 200, // Aumentar límite para búsquedas
        searchText: searchText.trim(),
        includeFromMe: true
      })
    }

    // 🔄 NUEVO: Búsqueda con debounce para evitar demasiadas llamadas al API
    const onSearchInput = () => {
      // Limpiar timeout anterior
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
      
      // Establecer nuevo timeout para búsqueda
      searchTimeout = setTimeout(() => {
        if (searchQuery.value.trim()) {
          searchMessages(searchQuery.value)
        } else {
          loadMessages()
        }
      }, 500) // Esperar 500ms después de que el usuario deje de escribir
    }

    const clearSearch = () => {
      searchQuery.value = ''
      if (searchTimeout) {
        clearTimeout(searchTimeout)
        searchTimeout = null
      }
      loadMessages()
    }

    // Enviar mensaje
    const sendMessage = async () => {
      if (!newMessage.value.trim() || isSending.value) return
      
      try {
        isSending.value = true
        console.log(`📤 Enviando mensaje a: ${props.conversation.phoneNumber}`)
        
        // 🔄 NUEVO: Usar el store para enviar mensajes (esto actualizará automáticamente el estado)
        await store.dispatch('whatsapp/sendMessage', {
          sessionId: props.sessionId,
          to: props.conversation.phoneNumber,
          body: newMessage.value.trim()
        })
        
        // Limpiar el input
        newMessage.value = ''
        
        console.log('✅ Mensaje enviado exitosamente a través del store')
        
        // 🔄 NUEVO: Los mensajes se actualizarán automáticamente desde el store
        
      } catch (error) {
        console.error('❌ Error enviando mensaje:', error)
      } finally {
        isSending.value = false
      }
    }

    // Utilidades
    const getInitials = (name: string): string => {
      return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }

    const formatMessageTime = (timestamp: Date): string => {
      return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }

    const getMessageStatus = (status: string): string => {
      const statusMap: Record<string, string> = {
        'SENT': '✓',
        'DELIVERED': '✓✓',
        'READ': '✓✓',
        'FAILED': '✗'
      }
      return statusMap[status] || status
    }

    // 🔄 NUEVO: Función helper para normalizar números de teléfono (igual que el store)
    const normalizePhoneNumber = (phone: string): string => {
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
    
    // 🔄 NUEVO: Función helper para generar conversationId consistente
    const getConversationId = (): string => {
      if (!props.conversation?.phoneNumber) return ''
      const normalizedPhone = normalizePhoneNumber(props.conversation.phoneNumber)
      return `${props.sessionId}_${normalizedPhone}`
    }

    // 🔄 NUEVO: Computed property para mensajes en tiempo real del store
    const storeMessages = computed(() => {
      if (!props.conversation?.phoneNumber) return []
      
      // 🔄 NUEVO: Usar la función helper para generar conversationId consistente
      const conversationId = getConversationId()
      
      // 🔄 NUEVO: Acceder al estado del store de forma más reactiva
      const storeState = store.state.whatsapp
      const storeMessages = storeState.messages[conversationId] || []
      
      console.log(`🔍 ConversationChat: Computed storeMessages ejecutado:`, {
        originalPhone: props.conversation.phoneNumber,
        normalizedPhone: normalizePhoneNumber(props.conversation.phoneNumber),
        conversationId,
        storeMessagesLength: storeMessages.length,
        storeMessagesIds: storeMessages.map((m: Message) => m.id),
        storeStateKeys: Object.keys(storeState.messages),
        // 🔍 DEBUG: Mostrar todos los conversationIds disponibles en el store
        allConversationIds: Object.keys(storeState.messages),
        // 🔍 DEBUG: Mostrar mensajes de todas las conversaciones
        allMessages: Object.entries(storeState.messages).map(([id, msgs]) => ({
          conversationId: id,
          messageCount: (msgs as Message[]).length,
          firstMessage: (msgs as Message[])[0]?.body?.substring(0, 20) || 'N/A'
        }))
      })
      
      return storeMessages
        .filter((msg: Message) => msg && msg.id)
        .sort((a: Message, b: Message) => {
          const timeA = new Date(a.timestamp).getTime()
          const timeB = new Date(b.timestamp).getTime()
          return timeA - timeB
        })
    })

    // Lifecycle
    onMounted(() => {
      // 🔄 NUEVO: Primero verificar si hay mensajes en el store
      const storeMessagesList = storeMessages.value
      console.log(`🔌 ConversationChat: Al montar, mensajes en store: ${storeMessagesList.length}`)
      
      if (storeMessagesList.length > 0) {
        // Si hay mensajes en el store, usarlos directamente
        console.log(`✅ ConversationChat: Usando mensajes del store: ${storeMessagesList.length}`)
        messages.value = [...storeMessagesList]
      } else {
        // Solo cargar del backend si no hay mensajes en el store
        console.log(`📱 ConversationChat: No hay mensajes en store, cargando del backend`)
        loadMessages()
      }
      
      // 🔄 NUEVO: Unirse a la sala de WebSocket para mensajes en tiempo real
      console.log(`🔌 ConversationChat: Intentando unirse a la sala de sesión ${props.sessionId}`)
      socketService.joinSession(props.sessionId)
      console.log(`🔌 ConversationChat: Unido a la sala de sesión ${props.sessionId}`)
      
      // 🔄 NUEVO: Verificar estado del WebSocket
      console.log(`🔌 ConversationChat: Estado del WebSocket:`, {
        isConnected: socketService.isConnected(),
        sessionId: props.sessionId
      })
    })

    // 🔄 NUEVO: Limpiar al desmontar
    onUnmounted(() => {
      // No es necesario salir de la sala ya que puede haber otros chats activos
      console.log(`🔌 ConversationChat: Componente desmontado para sesión ${props.sessionId}`)
    })

    // Observar cambios en la conversación
    watch(() => props.conversation, () => {
      // 🔄 NUEVO: Al cambiar conversación, verificar primero el store
      const storeMessagesList = storeMessages.value
      console.log(`🔄 ConversationChat: Conversación cambiada, mensajes en store: ${storeMessagesList.length}`)
      
      if (storeMessagesList.length > 0) {
        // Si hay mensajes en el store, usarlos directamente
        console.log(`✅ ConversationChat: Usando mensajes del store para nueva conversación`)
        messages.value = [...storeMessagesList]
      } else {
        // Solo cargar del backend si no hay mensajes en el store
        console.log(`📱 ConversationChat: Cargando mensajes del backend para nueva conversación`)
        loadMessages()
      }
    })

    // 🔄 NUEVO: Observar cambios en los mensajes del store de forma simple
    watch(storeMessages, (newStoreMessages, oldStoreMessages) => {
      
      console.log(`🔄 ConversationChat: Cambio detectado en storeMessages:`, {
        oldCount: oldStoreMessages?.length || 0,
        newCount: newStoreMessages?.length || 0,
        conversationId: getConversationId(),
        oldMessageIds: oldStoreMessages?.map((m: Message) => m.id) || [],
        newMessageIds: newStoreMessages?.map((m: Message) => m.id) || []
      })
      
      // 🔄 NUEVO: Siempre sincronizar con el store para mantener consistencia
      if (newStoreMessages.length > 0) {
        console.log(`🔄 ConversationChat: Sincronizando chat local con store`)
        
        // Reemplazar completamente la lista local con la del store
        messages.value = [...newStoreMessages]
        console.log(`✅ ConversationChat: Chat local sincronizado con store: ${newStoreMessages.length} mensajes`)
        
        // Scroll al final para mostrar los nuevos mensajes
        setTimeout(() => {
          const messagesArea = document.querySelector('.messages-area')
          if (messagesArea) {
            messagesArea.scrollTop = messagesArea.scrollHeight
            console.log('📱 ConversationChat: Scroll automático al final del chat')
          }
        }, 100)
      } else {
        console.log(`🔄 ConversationChat: No hay mensajes en store, limpiando chat local`)
        messages.value = []
      }
    }, { deep: true, immediate: true })

    // 🔄 NUEVO: Watcher adicional para observar directamente el estado del store
    watch(() => store.state.whatsapp.messages, (newMessages, oldMessages) => {
      const conversationId = getConversationId()
      const currentMessages = newMessages[conversationId] || []
      
      console.log(`🔄 ConversationChat: Cambio detectado en store.state.whatsapp.messages:`, {
        conversationId,
        oldCount: oldMessages?.[conversationId]?.length || 0,
        newCount: currentMessages.length,
        oldMessageIds: oldMessages?.[conversationId]?.map((m: Message) => m.id) || [],
        newMessageIds: currentMessages.map((m: Message) => m.id) || []
      })
      
      // 🔄 NUEVO: Sincronizar inmediatamente si hay cambios
      if (currentMessages.length > 0) {
        console.log(`🔄 ConversationChat: Sincronización directa desde store: ${currentMessages.length} mensajes`)
        
        // Reemplazar completamente la lista local
        messages.value = [...currentMessages]
        console.log(`✅ ConversationChat: Sincronización directa completada`)
        
        // Scroll al final
        setTimeout(() => {
          const messagesArea = document.querySelector('.messages-area')
          if (messagesArea) {
            messagesArea.scrollTop = messagesArea.scrollHeight
            console.log('📱 ConversationChat: Scroll automático después de sincronización directa')
          }
        }, 100)
      }
    }, { deep: true, immediate: true })

    // 🔄 NUEVO: Método para debug del store
    const debugStoreState = () => {
      console.log('🐛 Debug del Store (ConversationChat):')
      console.log('Estado actual del store.whatsapp:')
      console.log(JSON.stringify(store.state.whatsapp, null, 2))
      console.log('Mensajes en el store para la conversación actual:')
      const conversationId = getConversationId()
      const messagesInStore = store.state.whatsapp.messages[conversationId] || []
      console.log(JSON.stringify(messagesInStore, null, 2))
    }

    // 🔄 NUEVO: Método para forzar sincronización con el store
    const forceSyncWithStore = () => {
      console.log('🔄 Forzando sincronización con el store para la conversación:', props.conversation.phoneNumber)
      // Simular un cambio en la conversación para que el watcher de props.conversation se active
      // Esto forzará que el watcher de storeMessages se ejecute y actualice la lista
      // Esto es útil cuando hay un problema de sincronización persistente
      // Por ejemplo, si el store no se actualiza correctamente después de un cambio de conversación
      // o si hay un error en la carga inicial.
      // Una forma más robusta sería emitir un evento personalizado desde el padre.
      // Aquí, simplemente forzamos la carga de mensajes para que el watcher de storeMessages
      // se active y actualice la lista.
      loadMessages() 
    }

    // 🔄 NUEVO: Método para debug de mutaciones del store
    const debugMutations = () => {
      console.log('🔍 Debug de Mutaciones del Store (ConversationChat):')
      console.log('Todas las mutaciones registradas en el store:')
      console.log(JSON.stringify(store.state.whatsapp.mutations, null, 2))
      console.log('Última mutación ejecutada:')
      console.log(JSON.stringify(store.state.whatsapp.lastMutation, null, 2))
    }

    // 🔄 NUEVO: Método para debug de sincronización con backend
    const debugBackendSync = async () => {
      console.log('🔗 Debug de Sincronización con Backend (ConversationChat):')
      
      const conversationId = getConversationId()
      console.log(`🔍 ConversationId actual: ${conversationId}`)
      
      // Verificar estado actual del store
      const currentStoreMessages = store.state.whatsapp.messages[conversationId] || []
      console.log(`📱 Mensajes actuales en store: ${currentStoreMessages.length}`)
      
      // Cargar mensajes del backend para comparar
      try {
        console.log('🔄 Cargando mensajes del backend para comparación...')
        const backendMessages = await whatsAppService.fetchChatMessages(
          props.sessionId,
          props.conversation.phoneNumber,
          100, // 🔄 IMPORTANTE: Límite de 100 para obtener todos los mensajes disponibles
          true
        )
        
        console.log(`📥 Mensajes del backend: ${backendMessages.length}`)
        
        // Comparar mensajes del backend vs store
        const backendIds = new Set(backendMessages.map((m: Message) => m.id))
        const storeIds = new Set(currentStoreMessages.map((m: Message) => m.id))
        
        const missingInStore = backendMessages.filter((m: Message) => !storeIds.has(m.id))
        const extraInStore = currentStoreMessages.filter((m: Message) => !backendIds.has(m.id))
        
        console.log(`❌ Mensajes del backend que NO están en store: ${missingInStore.length}`)
        missingInStore.forEach((m: Message) => console.log(`  - ${m.id}: "${m.body?.substring(0, 30)}..."`))
        
        console.log(`➕ Mensajes en store que NO están en backend: ${extraInStore.length}`)
        extraInStore.forEach((m: Message) => console.log(`  - ${m.id}: "${m.body?.substring(0, 30)}..."`))
        
        console.log(`✅ Mensajes sincronizados: ${backendMessages.length - missingInStore.length}`)
        
        // Mostrar algunos ejemplos de mensajes del backend
        console.log('📋 Ejemplos de mensajes del backend:')
        backendMessages.slice(0, 5).forEach((m: Message, i: number) => {
          console.log(`  ${i + 1}. ${m.id}: "${m.body?.substring(0, 30)}..." (${m.fromMe ? 'Enviado' : 'Recibido'})`)
        })
        
        // 🔄 NUEVO: Intentar sincronización forzada si hay mensajes faltantes
        if (missingInStore.length > 0) {
          console.log(`🔄 Intentando sincronización forzada de ${missingInStore.length} mensajes...`)
          await forceSyncMessagesToStore(backendMessages)
        }
        
      } catch (error) {
        console.error('❌ Error cargando mensajes del backend para debug:', error)
      }
    }
    
    // 🔄 NUEVO: Método para sincronización forzada de mensajes al store
    const forceSyncMessagesToStore = async (messagesToSync?: Message[]) => {
      try {
        let messagesToProcess: Message[] = []
        
        if (messagesToSync && messagesToSync.length > 0) {
          // Si se pasan mensajes específicos, usarlos
          messagesToProcess = messagesToSync
          console.log(`🔄 Iniciando sincronización forzada de ${messagesToProcess.length} mensajes específicos al store`)
        } else {
          // Si no se pasan mensajes, cargar desde el backend
          console.log(`🔄 Cargando mensajes del backend para sincronización forzada...`)
          messagesToProcess = await whatsAppService.fetchChatMessages(
            props.sessionId,
            props.conversation.phoneNumber,
            100, // 🔄 IMPORTANTE: Límite de 100 para obtener todos los mensajes disponibles
            true
          )
          console.log(`📥 Mensajes cargados del backend: ${messagesToProcess.length}`)
        }
        
        if (messagesToProcess.length === 0) {
          console.log(`⚠️ No hay mensajes para sincronizar`)
          return
        }
        
        const conversationId = getConversationId()
        console.log(`🔍 ConversationId para sincronización: ${conversationId}`)
        
        let successCount = 0
        let errorCount = 0
        
        for (const message of messagesToProcess) {
          try {
            // 🔄 IMPORTANTE: Verificar que el mensaje tenga el formato correcto
            const messageForStore = {
              ...message,
              sessionId: props.sessionId,
              id: message.id,
              fromMe: message.fromMe,
              from: message.from,
              to: message.to,
              body: message.body || '',
              type: message.type || 'text',
              status: message.status || 'delivered',
              timestamp: message.timestamp ? new Date(message.timestamp) : new Date()
            }
            
            console.log(`📥 Sincronizando mensaje: ${message.id} - "${message.body?.substring(0, 30)}..."`)
            
            // 🔄 NUEVO: Usar commit directo en lugar de dispatch para evitar problemas de async
            store.commit('whatsapp/ADD_MESSAGE', messageForStore)
            
            successCount++
            console.log(`✅ Mensaje sincronizado exitosamente: ${message.id}`)
            
          } catch (error) {
            errorCount++
            console.error(`❌ Error sincronizando mensaje ${message.id}:`, error)
          }
        }
        
        console.log(`🎯 Sincronización forzada completada: ${successCount} exitosos, ${errorCount} errores`)
        
        // 🔄 NUEVO: Verificar estado final del store
        const finalMessages = store.state.whatsapp.messages[conversationId] || []
        console.log(`🔍 Estado final del store: ${finalMessages.length} mensajes`)
        
        // 🔄 NUEVO: Forzar actualización del computed
        messages.value = [...finalMessages]
        console.log(`✅ Chat local actualizado con ${finalMessages.length} mensajes`)
        
      } catch (error) {
        console.error('❌ Error en sincronización forzada:', error)
      }
    }

    return {
      messages,
      newMessage,
      isLoadingMessages,
      isSending,
      isLoadingMore,
      hasNewMessages,
      loadMessages,
      loadMoreMessages,
      loadMessagesAdvanced,
      searchMessages,
      sendMessage,
      getInitials,
      formatMessageTime,
      getMessageStatus,
      searchQuery,
      onSearchInput,
      clearSearch,
      debugStoreState,
      forceSyncWithStore,
      debugMutations,
      debugBackendSync,
      forceSyncMessagesToStore,
      storeMessages
    }
  }
})
</script>

<style scoped>
.conversation-chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100vh;
}

.chat-header {
  flex-shrink: 0;
}

.messages-area {
  flex: 1;
  min-height: 0;
}

.message-input-area {
  flex-shrink: 0;
}

.message-item {
  animation: fadeIn 0.3s ease-in;
}

.message-outgoing .message-content {
  text-align: right;
}

.message-incoming .message-content {
  text-align: left;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scrollbar personalizado */
.messages-area::-webkit-scrollbar {
  width: 6px;
}

.messages-area::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.messages-area::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.messages-area::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>