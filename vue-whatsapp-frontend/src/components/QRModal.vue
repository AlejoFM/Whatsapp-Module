<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">
          Escanear Código QR
        </h3>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="text-center">
        <div class="mb-4">
          <p class="text-sm text-gray-600 mb-2">
            Escanea este código QR con tu WhatsApp para conectar la sesión
          </p>
          <p class="text-xs text-gray-500">
            Cliente: <span class="font-medium">{{ session?.clientId }}</span>
          </p>
        </div>

        <div class="bg-gray-100 p-4 rounded-lg mb-4">
          <img
            v-if="qrCode && !isConnecting"
            :src="qrCode"
            alt="Código QR de WhatsApp"
            class="w-64 h-64 mx-auto"
          />
          <div v-else-if="isConnecting" class="w-64 h-64 bg-green-100 flex items-center justify-center">
            <div class="text-center">
              <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <span class="text-green-700 font-medium">Conectando...</span>
              <p class="text-sm text-green-600 mt-2">QR escaneado exitosamente</p>
            </div>
          </div>
          <div v-else class="w-64 h-64 bg-gray-200 flex items-center justify-center">
            <span class="text-gray-500">Generando QR...</span>
          </div>
        </div>

        <div class="text-xs text-gray-500 space-y-1">
          <p>• Abre WhatsApp en tu teléfono</p>
          <p>• Ve a Configuración > Dispositivos vinculados</p>
          <p>• Escanea el código QR</p>
          <p>• Espera a que se complete la conexión</p>
        </div>

        <div class="mt-4">
          <button
            @click="$emit('close')"
            class="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'QRModal',
  props: {
    qrCode: {
      type: String,
      required: true
    },
    session: {
      type: Object,
      default: null
    },
    isConnecting: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close']
})
</script>
