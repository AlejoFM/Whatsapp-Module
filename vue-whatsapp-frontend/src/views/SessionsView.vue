<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="mb-8">
              <div class="flex items-center justify-between">
          <div>
            <h2 class="text-3xl font-bold text-gray-900 mb-4">Gestión de Sesiones WhatsApp</h2>
            <p class="text-gray-600">Crea y gestiona múltiples sesiones de WhatsApp simultáneamente</p>
          </div>
          
          <!-- Botón de reconexión WebSocket -->
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full" :class="socketService.isConnected() ? 'bg-green-500' : 'bg-red-500'"></div>
              <span class="text-sm text-gray-600">
                {{ socketService.isConnected() ? 'Conectado' : 'Desconectado' }}
              </span>
            </div>
            <button
              @click="reconnectWebSocket"
              :disabled="socketService.isConnected() || isReconnecting"
              class="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[120px] justify-center"
              :title="socketService.isConnected() ? 'WebSocket ya está conectado' : 'Reconectar WebSocket'"
            >
              <!-- Spinner de carga -->
              <svg 
                v-if="isReconnecting" 
                class="animate-spin h-4 w-4 text-white" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  class="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  stroke-width="4"
                ></circle>
                <path 
                  class="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              
              <!-- Texto del botón -->
              <span v-if="socketService.isConnected()">Conectado</span>
              <span v-else-if="isReconnecting">Reconectando...</span>
              <span v-else>Reconectar</span>
            </button>
          </div>
        </div>
    </div>

    <!-- Notificación de éxito -->
    <div 
      v-if="showSuccessNotificationVisible" 
      class="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded animate-bounce"
    >
      <div class="flex items-center justify-between">
        <span class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          {{ successNotification }}
        </span>
        <button @click="showSuccessNotificationVisible = false" class="text-green-700 hover:text-green-900">
          ×
        </button>
      </div>
    </div>

    <!-- Formulario para crear nueva sesión -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-8">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Nueva Sesión</h3>
      <form @submit.prevent="createNewSession" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="clientId" class="block text-sm font-medium text-gray-700 mb-2">
              ID del Cliente *
            </label>
            <input
              id="clientId"
              v-model="newSession.clientId"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="ej: cliente-1"
            />
          </div>
          <div>
            <label for="phoneNumber" class="block text-sm font-medium text-gray-700 mb-2">
              Número de Teléfono (opcional)
            </label>
            <input
              id="phoneNumber"
              v-model="newSession.phoneNumber"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="ej: +1234567890"
            />
          </div>
        </div>
        <button
          type="submit"
          :disabled="loading"
          class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? 'Creando...' : 'Crear Sesión' }}
        </button>
      </form>
    </div>

    <!-- Lista de sesiones -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Sesiones conectadas -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <div class="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
          Sesiones Conectadas ({{ connectedSessions.length }})
        </h3>
        <div v-if="connectedSessions.length === 0" class="text-gray-500 text-center py-8">
          No hay sesiones conectadas
        </div>
        <div v-else class="space-y-4">
          <SessionCard
            v-for="session in connectedSessions"
            :key="session.id"
            :session="session"
            @disconnect="disconnectSession"
            @view-conversations="viewConversations"
          />
        </div>
      </div>

      <!-- Sesiones desconectadas -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <div class="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
          Sesiones Desconectadas ({{ disconnectedSessions.length }})
        </h3>
        <div v-if="disconnectedSessions.length === 0" class="text-gray-500 text-center py-8">
          No hay sesiones desconectadas
        </div>
        <div v-else class="space-y-4">
          <SessionCard
            v-for="session in disconnectedSessions"
            :key="session.id"
            :session="session"
            @connect="connectSession"
            @delete="deleteSession"
          />
        </div>
      </div>
    </div>

    <!-- Modal de QR -->
    <QRModal
      v-if="showQRModal"
      :qr-code="currentQRCode"
      :session="currentSession || {}"
      :is-connecting="isConnecting"
      @close="closeQRModal"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import SessionCard from '../components/SessionCard.vue'
import QRModal from '../components/QRModal.vue'
import { socketService } from '../services/socketService'
import { WhatsAppSession } from '../types'

