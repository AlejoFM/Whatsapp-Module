<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">
          🔍 Autenticación Inteligente
        </h3>
        <button
          @click="closeModal"
          class="text-gray-400 hover:text-gray-600"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="space-y-4">
        <!-- Detección automática -->
        <div v-if="!existingSession" class="text-center">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Número de teléfono
            </label>
            <input
              v-model="phoneNumber"
              type="tel"
              placeholder="+1234567890"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              :disabled="isDetecting"
            />
          </div>
          
          <button
            @click="detectExistingSession"
            :disabled="!phoneNumber || isDetecting"
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isDetecting">🔍 Detectando...</span>
            <span v-else>🔍 Detectar Sesión Existente</span>
          </button>
        </div>

        <!-- Sesión existente detectada -->
        <div v-if="existingSession" class="space-y-4">
          <div class="bg-green-50 border border-green-200 rounded-md p-4">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-green-800">
                  ¡Sesión existente detectada!
                </h3>
                <div class="mt-2 text-sm text-green-700">
                  <p><strong>ID:</strong> {{ existingSession.id }}</p>
                  <p><strong>Estado:</strong> {{ existingSession.isConnected ? 'Conectado' : 'Desconectado' }}</p>
                  <p><strong>Última vez:</strong> {{ formatDate(existingSession.lastSeen) }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="flex space-x-3">
            <button
              @click="linkToExistingSession"
              :disabled="isLinking"
              class="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isLinking">🔗 Vinculando...</span>
              <span v-else>🔗 Usar Sesión Existente</span>
            </button>
            
            <button
              @click="createNewSession"
              :disabled="isCreating"
              class="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isCreating">➕ Creando...</span>
              <span v-else>➕ Crear Nueva Sesión</span>
            </button>
          </div>
        </div>

        <!-- Estadísticas del caché -->
        <div class="mt-6 p-4 bg-gray-50 rounded-md">
          <h4 class="text-sm font-medium text-gray-700 mb-2">📊 Estadísticas del Caché</h4>
          <div class="text-sm text-gray-600 space-y-1">
            <p>Sesiones en caché: {{ cacheStats.totalSessions }}</p>
            <p>Conversaciones en caché: {{ cacheStats.totalConversations }}</p>
          </div>
        </div>
      </div>

      <!-- Botones de acción -->
      <div class="mt-6 flex justify-end space-x-3">
        <button
          @click="clearCache"
          class="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700"
        >
          🗑️ Limpiar Caché
        </button>
        
        <button
          @click="closeModal"
          class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700"
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { WhatsAppSession } from '../types'

export default defineComponent({
  name: 'SmartAuthModal',
  props: {
    isVisible: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'session-linked', 'new-session-requested'],
  setup(props, { emit }) {
    const store = useStore()
    const phoneNumber = ref('')
    const existingSession = ref<WhatsAppSession | null>(null)
    const isDetecting = ref(false)
    const isLinking = ref(false)
    const isCreating = ref(false)

    const cacheStats = computed(() => store.getters.getCacheStats || { totalSessions: 0, totalConversations: 0 })

    const detectExistingSession = async () => {
      if (!phoneNumber.value) return
      
      try {
        isDetecting.value = true
        const session = await store.dispatch('detectExistingSession', phoneNumber.value)
        existingSession.value = session
        
        if (session) {
          console.log('✅ Sesión existente detectada:', session)
        } else {
          console.log('❌ No se encontró sesión existente')
        }
      } catch (error) {
        console.error('Error detectando sesión:', error)
      } finally {
        isDetecting.value = false
      }
    }

    const linkToExistingSession = async () => {
      if (!existingSession.value || !phoneNumber.value) return
      
      try {
        isLinking.value = true
        const success = await store.dispatch('linkPhoneToSession', {
          phoneNumber: phoneNumber.value,
          sessionId: existingSession.value.id
        })
        
        if (success) {
          console.log('✅ Número vinculado exitosamente')
          emit('session-linked', existingSession.value)
          closeModal()
        } else {
          console.log('❌ No se pudo vincular el número')
        }
      } catch (error) {
        console.error('Error vinculando número:', error)
      } finally {
        isLinking.value = false
      }
    }

    const createNewSession = async () => {
      try {
        isCreating.value = true
        emit('new-session-requested', { phoneNumber: phoneNumber.value })
        closeModal()
      } catch (error) {
        console.error('Error creando nueva sesión:', error)
      } finally {
        isCreating.value = false
      }
    }

    const clearCache = () => {
      if (existingSession.value) {
        store.dispatch('clearConversationCache', existingSession.value.id)
      }
      console.log('🗑️ Caché limpiado')
    }

    const closeModal = () => {
      emit('close')
      // Resetear estado
      phoneNumber.value = ''
      existingSession.value = null
    }

    const formatDate = (date: string | Date) => {
      if (!date) return 'N/A'
      return new Date(date).toLocaleString()
    }

    onMounted(() => {
      // Cargar estadísticas del caché
      store.dispatch('getCacheStats')
    })

    return {
      phoneNumber,
      existingSession,
      isDetecting,
      isLinking,
      isCreating,
      cacheStats,
      detectExistingSession,
      linkToExistingSession,
      createNewSession,
      clearCache,
      closeModal,
      formatDate
    }
  }
})
</script>
