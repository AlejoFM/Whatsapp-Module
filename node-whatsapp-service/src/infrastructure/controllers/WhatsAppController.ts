import { Request, Response } from 'express';
import { CreateWhatsAppSessionUseCase } from '../../application/use-cases/CreateWhatsAppSessionUseCase';
import { ConnectWhatsAppSessionUseCase } from '../../application/use-cases/ConnectWhatsAppSessionUseCase';
import { SendMessageUseCase } from '../../application/use-cases/SendMessageUseCase';
import { GetConversationsUseCase } from '../../application/use-cases/GetConversationsUseCase';
import { IWhatsAppService } from '../../domain/services/IWhatsAppService';
import { ApiResponse } from '../../shared/infrastructure/ApiResponse';
import { logger } from '../../shared/infrastructure/Logger';

export class WhatsAppController {
  constructor(
    private createSessionUseCase: CreateWhatsAppSessionUseCase,
    private connectSessionUseCase: ConnectWhatsAppSessionUseCase,
    private sendMessageUseCase: SendMessageUseCase,
    private getConversationsUseCase: GetConversationsUseCase,
    private whatsAppService: IWhatsAppService
  ) {}

  async createSession(req: Request, res: Response): Promise<void> {
    try {
      const { clientId, phoneNumber } = req.body;

      if (!clientId) {
        ApiResponse.badRequest(res, 'Client ID is required');
        return;
      }

      const session = await this.createSessionUseCase.execute({ clientId, phoneNumber });
      ApiResponse.success(res, 'Session created successfully', session, 201);
    } catch (error) {
      console.error('Error creating session:', error);
      ApiResponse.internalServerError(res, 'Failed to create session');
    }
  }

