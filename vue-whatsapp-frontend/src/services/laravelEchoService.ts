import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

// Definir tipos para los datos de eventos
interface MessageData {
  messageId: string
  from: string
  body: string
  sessionId: string
  [key: string]: unknown
}

interface SessionData {
  sessionId: string
  status: string
  [key: string]: unknown
}

interface ConnectionData {
  sessionId: string
  status: string
  [key: string]: unknown
}

// Tipo para el store
interface Store {
  dispatch: (action: string, data: unknown) => void
}

declare global {
  interface Window {
    Pusher: typeof Pusher
    Echo: Echo<'pusher'>
  }
}

class LaravelEchoService {
  private echo: Echo<'pusher'> | null = null
  private store: Store | null = null

  constructor() {
    // this.initializeEcho() // DESHABILITADO TEMPORALMENTE
    console.log('🔌 LaravelEcho: Deshabilitado - usando solo Socket.IO')
  }

  private initializeEcho(): void {
    // Configurar Pusher
    window.Pusher = Pusher

    // Inicializar Laravel Echo con Pusher (Laravel Echo Server)
    this.echo = new Echo({
      broadcaster: 'pusher',
      key: process.env.VUE_APP_PUSHER_APP_KEY || 'pusher-key-123',
      wsHost: process.env.VUE_APP_PUSHER_HOST || 'localhost',
      wsPort: Number(process.env.VUE_APP_PUSHER_PORT) || 6001,
      cluster: process.env.VUE_APP_PUSHER_APP_CLUSTER || 'us1',
      forceTLS: false,
      disableStats: true,
      enabledTransports: ['ws', 'wss'],
    })

    this.setupEventHandlers()
  }

  public setStore(store: Store): void {
    this.store = store
  }

  public joinSession(sessionId: string): void {
    if (!this.echo) return

    console.log(`🔌 LaravelEcho: Uniéndose a sesión ${sessionId}`)

    // Canal privado para la sesión específica
    this.echo.private(`whatsapp.session.${sessionId}`)
      .listen('.session.status.changed', (data: SessionData) => {
        console.log('📡 LaravelEcho: Evento session.status.changed recibido', data)
        this.handleSessionStatusChanged(data)
      })
      .listen('.message.received', (data: MessageData) => {
        console.log('📡 LaravelEcho: Evento message.received recibido', data)
        this.handleMessageReceived(data)
      })
      .listen('.connection.status.changed', (data: ConnectionData) => {
        console.log('📡 LaravelEcho: Evento connection.status.changed recibido', data)
        this.handleConnectionStatusChanged(data)
      })

    // Canal público para todas las sesiones
    this.echo.channel('whatsapp.sessions')
      .listen('.session.created', (data: SessionData) => {
        console.log('📡 LaravelEcho: Evento session.created recibido', data)
        this.handleSessionCreated(data)
      })

    // Canal público para todos los mensajes
    this.echo.channel('whatsapp.messages')
      .listen('.message.received', (data: MessageData) => {
        console.log('📡 LaravelEcho: Evento message.received (público) recibido', data)
        this.handleMessageReceived(data)
      })

    // Canal público para conexiones
    this.echo.channel('whatsapp.connections')
      .listen('.connection.status.changed', (data: ConnectionData) => {
        console.log('📡 LaravelEcho: Evento connection.status.changed (público) recibido', data)
        this.handleConnectionStatusChanged(data)
      })
  }

  public leaveSession(sessionId: string): void {
    if (!this.echo) return

    console.log(`🔌 LaravelEcho: Abandonando sesión ${sessionId}`)

    // Abandonar canales privados
    this.echo.leave(`whatsapp.session.${sessionId}`)
  }

  public disconnect(): void {
    if (this.echo) {
      this.echo.disconnect()
      this.echo = null
    }
  }

  private setupEventHandlers(): void {
    if (!this.echo) return

    this.echo.connector.pusher.connection.bind('connected', () => {
      console.log('✅ LaravelEcho: Conectado al servidor')
    })

    this.echo.connector.pusher.connection.bind('disconnected', () => {
      console.log('❌ LaravelEcho: Desconectado del servidor')
    })

    this.echo.connector.pusher.connection.bind('reconnected', () => {
      console.log('🔄 LaravelEcho: Reconectado al servidor')
    })
  }

  private handleMessageReceived(data: MessageData): void {
    if (this.store) {
      try {
        this.store.dispatch('whatsapp/handleMessageReceived', data)
        console.log('✅ LaravelEcho: Mensaje procesado por el store')
      } catch (error) {
        console.error('❌ LaravelEcho: Error al procesar mensaje en el store:', error)
      }
    } else {
      console.warn('⚠️ LaravelEcho: Store no disponible para procesar mensaje')
    }
  }

  private handleSessionStatusChanged(data: SessionData): void {
    if (this.store) {
      try {
        this.store.dispatch('whatsapp/handleSessionStatusChanged', data)
        console.log('✅ LaravelEcho: Cambio de estado de sesión procesado')
      } catch (error) {
        console.error('❌ LaravelEcho: Error al procesar cambio de estado:', error)
      }
    }
  }

  private handleConnectionStatusChanged(data: ConnectionData): void {
    if (this.store) {
      try {
        this.store.dispatch('whatsapp/handleConnectionStatusChanged', data)
        console.log('✅ LaravelEcho: Cambio de estado de conexión procesado')
      } catch (error) {
        console.error('❌ LaravelEcho: Error al procesar cambio de conexión:', error)
      }
    }
  }

  private handleSessionCreated(data: SessionData): void {
    if (this.store) {
      try {
        this.store.dispatch('whatsapp/handleSessionCreated', data)
        console.log('✅ LaravelEcho: Nueva sesión procesada')
      } catch (error) {
        console.error('❌ LaravelEcho: Error al procesar nueva sesión:', error)
      }
    }
  }

  public getEcho(): Echo<'pusher'> | null {
    return this.echo
  }

  public isConnected(): boolean {
    return this.echo?.connector.pusher.connection.state === 'connected'
  }
}

export default LaravelEchoService
