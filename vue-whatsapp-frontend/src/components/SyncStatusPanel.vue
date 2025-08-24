<template>
  <div class="sync-status-panel">
    <div class="status-header">
      <h3>🔒 Estado de Sincronización</h3>
      <button 
        @click="refreshStatus" 
        :disabled="isRefreshing"
        class="refresh-btn"
        :title="isRefreshing ? 'Actualizando...' : 'Actualizar estado'"
      >
        {{ isRefreshing ? '⏳' : '🔄' }}
      </button>
    </div>
    
    <div class="status-content">
      <!-- Estado actual -->
      <div class="status-item">
        <span class="status-label">Estado:</span>
        <span class="status-value" :class="{ 'active': syncControl.isActive }">
          {{ syncControl.isActive ? '🔄 Sincronizando' : '✅ Inactivo' }}
        </span>
      </div>
      
      <!-- Cola de sincronización -->
      <div class="status-item" v-if="syncControl.queueLength > 0">
        <span class="status-label">En cola:</span>
        <span class="status-value queue">
          {{ syncControl.queueLength }} {{ syncControl.queueLength === 1 ? 'pendiente' : 'pendientes' }}
        </span>
      </div>
      
      <!-- Última sincronización -->
      <div class="status-item" v-if="syncControl.lastSyncTime">
        <span class="status-label">Última sincronización:</span>
        <span class="status-value">
          {{ formatLastSyncTime(syncControl.lastSyncTime) }}
        </span>
      </div>
      
      <!-- Disponibilidad -->
      <div class="status-item">
        <span class="status-label">Disponible:</span>
        <span class="status-value" :class="{ 'available': syncControl.canStartNewSync, 'unavailable': !syncControl.canStartNewSync }">
          {{ syncControl.canStartNewSync ? '✅ Sí' : '⏳ No' }}
        </span>
      </div>
    </div>
    
    <!-- Acciones -->
    <div class="status-actions">
      <button 
        @click="startFullSync" 
        :disabled="!syncControl.canStartNewSync || isStartingSync"
        class="action-btn primary"
        :title="getSyncButtonTitle()"
      >
        {{ isStartingSync ? '⏳ Iniciando...' : '🚀 Sincronizar Todo' }}
      </button>
      
      <button 
        @click="refreshConversations" 
        :disabled="isRefreshing"
        class="action-btn secondary"
        title="Actualizar conversaciones existentes"
      >
        🔄 Actualizar
      </button>
    </div>
    
    <!-- Mensaje de estado -->
    <div v-if="statusMessage" class="status-message" :class="statusMessageType">
      {{ statusMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useStore } from 'vuex'

// Props
interface Props {
  sessionId: string
}

const props = defineProps<Props>()

// Store
const store = useStore()

// Estado local
const isRefreshing = ref(false)
const isStartingSync = ref(false)
const statusMessage = ref('')
const statusMessageType = ref<'info' | 'success' | 'warning' | 'error'>('info')

// Computed properties
const syncControl = computed(() => store.getters['whatsapp/syncControlInfo'])

// Métodos
const refreshStatus = async () => {
  try {
    isRefreshing.value = true
    statusMessage.value = ''
    
    await store.dispatch('whatsapp/getSyncStatus', props.sessionId)
    
    showStatusMessage('Estado actualizado correctamente', 'success')
  } catch (error) {
    console.error('Error actualizando estado:', error)
    showStatusMessage('Error actualizando estado', 'error')
  } finally {
    isRefreshing.value = false
  }
}

const startFullSync = async () => {
  try {
    isStartingSync.value = true
    statusMessage.value = ''
    
    await store.dispatch('whatsapp/forceFullSync', props.sessionId)
    
    showStatusMessage('Sincronización completa iniciada', 'success')
    
    // Actualizar estado después de iniciar
    setTimeout(() => {
      refreshStatus()
    }, 1000)
    
  } catch (error) {
    console.error('Error iniciando sincronización:', error)
    showStatusMessage('Error iniciando sincronización', 'error')
  } finally {
    isStartingSync.value = false
  }
}

const refreshConversations = async () => {
  try {
    isRefreshing.value = true
    statusMessage.value = ''
    
    await store.dispatch('whatsapp/refreshConversations', props.sessionId)
    
    showStatusMessage('Conversaciones actualizadas', 'success')
  } catch (error) {
    console.error('Error actualizando conversaciones:', error)
    showStatusMessage('Error actualizando conversaciones', 'error')
  } finally {
    isRefreshing.value = false
  }
}

const formatLastSyncTime = (timestamp: string) => {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) {
      return 'hace un momento'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`
    } else {
      const days = Math.floor(diffInSeconds / 86400)
      return `hace ${days} ${days === 1 ? 'día' : 'días'}`
    }   

    
  } catch {
    return 'Desconocido'
  }
}

const getSyncButtonTitle = () => {
  if (isStartingSync.value) return 'Iniciando sincronización...'
  if (!syncControl.value.canStartNewSync) return 'Sincronización en progreso, espere...'
  return 'Iniciar sincronización completa de todas las conversaciones'
}

const showStatusMessage = (message: string, type: 'info' | 'success' | 'warning' | 'error') => {
  statusMessage.value = message
  statusMessageType.value = type
  
  // Auto-ocultar mensaje después de 5 segundos
  setTimeout(() => {
    statusMessage.value = ''
  }, 5000)
}

// Lifecycle
onMounted(() => {
  // Cargar estado inicial
  refreshStatus()
})
</script>

<style scoped>
.sync-status-panel {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 8px;
}

.status-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #495057;
}

.refresh-btn {
  background: none;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.refresh-btn:hover:not(:disabled) {
  background: #e9ecef;
  border-color: #adb5bd;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-content {
  margin-bottom: 16px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f1f3f4;
}

.status-item:last-child {
  border-bottom: none;
}

.status-label {
  font-weight: 500;
  color: #6c757d;
  font-size: 14px;
}

.status-value {
  font-weight: 600;
  font-size: 14px;
}

.status-value.active {
  color: #007bff;
}

.status-value.queue {
  color: #fd7e14;
}

.status-value.available {
  color: #28a745;
}

.status-value.unavailable {
  color: #dc3545;
}

.status-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.action-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
}

.action-btn.primary {
  background: #007bff;
  color: white;
}

.action-btn.primary:hover:not(:disabled) {
  background: #0056b3;
}

.action-btn.primary:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.action-btn.secondary {
  background: #6c757d;
  color: white;
}

.action-btn.secondary:hover:not(:disabled) {
  background: #545b62;
}

.action-btn.secondary:disabled {
  background: #adb5bd;
  cursor: not-allowed;
}

.status-message {
  padding: 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
}

.status-message.info {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.status-message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-message.warning {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.status-message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

/* Responsive */
@media (max-width: 768px) {
  .sync-status-panel {
    padding: 12px;
    margin: 12px 0;
  }
  
  .status-actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .action-btn {
    width: 100%;
  }
}
</style>