  async connectSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        ApiResponse.badRequest(res, 'Session ID is required');
        return;
      }

      const result = await this.connectSessionUseCase.execute(sessionId);
      ApiResponse.success(res, 'Session connected successfully', result);
    } catch (error) {
      console.error('Error connecting session:', error);
      ApiResponse.internalServerError(res, 'Failed to connect session');
    }
  }

  async disconnectSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        ApiResponse.badRequest(res, 'Session ID is required');
        return;
      }

      await this.whatsAppService.disconnectSession(sessionId);
      ApiResponse.success(res, 'Session disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting session:', error);
      ApiResponse.internalServerError(res, 'Failed to disconnect session');
    }
  }

  async getSessionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        ApiResponse.badRequest(res, 'Session ID is required');
        return;
      }

      const session = await this.whatsAppService.getSessionStatus(sessionId);
      ApiResponse.success(res, 'Session status retrieved successfully', session);
    } catch (error) {
      console.error('Error getting session status:', error);
      ApiResponse.internalServerError(res, 'Failed to get session status');
    }
  }

  async getAllSessions(_req: Request, res: Response): Promise<void> {
    try {
      const sessions = await this.whatsAppService.getAllSessions();
      ApiResponse.success(res, 'All sessions retrieved successfully', sessions);
    } catch (error) {
      console.error('Error getting all sessions:', error);
      ApiResponse.internalServerError(res, 'Failed to get sessions');
    }
  }

  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { to, body } = req.body;

      if (!sessionId || !to || !body) {
        ApiResponse.badRequest(res, 'Session ID, recipient and message body are required');
        return;
      }

      const message = await this.sendMessageUseCase.execute(sessionId, to, body);
      ApiResponse.success(res, 'Message sent successfully', message, 201);
    } catch (error) {
      console.error('Error sending message:', error);
      ApiResponse.internalServerError(res, 'Failed to send message');
    }
  }

  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, phoneNumber } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      if (!sessionId || !phoneNumber) {
        ApiResponse.badRequest(res, 'Session ID and phone number are required');
        return;
      }

      const messages = await this.whatsAppService.getMessages(
        sessionId, 
        phoneNumber, 
        Number(limit), 
        Number(offset)
      );
      ApiResponse.success(res, 'Messages retrieved successfully', messages);
    } catch (error) {
      console.error('Error getting messages:', error);
      ApiResponse.internalServerError(res, 'Failed to get messages');
    }
  }

  async getConversations(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const { sessionId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    logger.info(`🌐 GET /conversations - Iniciando solicitud`, { 
      method: 'WhatsAppController.getConversations', 
      sessionId,
      limit: Number(limit),
      offset: Number(offset),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    try {
      if (!sessionId) {
        logger.warn(`⚠️ GET /conversations - Session ID requerido`, { 
          method: 'WhatsAppController.getConversations', 
          sessionId: 'undefined'
        });
        ApiResponse.badRequest(res, 'Session ID is required');
        return;
      }

      logger.info(`🔍 GET /conversations - Ejecutando caso de uso`, { 
        method: 'WhatsAppController.getConversations', 
        sessionId 
      });

      const conversations = await this.getConversationsUseCase.execute({
        sessionId,
        limit: Number(limit),
        offset: Number(offset)
      });

      const duration = Date.now() - startTime;
      logger.info(`✅ GET /conversations - Solicitud completada exitosamente`, { 
        method: 'WhatsAppController.getConversations', 
        sessionId,
        duration,
        conversationsCount: conversations.length,
        limit: Number(limit),
        offset: Number(offset)
      });

      ApiResponse.success(res, 'Conversations retrieved successfully', conversations);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`💥 GET /conversations - Error en solicitud: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
        method: 'WhatsAppController.getConversations', 
        sessionId,
        duration,
        error: error instanceof Error ? error.stack : error
      });
      ApiResponse.internalServerError(res, 'Failed to get conversations');
    }
  }

  async getContacts(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const { sessionId } = req.params;

    logger.info(`👥 GET /contacts - Iniciando solicitud de contactos`, { 
      method: 'WhatsAppController.getContacts', 
      sessionId,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    try {
      if (!sessionId) {
        logger.warn(`⚠️ GET /contacts - Session ID requerido`, { 
          method: 'WhatsAppController.getContacts', 
          sessionId: 'undefined'
        });
        ApiResponse.badRequest(res, 'Session ID is required');
        return;
      }

      logger.info(`🔍 GET /contacts - Obteniendo contactos`, { 
        method: 'WhatsAppController.getContacts', 
        sessionId 
      });

      const contacts = await this.whatsAppService.getContacts(sessionId);

      const duration = Date.now() - startTime;
      logger.info(`✅ GET /contacts - Contactos obtenidos exitosamente`, { 
        method: 'WhatsAppController.getContacts', 
        sessionId,
        duration,
        contactsCount: contacts.length
      });

      ApiResponse.success(res, 'Contacts retrieved successfully', contacts);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`💥 GET /contacts - Error obteniendo contactos: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
        method: 'WhatsAppController.getContacts', 
        sessionId,
        duration,
        error: error instanceof Error ? error.stack : error
      });
      ApiResponse.internalServerError(res, 'Failed to get contacts');
    }
  }

  async getNonContactConversations(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const { sessionId } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    logger.info(`📱 GET /conversations/non-contacts - Iniciando solicitud de conversaciones no contactos`, { 
      method: 'WhatsAppController.getNonContactConversations', 
      sessionId,
      limit: Number(limit),
      offset: Number(offset),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    try {
      if (!sessionId) {
        logger.warn(`⚠️ GET /conversations/non-contacts - Session ID requerido`, { 
          method: 'WhatsAppController.getNonContactConversations', 
          sessionId: 'undefined'
        });
        ApiResponse.badRequest(res, 'Session ID is required');
        return;
      }

      logger.info(`🔍 GET /conversations/non-contacts - Obteniendo conversaciones no contactos`, { 
        method: 'WhatsAppController.getNonContactConversations', 
        sessionId 
      });

      const conversations = await this.whatsAppService.getNonContactConversations(
        sessionId, 
        Number(limit), 
        Number(offset)
      );

      const duration = Date.now() - startTime;
      logger.info(`✅ GET /conversations/non-contacts - Conversaciones no contactos obtenidas exitosamente`, { 
        method: 'WhatsAppController.getNonContactConversations', 
        sessionId,
        duration,
        conversationsCount: conversations.length,
        limit: Number(limit),
        offset: Number(offset)
      });

      ApiResponse.success(res, 'Non-contact conversations retrieved successfully', conversations);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`💥 GET /conversations/non-contacts - Error obteniendo conversaciones no contactos: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
        method: 'WhatsAppController.getNonContactConversations', 
        sessionId,
        duration,
        error: error instanceof Error ? error.stack : error
      });
      ApiResponse.internalServerError(res, 'Failed to get non-contact conversations');
    }
  }

  async getContactChatsBatch(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const { sessionId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    logger.info(`📱 GET /chats/contacts - Iniciando solicitud de chats de contactos en lote`, { 
      method: 'WhatsAppController.getContactChatsBatch', 
      sessionId,
      limit: Number(limit),
      offset: Number(offset),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    try {
      if (!sessionId) {
        logger.warn(`⚠️ GET /chats/contacts - Session ID requerido`, { 
          method: 'WhatsAppController.getContactChatsBatch', 
          sessionId: 'undefined'
        });
        ApiResponse.badRequest(res, 'Session ID is required');
        return;
      }

      logger.info(`🔍 GET /chats/contacts - Obteniendo chats de contactos en lote`, { 
        method: 'WhatsAppController.getContactChatsBatch', 
        sessionId 
      });

      const contactChats = await this.whatsAppService.getContactChatsBatch(
        sessionId, 
        Number(limit), 
        Number(offset)
      );

      const duration = Date.now() - startTime;
      logger.info(`✅ GET /chats/contacts - Chats de contactos obtenidos exitosamente`, { 
        method: 'WhatsAppController.getContactChatsBatch', 
        sessionId,
        duration,
        contactChatsCount: contactChats.length,
        limit: Number(limit),
        offset: Number(offset)
      });

      ApiResponse.success(res, 'Contact chats retrieved successfully', contactChats);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`💥 GET /chats/contacts - Error obteniendo chats de contactos: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
        method: 'WhatsAppController.getContactChatsBatch', 
        sessionId,
        duration,
        error: error instanceof Error ? error.stack : error
      });
      ApiResponse.internalServerError(res, 'Failed to get contact chats');
    }
  }

  async getNonContactChatsBatch(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const { sessionId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    logger.info(`📱 GET /chats/non-contacts - Iniciando solicitud de chats no contactos en lote`, { 
      method: 'WhatsAppController.getNonContactChatsBatch', 
      sessionId,
      limit: Number(limit),
      offset: Number(offset),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    try {
      if (!sessionId) {
        logger.warn(`⚠️ GET /chats/non-contacts - Session ID requerido`, { 
          method: 'WhatsAppController.getNonContactChatsBatch', 
          sessionId: 'undefined'
        });
        ApiResponse.badRequest(res, 'Session ID is required');
        return;
      }

      logger.info(`🔍 GET /chats/non-contacts - Obteniendo chats no contactos en lote`, { 
        method: 'WhatsAppController.getNonContactChatsBatch', 
        sessionId 
      });

      const nonContactChats = await this.whatsAppService.getNonContactChatsBatch(
        sessionId, 
        Number(limit), 
        Number(offset)
      );

      const duration = Date.now() - startTime;
      logger.info(`✅ GET /chats/non-contacts - Chats no contactos obtenidos exitosamente`, { 
        method: 'WhatsAppController.getNonContactChatsBatch', 
        sessionId,
        duration,
        nonContactChatsCount: nonContactChats.length,
        limit: Number(limit),
        offset: Number(offset)
      });

      ApiResponse.success(res, 'Non-contact chats retrieved successfully', nonContactChats);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`💥 GET /chats/non-contacts - Error obteniendo chats no contactos: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
        method: 'WhatsAppController.getNonContactChatsBatch', 
        sessionId,
        duration,
        error: error instanceof Error ? error.stack : error
      });
      ApiResponse.internalServerError(res, 'Failed to get non-contact chats');
    }
  }

  async fetchChatMessages(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const { sessionId, chatId } = req.params;
    const { limit = 2, includeFromMe = 'true' } = req.query;

    logger.info(`💬 GET /chats/:chatId/messages - Iniciando solicitud de mensajes del chat`, { 
      method: 'WhatsAppController.fetchChatMessages', 
      sessionId,
      chatId,
      limit: Number(limit),
      includeFromMe,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    try {
      if (!sessionId || !chatId) {
        logger.warn(`⚠️ GET /chats/:chatId/messages - Session ID y Chat ID requeridos`, { 
          method: 'WhatsAppController.fetchChatMessages', 
          sessionId: sessionId || 'undefined',
          chatId: chatId || 'undefined'
        });
        ApiResponse.badRequest(res, 'Session ID and Chat ID are required');
        return;
      }

      logger.info(`🔍 GET /chats/:chatId/messages - Obteniendo mensajes del chat`, { 
        method: 'WhatsAppController.fetchChatMessages', 
        sessionId,
        chatId
      });

      const messages = await this.whatsAppService.fetchChatMessages(
        sessionId, 
        chatId, 
        Number(limit), 
        includeFromMe === 'true'
      );

      const duration = Date.now() - startTime;
      logger.info(`✅ GET /chats/:chatId/messages - Mensajes del chat obtenidos exitosamente`, { 
        method: 'WhatsAppController.fetchChatMessages', 
        sessionId,
        chatId,
        duration,
        messagesCount: messages.length,
        limit: Number(limit)
      });

      ApiResponse.success(res, 'Chat messages retrieved successfully', messages);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`💥 GET /chats/:chatId/messages - Error obteniendo mensajes del chat: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
        method: 'WhatsAppController.fetchChatMessages', 
        sessionId,
        chatId,
        duration,
        error: error instanceof Error ? error.stack : error
      });
      ApiResponse.internalServerError(res, 'Failed to get chat messages');
    }
  }

  async fetchChatMessagesAdvanced(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const { sessionId, chatId } = req.params;
    const { 
      limit = 50, 
      includeFromMe = 'true',
      fromDate,
      toDate,
      messageType,
      searchText
    } = req.query;

    logger.info(`🚀 GET /chats/:chatId/messages/advanced - Iniciando solicitud avanzada de mensajes`, { 
      method: 'WhatsAppController.fetchChatMessagesAdvanced', 
      sessionId,
      chatId,
      limit: Number(limit),
      includeFromMe,
      fromDate,
      toDate,
      messageType,
      searchText,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    try {
      if (!sessionId || !chatId) {
        logger.warn(`⚠️ GET /chats/:chatId/messages/advanced - Session ID y Chat ID requeridos`, { 
          method: 'WhatsAppController.fetchChatMessagesAdvanced', 
          sessionId: sessionId || 'undefined',
          chatId: chatId || 'undefined'
        });
        ApiResponse.badRequest(res, 'Session ID and Chat ID are required');
        return;
      }

      // 🔍 Preparar opciones avanzadas
      const options: {
        limit?: number;
        includeFromMe?: boolean;
        fromDate?: Date;
        toDate?: Date;
        messageType?: string;
        searchText?: string;
      } = {
        limit: Number(limit),
        includeFromMe: includeFromMe === 'true'
      };

      // 📅 Procesar fechas si se proporcionan
      if (fromDate && typeof fromDate === 'string') {
        options.fromDate = new Date(fromDate);
      }
      if (toDate && typeof toDate === 'string') {
        options.toDate = new Date(toDate);
      }

      // 📝 Procesar otros filtros
      if (messageType && typeof messageType === 'string') {
        options.messageType = messageType;
      }
      if (searchText && typeof searchText === 'string') {
        options.searchText = searchText;
      }

      logger.info(`🔍 GET /chats/:chatId/messages/advanced - Obteniendo mensajes avanzados`, { 
        method: 'WhatsAppController.fetchChatMessagesAdvanced', 
        sessionId,
        chatId,
        options
      });

      const messages = await this.whatsAppService.fetchChatMessagesAdvanced(
        sessionId, 
        chatId, 
        options
      );

      const duration = Date.now() - startTime;
      logger.info(`✅ GET /chats/:chatId/messages/advanced - Mensajes avanzados obtenidos exitosamente`, { 
        method: 'WhatsAppController.fetchChatMessagesAdvanced', 
        sessionId,
        chatId,
        duration,
        messagesCount: messages.length,
        options
      });

      ApiResponse.success(res, 'Advanced chat messages retrieved successfully', messages);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`💥 GET /chats/:chatId/messages/advanced - Error obteniendo mensajes avanzados: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
        method: 'WhatsAppController.fetchChatMessagesAdvanced', 
        sessionId,
        chatId,
        duration,
        error: error instanceof Error ? error.stack : error
      });
      ApiResponse.internalServerError(res, 'Failed to get advanced chat messages');
    }
  }

  async loadChatMessagesOnDemand(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const { sessionId, chatId } = req.params;
    const { currentLimit, additionalLimit = 10 } = req.query;

    logger.info(`📚 POST /chats/:chatId/messages/load-more - Iniciando carga de más mensajes`, { 
      method: 'WhatsAppController.loadChatMessagesOnDemand', 
      sessionId,
      chatId,
      currentLimit: Number(currentLimit),
      additionalLimit: Number(additionalLimit),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    try {
      if (!sessionId || !chatId || !currentLimit) {
        logger.warn(`⚠️ POST /chats/:chatId/messages/load-more - Parámetros requeridos faltantes`, { 
          method: 'WhatsAppController.loadChatMessagesOnDemand', 
          sessionId: sessionId || 'undefined',
          chatId: chatId || 'undefined',
          currentLimit: currentLimit || 'undefined'
        });
        ApiResponse.badRequest(res, 'Session ID, Chat ID, and current limit are required');
        return;
      }

      logger.info(`🔍 POST /chats/:chatId/messages/load-more - Cargando más mensajes`, { 
        method: 'WhatsAppController.loadChatMessagesOnDemand', 
        sessionId,
        chatId
      });

      const result = await this.whatsAppService.loadChatMessagesOnDemand(
        sessionId, 
        chatId, 
        Number(currentLimit), 
        Number(additionalLimit)
      );

      const duration = Date.now() - startTime;
      logger.info(`✅ POST /chats/:chatId/messages/load-more - Más mensajes cargados exitosamente`, { 
        method: 'WhatsAppController.loadChatMessagesOnDemand', 
        sessionId,
        chatId,
        duration,
        totalMessages: result.totalLoaded,
        hasMore: result.hasMore
      });

      ApiResponse.success(res, 'More messages loaded successfully', result);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`💥 POST /chats/:chatId/messages/load-more - Error cargando más mensajes: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
        method: 'WhatsAppController.loadChatMessagesOnDemand', 
        sessionId,
        chatId,
        duration,
        error: error instanceof Error ? error.stack : error
      });
      ApiResponse.internalServerError(res, 'Failed to load more messages');
    }
  }

  async getConversation(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, phoneNumber } = req.params;

      if (!sessionId || !phoneNumber) {
        ApiResponse.badRequest(res, 'Session ID and phone number are required');
        return;
      }

      const conversation = await this.whatsAppService.getConversation(sessionId, phoneNumber);
      if (!conversation) {
        ApiResponse.notFound(res, 'Conversation not found');
        return;
      }

      ApiResponse.success(res, 'Conversation retrieved successfully', conversation);
    } catch (error) {
      console.error('Error getting conversation:', error);
      ApiResponse.internalServerError(res, 'Failed to get conversation');
    }
  }

  async getConversationsRealtime(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      if (!sessionId) {
        ApiResponse.badRequest(res, 'Session ID is required');
        return;
      }

      const conversations = await this.whatsAppService.getConversationsRealtime(
        sessionId, 
        Number(limit), 
        Number(offset)
      );
      ApiResponse.success(res, 'Conversations retrieved in real-time successfully', conversations);
    } catch (error) {
      console.error('Error getting conversations in real-time:', error);
      ApiResponse.internalServerError(res, 'Failed to get conversations in real-time');
    }
  }

  async startProgressiveSync(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { batchSize = 10 } = req.query;

      if (!sessionId) {
        ApiResponse.badRequest(res, 'Session ID is required');
        return;
      }

      const syncResult = await this.whatsAppService.progressiveSync(sessionId, Number(batchSize));
      ApiResponse.success(res, 'Progressive sync started', syncResult);
    } catch (error) {
      console.error('Error starting progressive sync:', error);
      ApiResponse.internalServerError(res, 'Failed to start progressive sync');
    }
  }

  async continueProgressiveSync(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { offset = 0, batchSize = 10 } = req.query;

      if (!sessionId) {
        ApiResponse.badRequest(res, 'Session ID is required');
        return;
      }

      const syncResult = await this.whatsAppService.continueProgressiveSync(sessionId, Number(offset), Number(batchSize));
      ApiResponse.success(res, 'Progressive sync continued', syncResult);
    } catch (error) {
      console.error('Error continuing progressive sync:', error);
      ApiResponse.internalServerError(res, 'Failed to continue progressive sync');
    }
  }

  async forceFullSync(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        ApiResponse.badRequest(res, 'Session ID is required');
        return;
      }

      logger.info(`🔄 POST /force-full-sync - Iniciando sincronización completa para sesión ${sessionId}`, { 
        method: 'WhatsAppController.forceFullSync', 
        sessionId 
      });

      await this.whatsAppService.forceFullSync(sessionId);
      
      const duration = Date.now() - startTime;
      logger.info(`✅ POST /force-full-sync - Sincronización completa completada exitosamente`, { 
        method: 'WhatsAppController.forceFullSync', 
        sessionId,
        duration
      });

      ApiResponse.success(res, 'Full sync completed successfully');
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`💥 POST /force-full-sync - Error en sincronización completa: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
        method: 'WhatsAppController.forceFullSync', 
        sessionId: req.params.sessionId,
        duration,
        error: error instanceof Error ? error.stack : error
      });
      ApiResponse.internalServerError(res, 'Failed to complete full sync');
    }
  }

  // 🔒 NUEVO: Obtener estado de sincronización
  async getSyncStatus(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        ApiResponse.badRequest(res, 'Session ID is required');
        return;
      }

      logger.info(`🔍 GET /sync-status - Consultando estado de sincronización para sesión ${sessionId}`, { 
        method: 'WhatsAppController.getSyncStatus', 
        sessionId 
      });

      const syncStats = this.whatsAppService.getSyncStats(sessionId);
      
      logger.info(`✅ GET /sync-status - Estado de sincronización obtenido exitosamente`, { 
        method: 'WhatsAppController.getSyncStatus', 
        sessionId,
        syncStats
      });

      ApiResponse.success(res, 'Sync status retrieved successfully', syncStats);
    } catch (error) {
      logger.error(`💥 GET /sync-status - Error obteniendo estado de sincronización: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
        method: 'WhatsAppController.getSyncStatus', 
        sessionId: req.params.sessionId,
        error: error instanceof Error ? error.stack : error
      });
      ApiResponse.internalServerError(res, 'Failed to get sync status');
    }
  }
}
