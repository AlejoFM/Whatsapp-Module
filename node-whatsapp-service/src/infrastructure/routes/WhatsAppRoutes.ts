import { Router } from 'express';
import { WhatsAppController } from '../controllers/WhatsAppController';

export class WhatsAppRoutes {
  private router: Router;
  private controller: WhatsAppController;

  constructor(controller: WhatsAppController) {
    this.router = Router();
    this.controller = controller;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Sesiones
    this.router.post('/sessions', (req, res) => this.controller.createSession(req, res));
    this.router.get('/sessions', (req, res) => this.controller.getAllSessions(req, res));
    this.router.get('/sessions/:sessionId', (req, res) => this.controller.getSessionStatus(req, res));
    this.router.post('/sessions/:sessionId/connect', (req, res) => this.controller.connectSession(req, res));
    this.router.post('/sessions/:sessionId/disconnect', (req, res) => this.controller.disconnectSession(req, res));

    // Mensajes
    this.router.post('/sessions/:sessionId/messages', (req, res) => this.controller.sendMessage(req, res));
    this.router.get('/sessions/:sessionId/messages/:phoneNumber', (req, res) => this.controller.getMessages(req, res));

    // 🔄 NUEVO: Contactos
    this.router.get('/sessions/:sessionId/contacts', (req, res) => this.controller.getContacts(req, res));

    // Conversaciones
    this.router.get('/sessions/:sessionId/conversations', (req, res) => this.controller.getConversations(req, res));
    this.router.get('/sessions/:sessionId/conversations/realtime', (req, res) => this.controller.getConversationsRealtime(req, res));
    this.router.get('/sessions/:sessionId/conversations/:phoneNumber', (req, res) => this.controller.getConversation(req, res));
    
    // 🔄 NUEVO: Conversaciones separadas por tipo
    this.router.get('/sessions/:sessionId/conversations/contacts', (req, res) => this.controller.getContactConversations(req, res));
    this.router.get('/sessions/:sessionId/conversations/non-contacts', (req, res) => this.controller.getNonContactConversations(req, res));
    
    // 🚀 NUEVO: Estrategia de carga progresiva para chats y mensajes
    this.router.get('/sessions/:sessionId/chats/contacts', (req, res) => this.controller.getContactChatsBatch(req, res));
    this.router.get('/sessions/:sessionId/chats/non-contacts', (req, res) => this.controller.getNonContactChatsBatch(req, res));
    this.router.get('/sessions/:sessionId/chats/:chatId/messages', (req, res) => this.controller.fetchChatMessages(req, res));
    this.router.get('/sessions/:sessionId/chats/:chatId/messages/advanced', (req, res) => this.controller.fetchChatMessagesAdvanced(req, res));
    this.router.post('/sessions/:sessionId/chats/:chatId/messages/load-more', (req, res) => this.controller.loadChatMessagesOnDemand(req, res));
    
    // Sincronización progresiva
    this.router.post('/sessions/:sessionId/sync/progressive', (req, res) => this.controller.startProgressiveSync(req, res));
    this.router.post('/sessions/:sessionId/sync/progressive/continue', (req, res) => this.controller.continueProgressiveSync(req, res));
    
    // 🔒 Control de sincronización
    this.router.get('/sessions/:sessionId/sync-status', (req, res) => this.controller.getSyncStatus(req, res));
    this.router.post('/sessions/:sessionId/force-full-sync', (req, res) => this.controller.forceFullSync(req, res));
  }

  getRouter(): Router {
    return this.router;
  }
}
