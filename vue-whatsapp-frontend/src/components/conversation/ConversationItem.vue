<template>
  <div
    @click="$emit('select', conversation)"
    :class="[
      'p-3 rounded-lg cursor-pointer transition-colors hover:shadow-sm',
      isSelected
        ? 'bg-green-100 border border-green-300 shadow-md'
        : 'hover:bg-gray-100 border border-transparent'
    ]"
  >
    <div class="flex items-center justify-between">
      <!-- Información principal de la conversación -->
      <div class="flex-1 min-w-0 mr-3">
        <!-- Nombre del contacto -->
        <p class="font-medium text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap">
          {{ conversation.displayName }}
        </p>
        
        <!-- Último mensaje -->
        <p class="text-sm text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap mt-1">
          {{ conversation.lastMessage || 'Sin mensajes' }}
        </p>
      </div>

      <!-- Información lateral -->
      <div class="flex flex-col items-end space-y-1 flex-shrink-0">
        <!-- Tiempo del último mensaje -->
        <p class="text-xs text-gray-400">
          {{ formatTime(conversation.lastMessageTime) }}
        </p>
        
        <!-- Contador de mensajes no leídos -->
        <div v-if="conversation.hasUnreadMessages" class="flex items-center space-x-1">
          <span class="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-green-500 rounded-full">
            {{ conversation.unreadCount }}
          </span>
        </div>

        <!-- Indicador de estado -->
        <div class="flex items-center space-x-1">
          <!-- Indicador de actividad reciente -->
          <div 
            v-if="conversation.isActive"
            class="w-2 h-2 bg-green-500 rounded-full"
            title="Activo recientemente"
          ></div>
          
          <!-- Indicador de grupo -->
          <div 
            v-if="conversation.isGroup"
            class="w-2 h-2 bg-blue-500 rounded-full"
            title="Grupo"
          ></div>
        </div>
      </div>
    </div>

    <!-- Indicador de nueva conversación -->
    <div 
      v-if="isNew"
      class="mt-2 p-1 bg-blue-100 text-blue-800 text-xs rounded animate-pulse"
    >
      Nueva conversación
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { ConversationModel } from '../../models/Conversation'
import { TimeUtils } from '../../utils/timeUtils'

export default defineComponent({
  name: 'ConversationItem',
  props: {
    conversation: {
      type: Object as PropType<ConversationModel>,
      required: true
    },
    isSelected: {
      type: Boolean,
      default: false
    },
    isNew: {
      type: Boolean,
      default: false
    }
  },
  emits: ['select'],
  setup() {
    const formatTime = (dateString: string | Date | null | undefined): string => {
      return TimeUtils.formatRelativeTime(dateString)
    }

    return {
      formatTime
    }
  }
})
</script>

<style scoped>
/* Transiciones suaves */
.transition-colors {
  transition: all 0.2s ease-in-out;
}

/* Hover effects mejorados */
.hover\:shadow-sm:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Animación para nuevas conversaciones */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}
</style>
