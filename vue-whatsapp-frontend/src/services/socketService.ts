import { io, Socket } from 'socket.io-client'
import { Store } from 'vuex'
import { WhatsAppSession, Message, Conversation } from '../types'

const SOCKET_URL = process.env.VUE_APP_SOCKET_URL || 'http://localhost:3000'

// 🔄 NUEVO: Interfaz para el estado del store de WhatsApp
interface WhatsAppState {
  whatsapp: {
    sessions: WhatsAppSession[]
    contacts: { id: string; name: string; phoneNumber: string; isContact: boolean }[]
  }
}

class SocketService {
  private socket: Socket | null = null
  private store: Store<WhatsAppState> | null = null

  connect() {
    if (this.socket) {
      return
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    })

    this.setupEventHandlers()
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  joinSession(sessionId: string) {
    if (this.socket) {
      this.socket.emit('join-session', { sessionId })
    } else {
      console.warn('⚠️ Socket no disponible para joinSession');
    }
  }

  leaveSession(sessionId: string) {
    if (this.socket) {
      this.socket.emit('leave-session', { sessionId })
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('✅ SocketService: Conectado al servidor WebSocket')
      
      // Al reconectarse, volver a unirse a las salas activas
      this.rejoinActiveSessions()
    })

    this.socket.on('disconnect', () => {
      console.log('❌ SocketService: Desconectado del servidor WebSocket')
    })

    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log(`🔄 SocketService: Reconectado después de ${attemptNumber} intentos`)
    })

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log(`🔄 SocketService: Intento de reconexión ${attemptNumber}`)
    })

    this.socket.on('reconnect_failed', () => {
      console.log('❌ SocketService: Falló la reconexión automática')
    })

    this.socket.on('message-received', (message: Message) => {
      if (this.store) {
        try {
          this.store.dispatch('whatsapp/handleMessageReceived', message)
        } catch (error) {
          console.error('❌ Error al despachar handleMessageReceived:', error);
        }
      } else {
        console.warn('⚠️ Store no disponible para message-received');
      }
    })

    this.socket.on('session-status-changed', (session: WhatsAppSession) => {
      if (this.store) {
        this.store.dispatch('whatsapp/handleSessionStatusChanged', session)
      }
    })

    this.socket.on('connection-status-changed', (data: { sessionId: string, isConnected: boolean }) => {
      if (this.store) {
        this.store.dispatch('whatsapp/handleConnectionStatusChanged', data)
      }
    })

    // Eventos para conversaciones en tiempo real
    this.socket.on('new-conversation', (data: { sessionId: string, conversation: Conversation }) => {
      if (this.store) {
        this.store.dispatch('whatsapp/handleNewConversation', data)
      }
    })

    this.socket.on('conversation-updated', (data: { sessionId: string, conversation: Conversation }) => {
      if (this.store) {
        this.store.dispatch('whatsapp/handleConversationUpdated', data)
      }
    })

    this.socket.on('conversations-synced', (data: { sessionId: string, conversations: Conversation[] }) => {
      if (this.store) {
        this.store.dispatch('whatsapp/handleConversationsSynced', data)
      }
    })

    this.socket.on('sync-progress', (data: { sessionId: string, progress: { current: number, total: number, conversation: Conversation } }) => {
      if (this.store) {
        this.store.dispatch('whatsapp/handleSyncProgress', data)
      }
    })

    this.socket.on('error', (error: Error) => {
      console.error('WebSocket error:', error)
    })
  }

  setStore(store: Store<WhatsAppState>) {
    this.store = store
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }

  // Método para escuchar cambios de estado de sesión
  onSessionStatusChanged(callback: (session: WhatsAppSession) => void): void {
    if (this.socket) {
      this.socket.on('session-status-changed', callback)
    }
  }

  // Método para remover listener de cambios de estado de sesión
  offSessionStatusChanged(callback: (session: WhatsAppSession) => void): void {
    if (this.socket) {
      this.socket.off('session-status-changed', callback)
    }
  }

  // Método para reconectar y volver a unirse a las salas activas
  reconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔄 SocketService: Reconectando WebSocket...')
      
      if (this.socket) {
        this.socket.disconnect()
        this.socket = null
      }
      
      // Crear nuevo socket
      this.connect()
      
      // Esperar un poco para que se cree el socket
      setTimeout(() => {
        if (this.socket) {
          // Esperar a que se conecte o falle
          this.socket.once('connect', () => {
            console.log('✅ SocketService: Reconexión exitosa')
            resolve()
          })
          
          this.socket.once('connect_error', (error: Error) => {
            console.error('❌ SocketService: Error en reconexión:', error)
            reject(error)
          })
          
          // Timeout de 10 segundos
          setTimeout(() => {
            reject(new Error('Timeout en reconexión'))
          }, 30000)
        } else {
          reject(new Error('No se pudo crear el socket'))
        }
      }, 100)
    })
  }

  // Método para volver a unirse a las salas de sesión activas
  rejoinActiveSessions() {
    if (this.store) {
      // Obtener sesiones activas del store y volver a unirse
      const state = this.store.state
      if (state.whatsapp && state.whatsapp.sessions) {
        const activeSessions = state.whatsapp.sessions.filter((s: WhatsAppSession) => s.isConnected)
        console.log(`🔄 SocketService: Volviendo a unirse a ${activeSessions.length} sesiones activas`)
        
        activeSessions.forEach((session: WhatsAppSession) => {
          this.joinSession(session.id)
        })
      }
    }
  }
}

export const socketService = new SocketService()