export default defineComponent({
  name: 'SessionsView',
  components: {
    SessionCard,
    QRModal
  },
  setup() {
    const store = useStore()
    const router = useRouter()

    const newSession = ref({
      clientId: '',
      phoneNumber: ''
    })

    const showQRModal = ref(false)
    const currentQRCode = ref('')
    const currentSession = ref<WhatsAppSession | null>(null)
    const isConnecting = ref(false)
    const isReconnecting = ref(false)
    const successNotification = ref('')
    const showSuccessNotificationVisible = ref(false)
    
    // Función para mostrar notificación de éxito
    const showSuccessNotification = (message: string) => {
      successNotification.value = message
      showSuccessNotificationVisible.value = true
      
      // Ocultar la notificación después de 3 segundos
      setTimeout(() => {
        showSuccessNotificationVisible.value = false
        successNotification.value = ''
      }, 3000)
    }

    const loading = computed(() => store.state.whatsapp.loading)
    const connectedSessions = computed(() => store.getters['whatsapp/connectedSessions'])
    const disconnectedSessions = computed(() => store.getters['whatsapp/disconnectedSessions'])

    onMounted(async () => {
      await store.dispatch('whatsapp/loadSessions')
      
      // Conectar WebSocket y configurar store
      socketService.setStore(store)
      socketService.connect()
      
      // Escuchar cambios de estado de sesión para cerrar modal automáticamente
      socketService.onSessionStatusChanged((session) => {
        handleSessionStatusChanged(session)
      })
    })

    // Escuchar eventos de visibilidad de página para reconectar si es necesario
    onMounted(() => {
      const handleVisibilityChange = () => {
        if (!document.hidden && !socketService.isConnected()) {
          console.log('🔄 Página visible, reconectando WebSocket...')
          socketService.reconnect()
        } else if (!document.hidden && socketService.isConnected()) {
          console.log('ℹ️ Página visible y WebSocket ya conectado, no es necesario reconectar')
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)
      
      // Cleanup al desmontar
      onUnmounted(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      })
    })

    const createNewSession = async () => {
      try {
        await store.dispatch('whatsapp/createSession', newSession.value)
        newSession.value = { clientId: '', phoneNumber: '' }
      } catch (error) {
        console.error('Error creating session:', error)
      }
    }

    const connectSession = async (sessionId: string) => {
      try {
        const result = await store.dispatch('whatsapp/connectSession', sessionId)
        currentQRCode.value = result.qrCode
        currentSession.value = result.session
        showQRModal.value = true
      } catch (error) {
        console.error('Error connecting session:', error)
      }
    }

    const disconnectSession = async (sessionId: string) => {
      try {
        await store.dispatch('whatsapp/disconnectSession', sessionId)
      } catch (error) {
        console.error('Error disconnecting session:', error)
      }
    }

    const deleteSession = async (sessionId: string) => {
      // Implementar eliminación de sesión
      console.log('Delete session:', sessionId)
    }

    const viewConversations = (sessionId: string) => {
      router.push(`/chat/${sessionId}`)
    }

    const closeQRModal = () => {
      showQRModal.value = false
      currentQRCode.value = ''
      currentSession.value = null
      isConnecting.value = false
    }

    // Función para reconectar manualmente el WebSocket
    const reconnectWebSocket = async () => {
      if (isReconnecting.value) return // Evitar múltiples reconexiones
      
      // Verificar si ya estamos conectados
      if (socketService.isConnected()) {
        console.log('ℹ️ WebSocket ya está conectado, no es necesario reconectar')
        return
      }
      
      console.log('🔄 Reconectando WebSocket manualmente...')
      isReconnecting.value = true
      
      try {
        await socketService.reconnect()
        console.log('✅ WebSocket reconectado exitosamente')
      } catch (error) {
        console.error('❌ Error reconectando WebSocket:', error)
      } finally {
        // Esperar un poco antes de quitar el estado de reconexión
        setTimeout(() => {
          isReconnecting.value = false
        }, 1000)
      }
    }

    // Manejar cambios de estado de sesión
    const handleSessionStatusChanged = (session: WhatsAppSession) => {
      console.log('🔄 Estado de sesión cambiado:', {
        sessionId: session.id,
        clientId: session.clientId,
        isConnected: session.isConnected,
        isAuthenticated: session.isAuthenticated,
        phoneNumber: session.phoneNumber
      })
      
      // Si la sesión actual se conectó exitosamente, cerrar el modal
      if (currentSession.value && 
          currentSession.value.id === session.id && 
          session.isConnected && 
          session.isAuthenticated) {
        
        console.log('✅ Sesión conectada exitosamente, cerrando modal QR')
        console.log('📱 Detalles de la sesión:', {
          id: session.id,
          clientId: session.clientId,
          phoneNumber: session.phoneNumber
        })
        
        // Cerrar el modal inmediatamente
        closeQRModal()
        
        // Mostrar notificación de éxito
        showSuccessNotification(`Sesión ${session.clientId} conectada exitosamente`)
        
        // Recargar la lista de sesiones para mostrar el estado actualizado
        store.dispatch('whatsapp/loadSessions').then(() => {
          console.log('📋 Lista de sesiones actualizada después de conexión exitosa')
        }).catch(error => {
          console.error('❌ Error actualizando lista de sesiones:', error)
        })
      }
      
      // Si la sesión está en proceso de conexión, mostrar estado de conexión
      if (currentSession.value && 
          currentSession.value.id === session.id && 
          session.isConnected && 
          !session.isAuthenticated) {
        console.log('🔄 Sesión en proceso de conexión - esperando autenticación')
        isConnecting.value = true
      }
      
      // Si la sesión se desconectó, actualizar estado
      if (currentSession.value && 
          currentSession.value.id === session.id && 
          !session.isConnected) {
        console.log('❌ Sesión desconectada')
        isConnecting.value = false
        
        // Si el modal está abierto, cerrarlo
        if (showQRModal.value) {
          console.log('🔄 Cerrando modal por desconexión de sesión')
          closeQRModal()
        }
      }
    }

    return {
      newSession,
      loading,
      connectedSessions,
      disconnectedSessions,
      showQRModal,
      currentQRCode,
      currentSession,
      isConnecting,
      isReconnecting,
      successNotification,
      showSuccessNotificationVisible,
      createNewSession,
      connectSession,
      disconnectSession,
      deleteSession,
      viewConversations,
      closeQRModal,
      handleSessionStatusChanged,
      reconnectWebSocket,
      socketService
    }
  }
})
</script>
