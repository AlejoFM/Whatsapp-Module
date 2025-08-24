import { Conversation } from '../types'

interface CacheEntry {
  conversations: Conversation[]
  timestamp: number
  sessionId: string
  lastSync: number
}

class ConversationCache {
  private cache = new Map<string, CacheEntry>()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutos
  private readonly MAX_CACHE_SIZE = 50 // Máximo 50 sesiones en caché

  // Guardar conversaciones en caché
  setConversations(sessionId: string, conversations: Conversation[]): void {
    // Limpiar caché si está muy lleno
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.cleanupCache()
    }

    this.cache.set(sessionId, {
      conversations,
      timestamp: Date.now(),
      sessionId,
      lastSync: Date.now()
    })

    // Guardar en localStorage para persistencia
    this.saveToLocalStorage(sessionId, conversations)
  }

  // Obtener conversaciones del caché
  getConversations(sessionId: string): Conversation[] | null {
    const entry = this.cache.get(sessionId)
    
    if (!entry) {
      // Intentar cargar desde localStorage
      const cached = this.loadFromLocalStorage(sessionId)
      if (cached) {
        this.cache.set(sessionId, {
          conversations: cached,
          timestamp: Date.now(),
          sessionId,
          lastSync: Date.now()
        })
        return cached
      }
      return null
    }

    // Verificar si el caché ha expirado
    if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
      this.cache.delete(sessionId)
      return null
    }

    return entry.conversations
  }

  // Verificar si hay caché válido
  hasValidCache(sessionId: string): boolean {
    const entry = this.cache.get(sessionId)
    if (!entry) return false
    
    return Date.now() - entry.timestamp <= this.CACHE_DURATION
  }

  // Actualizar timestamp de sincronización
  updateLastSync(sessionId: string): void {
    const entry = this.cache.get(sessionId)
    if (entry) {
      entry.lastSync = Date.now()
      entry.timestamp = Date.now()
    }
  }

  // Limpiar caché expirado
  private cleanupCache(): void {
    const now = Date.now()
    for (const [sessionId, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        this.cache.delete(sessionId)
      }
    }
  }

  // Guardar en localStorage
  private saveToLocalStorage(sessionId: string, conversations: Conversation[]): void {
    try {
      const key = `whatsapp_conversations_${sessionId}`
      const data = {
        conversations,
        timestamp: Date.now(),
        sessionId
      }
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.warn('No se pudo guardar en localStorage:', error)
    }
  }

  // Cargar desde localStorage
  private loadFromLocalStorage(sessionId: string): Conversation[] | null {
    try {
      const key = `whatsapp_conversations_${sessionId}`
      const data = localStorage.getItem(key)
      if (!data) return null

      const parsed = JSON.parse(data)
      const maxAge = 24 * 60 * 60 * 1000 // 24 horas máximo en localStorage
      
      if (Date.now() - parsed.timestamp > maxAge) {
        localStorage.removeItem(key)
        return null
      }

      return parsed.conversations
    } catch (error) {
      console.warn('Error cargando desde localStorage:', error)
      return null
    }
  }

  // Limpiar caché de una sesión específica
  clearSession(sessionId: string): void {
    this.cache.delete(sessionId)
    try {
      const key = `whatsapp_conversations_${sessionId}`
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('Error limpiando localStorage:', error)
    }
  }

  // Obtener estadísticas del caché
  getCacheStats(): { totalSessions: number; totalConversations: number } {
    let totalConversations = 0
    for (const entry of this.cache.values()) {
      totalConversations += entry.conversations.length
    }

    return {
      totalSessions: this.cache.size,
      totalConversations
    }
  }
}

export const conversationCache = new ConversationCache()
