<template>
  <div
    :class="[
      'flex',
      message.fromMe ? 'justify-end' : 'justify-start'
    ]"
  >
    <div
      :class="[
        'max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm',
        message.fromMe
          ? 'bg-green-500 text-white'
          : 'bg-gray-200 text-gray-900'
      ]"
    >
      <!-- Contenido del mensaje -->
      <div class="message-content">
        <p class="text-sm break-words">{{ message.body }}</p>
        
        <!-- Metadatos del mensaje -->
        <div class="flex items-center justify-between mt-2 text-xs opacity-75">
          <span>{{ formatTime(message.timestamp) }}</span>
          
          <!-- Estado del mensaje (solo para mensajes enviados) -->
          <span 
            v-if="message.fromMe" 
            :class="message.statusColor"
            class="ml-2"
          >
            {{ message.statusIcon }}
          </span>
        </div>
      </div>

      <!-- Indicador de mensaje no leído -->
      <div 
        v-if="!message.fromMe && !message.isRead" 
        class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
      ></div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { MessageModel } from '../../models/Message'
import { TimeUtils } from '../../utils/timeUtils'

export default defineComponent({
  name: 'MessageBubble',
  props: {
    message: {
      type: Object as PropType<MessageModel>,
      required: true
    }
  },
  setup() {
    const formatTime = (dateString: string | Date): string => {
      return TimeUtils.formatTime(dateString)
    }

    return {
      formatTime
    }
  }
})
</script>

<style scoped>
.message-content {
  position: relative;
}

/* Animación de entrada para nuevos mensajes */
.message-enter-active {
  transition: all 0.3s ease;
}

.message-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.message-leave-active {
  transition: all 0.2s ease;
}

.message-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

/* Hover effects */
.message-content:hover {
  transform: translateY(-1px);
  transition: transform 0.2s ease;
}
</style>
