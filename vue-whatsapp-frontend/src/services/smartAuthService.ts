import { WhatsAppSession } from '../types'
import { whatsAppService } from './whatsAppService'

interface PhoneNumberSession {
  phoneNumber: string
  sessionId: string
  lastSeen: Date
  isConnected: boolean
}

class SmartAuthService {
  private phoneNumberSessions = new Map<string, PhoneNumberSession>()

  // Detectar si ya existe una sesión para un número de teléfono
  async detectExistingSession(phoneNumber: string): Promise<WhatsAppSession | null> {
    try {
      // Buscar en el caché local primero
      const cached = this.phoneNumberSessions.get(phoneNumber)
      if (cached && cached.isConnected) {
        console.log(`📱 Sesión existente detectada para ${phoneNumber}: ${cached.sessionId}`)
        return await whatsAppService.getSessionStatus(cached.sessionId)
      }

      // Buscar en todas las sesiones del backend
      const allSessions = await whatsAppService.getAllSessions()
      
      for (const session of allSessions) {
        if (session.phoneNumber === phoneNumber && session.isConnected) {
          // Actualizar caché local
          this.phoneNumberSessions.set(phoneNumber, {
            phoneNumber,
            sessionId: session.id,
            lastSeen: new Date(session.lastSeen || Date.now()),
            isConnected: session.isConnected
          })
          
          console.log(`🔗 Sesión existente vinculada: ${phoneNumber} -> ${session.id}`)
          return session
        }
      }

      return null
    } catch (error) {
      console.error('Error detectando sesión existente:', error)
      return null
    }
  }

  // Vincular número de teléfono a una sesión existente
  async linkPhoneToSession(phoneNumber: string, sessionId: string): Promise<boolean> {
    try {
      const session = await whatsAppService.getSessionStatus(sessionId)
      if (session && session.isConnected) {
        this.phoneNumberSessions.set(phoneNumber, {
          phoneNumber,
          sessionId,
          lastSeen: new Date(session.lastSeen || Date.now()),
          isConnected: session.isConnected
        })
        
        console.log(`🔗 Número ${phoneNumber} vinculado a sesión ${sessionId}`)
        return true
      }
      return false
    } catch (error) {
      console.error('Error vinculando número a sesión:', error)
      return false
    }
  }

  // Verificar si un número tiene sesión activa
  hasActiveSession(phoneNumber: string): boolean {
    const session = this.phoneNumberSessions.get(phoneNumber)
    return session?.isConnected || false
  }

  // Obtener ID de sesión para un número
  getSessionId(phoneNumber: string): string | null {
    const session = this.phoneNumberSessions.get(phoneNumber)
    return session?.sessionId || null
  }

  // Actualizar estado de conexión
  updateConnectionStatus(phoneNumber: string, isConnected: boolean): void {
    const session = this.phoneNumberSessions.get(phoneNumber)
    if (session) {
      session.isConnected = isConnected
      session.lastSeen = new Date()
    }
  }

  // Limpiar sesiones desconectadas
  cleanupDisconnectedSessions(): void {
    for (const [phoneNumber, session] of this.phoneNumberSessions.entries()) {
      if (!session.isConnected) {
        this.phoneNumberSessions.delete(phoneNumber)
      }
    }
  }

  // Obtener estadísticas de sesiones vinculadas
  getLinkedSessionsStats(): { totalLinked: number; activeSessions: number } {
    let activeSessions = 0
    for (const session of this.phoneNumberSessions.values()) {
      if (session.isConnected) activeSessions++
    }

    return {
      totalLinked: this.phoneNumberSessions.size,
      activeSessions
    }
  }
}

export const smartAuthService = new SmartAuthService()
