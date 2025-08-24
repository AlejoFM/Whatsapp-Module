<template>
  <div v-if="syncProgress.isActive" class="sync-progress-overlay">
    <div class="sync-progress-card">
      <div class="sync-header">
        <div class="sync-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M7.76 7.76L6 12L7.76 16.24M16.24 16.24L18 12L16.24 7.76" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h3 class="sync-title">Sincronizando Conversaciones</h3>
      </div>
      
      <div class="progress-container">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: `${progressPercentage}%` }"
          ></div>
        </div>
        <div class="progress-text">
          {{ syncProgress.current }} de {{ syncProgress.total }}
        </div>
      </div>
      
      <div v-if="syncProgress.currentConversation" class="current-contact">
        <span class="contact-label">Procesando:</span>
        <span class="contact-name">{{ syncProgress.currentConversation.contactName }}</span>
        <span class="contact-phone">({{ syncProgress.currentConversation.phoneNumber }})</span>
      </div>
      
      <div class="sync-status">
        <span class="status-text">
          {{ getStatusText() }}
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'SyncProgressBar',
  computed: {
    ...mapState('whatsapp', ['syncProgress']),
    progressPercentage() {
      if (this.syncProgress.total === 0) return 0
      return Math.round((this.syncProgress.current / this.syncProgress.total) * 100)
    }
  },
  methods: {
    getStatusText() {
      if (this.syncProgress.current === 0) {
        return 'Iniciando sincronización...'
      } else if (this.syncProgress.current >= this.syncProgress.total) {
        return 'Sincronización completada'
      } else {
        return 'Sincronizando conversaciones...'
      }
    }
  }
}
</script>

<style scoped>
.sync-progress-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.sync-progress-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  width: 90%;
  text-align: center;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.sync-header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  gap: 12px;
}

.sync-icon {
  color: #2563eb;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.sync-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.progress-container {
  margin-bottom: 24px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2563eb, #3b82f6);
  border-radius: 4px;
  transition: width 0.3s ease;
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.progress-text {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.current-contact {
  background: #f3f4f6;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  text-align: left;
}

.contact-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.contact-name {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
}

.contact-phone {
  display: block;
  font-size: 14px;
  color: #6b7280;
  font-family: 'Courier New', monospace;
}

.sync-status {
  padding: 12px;
  background: #eff6ff;
  border-radius: 8px;
  border: 1px solid #dbeafe;
}

.status-text {
  font-size: 14px;
  color: #1e40af;
  font-weight: 500;
}

/* Responsive */
@media (max-width: 480px) {
  .sync-progress-card {
    padding: 24px;
    margin: 20px;
  }
  
  .sync-title {
    font-size: 18px;
  }
  
  .progress-text {
    font-size: 14px;
  }
}
</style>
