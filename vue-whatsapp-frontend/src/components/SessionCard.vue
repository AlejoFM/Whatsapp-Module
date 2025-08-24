<template>
  <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <span class="text-green-600 font-semibold text-sm">{{ session.clientId?.charAt(0).toUpperCase() }}</span>
        </div>
        <div>
          <h4 class="font-medium text-gray-900">{{ session?.clientId || 'Sin ID' }}</h4>
          <p class="text-sm text-gray-500">
            {{ session?.phoneNumber || 'Sin número' }}
          </p>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <!-- Indicador de sincronización -->
        <div v-if="session?.isConnected" class="flex items-center gap-1 text-xs text-green-600">
          <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Sincronizando</span>
        </div>
        
        <span
          :class="[
            'px-2 py-1 text-xs rounded-full',
            session?.isConnected
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          ]"
        >
          {{ session?.isConnected ? 'Conectado' : 'Desconectado' }}
        </span>
      </div>
    </div>

    <div class="text-sm text-gray-600 mb-4">
      <p>Creado: {{ formatDate(session.createdAt) }}</p>
      <p v-if="session.lastSeen">Última vez: {{ formatDate(session.lastSeen) }}</p>
    </div>

    <div class="flex space-x-2">
      <!-- Botones para sesiones conectadas -->
      <template v-if="session?.isConnected">
        <button
          @click="$emit('view-conversations', session?.id)"
          class="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
        >
          Ver Conversaciones
        </button>
        <button
          @click="$emit('disconnect', session?.id)"
          class="px-3 py-2 text-red-600 border border-red-300 rounded-md text-sm hover:bg-red-50 transition-colors"
        >
          Desconectar
        </button>
      </template>

      <!-- Botones para sesiones desconectadas -->
      <template v-else>
        <button
          @click="$emit('connect', session?.id)"
          class="flex-1 bg-green-600 text-white px-3 py-2 rounded-md text-sm hover:bg-green-700 transition-colors"
        >
          Conectar
        </button>
        <button
          @click="$emit('delete', session?.id)"
          class="px-3 py-2 text-red-600 border border-red-300 rounded-md text-sm hover:bg-red-50 transition-colors"
        >
          Eliminar
        </button>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { WhatsAppSession } from '../types'

export default defineComponent({
  name: 'SessionCard',
  props: {
    session: {
      type: Object as () => WhatsAppSession,
      required: true
    }
  },
  emits: ['connect', 'disconnect', 'delete', 'view-conversations'],
  setup() {
    const formatDate = (dateString: string | Date | null | undefined) => {
      if (!dateString) return 'N/A'
      
      try {
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return 'N/A'
        
        return date.toLocaleString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      } catch (error) {
        console.warn('Error formatting date:', dateString, error)
        return 'N/A'
      }
    }

    return {
      formatDate
    }
  }
})
</script>
