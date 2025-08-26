<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="mb-8">
              <div class="flex items-center justify-between">
          <div>
            <h2 class="text-3xl font-bold text-gray-900 mb-4">Gestión de Sesiones WhatsApp</h2>
            <p class="text-gray-600">Crea y gestiona múltiples sesiones de WhatsApp simultáneamente</p>
          </div>
          
          <!-- Estado de Socket.IO -->
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full bg-blue-500"></div>
              <span class="text-sm text-gray-600">Socket.IO Activo</span>
            </div>
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
import { defineComponent, ref, computed, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import SessionCard from '../components/SessionCard.vue'
import QRModal from '../components/QRModal.vue'
// import LaravelEchoService from '../services/laravelEchoService' // DESHABILITADO
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
    const successNotification = ref('')
    const showSuccessNotificationVisible = ref(false)
    

    const loading = computed(() => store.state.whatsapp.loading)
    const connectedSessions = computed(() => store.getters['whatsapp/connectedSessions'])
    const disconnectedSessions = computed(() => store.getters['whatsapp/disconnectedSessions'])
    const sessions = computed(() => store.state.whatsapp.sessions)

    // 🔄 NUEVO: Watcher para detectar cambios en las sesiones
    watch(sessions, (newSessions) => {
      if (currentSession.value && showQRModal.value) {
        const updatedSession = newSessions.find((s: WhatsAppSession) => s.id === currentSession.value?.id)
        
        if (updatedSession && updatedSession.isConnected && updatedSession.isAuthenticated) {
          console.log('✅ Sesión autenticada exitosamente:', updatedSession)
          
          // Mostrar notificación de éxito
          successNotification.value = `¡Sesión ${updatedSession.clientId} conectada exitosamente!`
          showSuccessNotificationVisible.value = true
          
          // Cerrar el modal automáticamente
          setTimeout(() => {
            closeQRModal()
            
            // Ocultar notificación después de 5 segundos
            setTimeout(() => {
              showSuccessNotificationVisible.value = false
              successNotification.value = ''
            }, 5000)
          }, 2000) // Esperar 2 segundos para que el usuario vea la notificación
          
          // Refrescar la lista de sesiones
          store.dispatch('whatsapp/loadSessions')
        }
      }
    }, { deep: true })

    onMounted(async () => {
      await store.dispatch('whatsapp/loadSessions')
      
      // 🔄 NUEVO: Usando solo Socket.IO - Laravel Echo deshabilitado
      console.log('🔌 Socket.IO configurado para recibir eventos automáticamente')
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
      try {

        // TODO: Implementar eliminación de sesión
        console.log('Delete session:', sessionId)
      } catch (error) {
        console.error('Error deleting session:', error)
      }
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



    return {
      newSession,
      loading,
      connectedSessions,
      disconnectedSessions,
      showQRModal,
      currentQRCode,
      currentSession,
      isConnecting,
      successNotification,
      showSuccessNotificationVisible,
      createNewSession,
      connectSession,
      disconnectSession,
      deleteSession,
      viewConversations,
      closeQRModal
    }
  }
})
</script>
