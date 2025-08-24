import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { WhatsAppSession, SessionModel } from '../models/Session'

export class SessionsViewModel {
  private store = useStore()
  
  // Estado reactivo
  public currentSession = ref<WhatsAppSession | null>(null)
  public isConnecting = ref(false)
  public showQRModal = ref(false)

  // Computed properties
  get sessions(): WhatsAppSession[] {
    return this.store.state.whatsapp.sessions
  }

  get activeSessionsCount(): number {
    return this.sessions.filter(session => session.isConnected && session.isAuthenticated).length
  }

  get loading(): boolean {
    return this.store.state.whatsapp.loading
  }

  // Métodos de negocio
  async createSession(clientId: string): Promise<void> {
    try {
      await this.store.dispatch('whatsapp/createSession', { clientId })
    } catch (error) {
      console.error('Error creating session:', error)
      throw error
    }
  }

  async connectSession(sessionId: string): Promise<void> {
    try {
      this.isConnecting.value = true
      this.currentSession.value = this.sessions.find(s => s.id === sessionId) || null
      
      if (this.currentSession.value) {
        this.showQRModal.value = true
      }
      
      await this.store.dispatch('whatsapp/connectSession', sessionId)
    } catch (error) {
      console.error('Error connecting session:', error)
      this.isConnecting.value = false
      this.showQRModal.value = false
      throw error
    }
  }

  async disconnectSession(sessionId: string): Promise<void> {
    try {
      await this.store.dispatch('whatsapp/disconnectSession', sessionId)
    } catch (error) {
      console.error('Error disconnecting session:', error)
      throw error
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.store.dispatch('whatsapp/deleteSession', sessionId)
    } catch (error) {
      console.error('Error deleting session:', error)
      throw error
    }
  }

  // Métodos de UI
  openQRModal(session: WhatsAppSession): void {
    this.currentSession.value = session
    this.showQRModal.value = true
  }

  closeQRModal(): void {
    this.showQRModal.value = false
    this.currentSession.value = null
    this.isConnecting.value = false
  }

  // Métodos de limpieza
  cleanup(): void {
    this.currentSession.value = null
    this.isConnecting.value = false
    this.showQRModal.value = false
  }

  // Getters para el template
  get reactiveState() {
    return {
      currentSession: this.currentSession,
      isConnecting: this.isConnecting,
      showQRModal: this.showQRModal
    }
  }

  get reactiveMethods() {
    return {
      createSession: this.createSession.bind(this),
      connectSession: this.connectSession.bind(this),
      disconnectSession: this.disconnectSession.bind(this),
      deleteSession: this.deleteSession.bind(this),
      openQRModal: this.openQRModal.bind(this),
      closeQRModal: this.closeQRModal.bind(this),
      cleanup: this.cleanup.bind(this)
    }
  }
}
