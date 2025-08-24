import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { IWhatsAppService } from '../../domain/services/IWhatsAppService';
import { Message } from '../../domain/entities/Message';
import { WhatsAppSession } from '../../domain/entities/WhatsAppSession';
import { Conversation } from '../../domain/entities/Conversation';

export class WebSocketService {
  private io: SocketIOServer;

  constructor(httpServer: HttpServer, whatsAppService: IWhatsAppService) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:8080",
        methods: ["GET", "POST"]
      }
    });

    this.setupSocketHandlers();
    this.setupWhatsAppEventHandlers(whatsAppService);
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Unirse a una sala específica de sesión
      socket.on('join-session', (data: { sessionId: string }) => {
        const sessionId = data.sessionId;
        const roomName = `session-${sessionId}`;
        socket.join(roomName);
        console.log(`👤 WebSocket: Cliente ${socket.id} se unió a sala ${roomName}`);
        
        // Log de clientes en la sala
        const room = this.io.sockets.adapter.rooms.get(roomName);
        const clientCount = room ? room.size : 0;
        console.log(`👥 WebSocket: Total de clientes en sala ${roomName}: ${clientCount}`);
      });

      // Salir de una sala de sesión
      socket.on('leave-session', (data: { sessionId: string }) => {
        const sessionId = data.sessionId;
        const roomName = `session-${sessionId}`;
        socket.leave(roomName);
        console.log(`👤 WebSocket: Cliente ${socket.id} salió de sala ${roomName}`);
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  private setupWhatsAppEventHandlers(whatsAppService: IWhatsAppService): void {
    console.log('🔌 Configurando manejadores de eventos de WhatsApp...');
    
    // Escuchar mensajes recibidos
    whatsAppService.onMessageReceived((message: Message) => {
      console.log(`📨 WebSocket: Mensaje recibido para sesión ${message.sessionId}`, {
        messageId: message.id,
        from: message.from,
        body: message.body?.substring(0, 50) + '...'
      });
      
      const roomName = `session-${message.sessionId}`;
      console.log(`📡 WebSocket: Emitiendo 'message-received' a sala ${roomName}`);
      
      this.io.to(roomName).emit('message-received', message);
      
      // Log de clientes en la sala
      const room = this.io.sockets.adapter.rooms.get(roomName);
      const clientCount = room ? room.size : 0;
      console.log(`👥 WebSocket: ${clientCount} clientes en sala ${roomName}`);
    });

    // Escuchar cambios de estado de sesión
    whatsAppService.onSessionStatusChanged((session: WhatsAppSession) => {
      this.io.to(`session-${session.id}`).emit('session-status-changed', session);
    });

    // Escuchar cambios de estado de conexión
    whatsAppService.onConnectionStatusChanged((sessionId: string, isConnected: boolean) => {
      this.io.to(`session-${sessionId}`).emit('connection-status-changed', { sessionId, isConnected });
    });

    // Escuchar nuevas conversaciones
    whatsAppService.onNewConversation((conversation: any) => {
      this.io.to(`session-${conversation.sessionId}`).emit('new-conversation', {
        sessionId: conversation.sessionId,
        conversation: conversation
      });
    });

    // Escuchar conversaciones sincronizadas
    whatsAppService.onConversationsSynced((sessionId: string, conversations: Conversation[]) => {
      this.io.to(`session-${sessionId}`).emit('conversations-synced', {
        sessionId: sessionId,
        conversations: conversations
      });
    });

    // Escuchar progreso de sincronización
    whatsAppService.onSyncProgress((sessionId: string, progress: any) => {
      this.io.to(`session-${sessionId}`).emit('sync-progress', {
        sessionId: sessionId,
        progress: progress
      });
    });
  }

  // Método para emitir eventos personalizados
  emitToSession(sessionId: string, event: string, data: any): void {
    this.io.to(`session-${sessionId}`).emit(event, data);
  }

  // Método para emitir a todos los clientes
  emitToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }

  // Obtener instancia de Socket.IO para uso externo
  getIO(): SocketIOServer {
    return this.io;
  }
}
