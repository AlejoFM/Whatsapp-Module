import { Client, LocalAuth, Message as WwebjsMessage } from 'whatsapp-web.js';
import { IWhatsAppService } from '../../domain/services/IWhatsAppService';
import { IWhatsAppSessionRepository } from '../../domain/repositories/IWhatsAppSessionRepository';
import { IMessageRepository } from '../../domain/repositories/IMessageRepository';
import { IConversationRepository } from '../../domain/repositories/IConversationRepository';
import { WhatsAppSession, WhatsAppSessionCreate } from '../../domain/entities/WhatsAppSession';
import { Message, MessageCreate, MessageType, MessageStatus } from '../../domain/entities/Message';
import { Conversation, ConversationCreate } from '../../domain/entities/Conversation';
import * as QRCode from 'qrcode';
import { logger } from '../../shared/infrastructure/Logger';

export class WhatsAppService implements IWhatsAppService {
  private clients: Map<string, Client> = new Map();
  private messageCallbacks: ((message: Message) => void)[] = [];
  private sessionStatusCallbacks: ((session: WhatsAppSession) => void)[] = [];
  private connectionStatusCallbacks: ((sessionId: string, isConnected: boolean) => void)[] = [];
  private newConversationCallbacks: ((conversation: Conversation) => void)[] = [];
  private conversationsSyncedCallbacks: ((sessionId: string, conversations: Conversation[]) => void)[] = [];
  private syncProgressCallbacks: ((sessionId: string, progress: { current: number, total: number, conversation: Conversation }) => void)[] = [];
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  // 🔒 Control de sincronizaciones activas para evitar múltiples simultáneas
  private activeSyncs: Map<string, boolean> = new Map();
  private syncQueue: Map<string, Array<() => Promise<void>>> = new Map();
  private lastSyncTimes: Map<string, Date> = new Map();

  constructor(
    private sessionRepository: IWhatsAppSessionRepository,
    private messageRepository: IMessageRepository,
    private conversationRepository: IConversationRepository
  ) {}

  async createSession(data: WhatsAppSessionCreate): Promise<WhatsAppSession> {
    const session = await this.sessionRepository.create(data);
    return session;
  }

  async connectSession(sessionId: string): Promise<{ qrCode: string; session: WhatsAppSession }> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (this.clients.has(sessionId)) {
      throw new Error('Session already connected');
    }

    // 🔧 Limpiar sesión anterior para evitar conflictos
    await this.cleanupPreviousSession(session.clientId);

    // Crear cliente de WhatsApp
    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: session.clientId,
        dataPath: `./sessions/${session.clientId}`
      }),
      puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || this.getPuppeteerExecutablePath(),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-field-trial-config',
          '--disable-ipc-flooding-protection',
          '--disable-default-apps',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--mute-audio',
          '--no-default-browser-check',
          '--safebrowsing-disable-auto-update',
          '--disable-features=TranslateUI',
          '--disable-background-networking',
          '--disable-component-extensions-with-background-pages',
          '--disable-background-mode',
          '--disable-client-side-phishing-detection',
          '--disable-hang-monitor',
          '--disable-prompt-on-repost',
          '--disable-domain-reliability',
          '--disable-component-update',
          '--disable-features=AudioServiceOutOfProcess',
          '--disable-software-rasterizer',
          '--disable-threaded-animation',
          '--disable-threaded-scrolling',
          '--disable-in-process-stack-traces',
          '--disable-histogram-customizer',
          '--disable-gl-extensions',
          '--disable-composited-antialiasing',
          '--disable-canvas-aa',
          '--disable-3d-apis',
          '--disable-accelerated-layers',
          '--disable-accelerated-plugins',
          '--disable-accelerated-video',
          '--disable-accelerated-video-decode',
          '--disable-gpu-sandbox',
          // 🔧 Argumentos específicos para Windows
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--disable-background-networking',
          '--disable-component-extensions-with-background-pages',
          '--disable-background-mode',
          '--disable-client-side-phishing-detection',
          '--disable-hang-monitor',
          '--disable-prompt-on-repost',
          '--disable-domain-reliability',
          '--disable-component-update',
          '--disable-features=AudioServiceOutOfProcess',
          '--disable-software-rasterizer',
          '--disable-threaded-animation',
          '--disable-threaded-scrolling',
          '--disable-in-process-stack-traces',
          '--disable-histogram-customizer',
          '--disable-gl-extensions',
          '--disable-composited-antialiasing',
          '--disable-canvas-aa',
          '--disable-3d-apis',
          '--disable-accelerated-layers',
          '--disable-accelerated-plugins',
          '--disable-accelerated-video',
          '--disable-accelerated-video-decode',
          '--disable-gpu-sandbox'
        ],
        headless: true,
        timeout: 60000
      }
    });

    // Variable para almacenar el QR real
    let qrCodeDataUrl: string | null = null;
    let qrResolve: (value: { qrCode: string; session: WhatsAppSession }) => void;
    let qrReject: (reason?: any) => void;
    let isResolved = false;

    // Crear una promesa que se resolverá cuando se genere el QR o se complete la autenticación
    const qrPromise = new Promise<{ qrCode: string; session: WhatsAppSession }>((resolve, reject) => {
      qrResolve = resolve;
      qrReject = reject;
    });

    // Configurar eventos del cliente
    client.on('qr', async (qr) => {
      try {
        console.log('QR Code received from WhatsApp Web');
        qrCodeDataUrl = await QRCode.toDataURL(qr, {
          errorCorrectionLevel: 'M',
          type: 'image/png',
          margin: 1
        });
        
        await this.sessionRepository.update(sessionId, { qrCode: qrCodeDataUrl });
        this.notifySessionStatusChanged(session);
        
        // Resolver la promesa con el QR real
        if (qrResolve && qrCodeDataUrl && !isResolved) {
          isResolved = true;
          const updatedSession = await this.sessionRepository.findById(sessionId);
          if (updatedSession) {
            qrResolve({ qrCode: qrCodeDataUrl, session: updatedSession });
          }
        }
      } catch (error) {
        console.error('Error generating QR code:', error);
        if (qrReject) {
          qrReject(error);
        }
      }
    });

    client.on('ready', async () => {
      console.log('WhatsApp client is ready');
      const info = await client.info;
      await this.sessionRepository.update(sessionId, {
        isConnected: true,
        isAuthenticated: true,
        phoneNumber: info.wid.user,
        lastSeen: new Date()
      });
      
      const updatedSession = await this.sessionRepository.findById(sessionId);
      if (updatedSession) {
        this.notifySessionStatusChanged(updatedSession);
        this.notifyConnectionStatusChanged(sessionId, true);
        
        // Si la promesa del QR no se ha resuelto, resolverla con la sesión autenticada
        if (!isResolved && qrResolve) {
          isResolved = true;
          // Generar un QR vacío ya que la sesión está autenticada
          const emptyQR = await QRCode.toDataURL('Session already authenticated', {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            margin: 1
          });
          qrResolve({ qrCode: emptyQR, session: updatedSession });
        }

        // Obtener conversaciones no leídas inmediatamente cuando esté listo
        this.getUnreadConversations(client, sessionId);
        
        // Iniciar sincronización automática
        //this.startAutoSync(sessionId);
      }
    });

    client.on('disconnected', async () => {
      console.log('WhatsApp client disconnected');
      await this.sessionRepository.update(sessionId, {
        isConnected: false,
        isAuthenticated: false
      });
      
      const updatedSession = await this.sessionRepository.findById(sessionId);
      if (updatedSession) {
        this.notifySessionStatusChanged(updatedSession);
        this.notifyConnectionStatusChanged(sessionId, false);
      }
      
      this.clients.delete(sessionId);
    });

    client.on('message', async (msg: WwebjsMessage) => {
      await this.handleIncomingMessage(sessionId, msg);
    });

    client.on('auth_failure', async (msg) => {
      console.error('Authentication failed:', msg);
      await this.sessionRepository.update(sessionId, {
        isConnected: false,
        isAuthenticated: false
      });
      
      const updatedSession = await this.sessionRepository.findById(sessionId);
      if (updatedSession) {
        this.notifySessionStatusChanged(updatedSession);
      }
      
      if (qrReject && !isResolved) {
        isResolved = true;
        qrReject(new Error('Authentication failed'));
      }
    });

    try {
      // Inicializar cliente con reintentos
      console.log('Initializing WhatsApp client...');
      
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          await client.initialize();
          console.log('WhatsApp client initialized successfully');
          break;
        } catch (initError) {
          retryCount++;
          console.log(`Initialization attempt ${retryCount} failed:`, initError);
          
          // Si es un error de contexto destruido, esperar más tiempo
          if (initError instanceof Error && initError.message.includes('Execution context was destroyed')) {
            console.log('Context destroyed, waiting longer before retry...');
            await new Promise(resolve => setTimeout(resolve, 5000));
          } else {
            // Esperar antes de reintentar
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          if (retryCount >= maxRetries) {
            throw initError;
          }
        }
      }
      
      this.clients.set(sessionId, client);
      
      // Esperar a que se genere el QR o se complete la autenticación
      // Agregar timeout de 15 segundos
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('QR generation timeout')), 15000);
      });
      
      return await Promise.race([qrPromise, timeoutPromise]);
    } catch (error) {
      console.error('Error initializing WhatsApp client:', error);
      this.clients.delete(sessionId);
      throw error;
    }
  }

    async disconnectSession(sessionId: string): Promise<void> {
    const client = this.clients.get(sessionId);
    if (client) {
      try {
        // Cerrar la página de Puppeteer primero
        if (client.pupPage && !client.pupPage.isClosed()) {
          try {
            await client.pupPage.close()
          } catch (pageError) {
            logger.warn(`Error closing Puppeteer page for session ${sessionId}: ${pageError}`)
          }
        }

        // Destruir el cliente con timeout
        const destroyPromise = client.destroy()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Destroy timeout')), 10000)
        )
        
        await Promise.race([destroyPromise, timeoutPromise])
        this.clients.delete(sessionId)
        
        logger.info(`Client destroyed successfully for session ${sessionId}`)
      } catch (error) {
        logger.warn(`Error destroying client for session ${sessionId}: ${error}`)
        
        // Forzar eliminación del cliente del mapa
        this.clients.delete(sessionId)
      }
    }

    // Detener sincronización automática
    this.stopAutoSync(sessionId);

    // Limpiar archivos de sesión de manera más robusta para Windows
    await this.cleanupSessionFiles(sessionId);

    await this.sessionRepository.update(sessionId, {
      isConnected: false,
      isAuthenticated: false
    });
  }

  // Método para limpiar archivos de sesión de manera robusta
  private async cleanupSessionFiles(sessionId: string): Promise<void> {
    try {
      const session = await this.sessionRepository.findById(sessionId);
      if (!session) return;

      const sessionPath = `./sessions/${session.clientId}`;
      
      // Esperar un poco antes de intentar limpiar archivos
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Intentar limpiar archivos de sesión con manejo de errores
      try {
        const fs = require('fs');
        const path = require('path');
        
        if (fs.existsSync(sessionPath)) {
          // En Windows, algunos archivos pueden estar bloqueados
          // Intentar eliminar archivos individuales primero
          const cleanupFiles = (dir: string) => {
            if (fs.existsSync(dir)) {
              const files = fs.readdirSync(dir);
              for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                
                if (stat.isDirectory()) {
                  cleanupFiles(filePath);
                  try {
                    fs.rmdirSync(filePath);
                  } catch (rmError) {
                    logger.warn(`Could not remove directory ${filePath}: ${rmError}`);
                  }
                } else {
                  try {
                    fs.unlinkSync(filePath);
                  } catch (unlinkError) {
                    logger.warn(`Could not remove file ${filePath}: ${unlinkError}`);
                  }
                }
              }
            }
          };
          
          cleanupFiles(sessionPath);
          
          // Intentar eliminar el directorio principal
          try {
            fs.rmdirSync(sessionPath);
          } catch (rmError) {
            logger.warn(`Could not remove main session directory ${sessionPath}: ${rmError}`);
          }
        }
      } catch (fsError) {
        logger.warn(`Error during session file cleanup for ${sessionId}: ${fsError}`);
      }
    } catch (error) {
      logger.warn(`Error in cleanupSessionFiles for ${sessionId}: ${error}`);
    }
  }

  async getSessionStatus(sessionId: string): Promise<WhatsAppSession> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    return session;
  }

  async getAllSessions(): Promise<WhatsAppSession[]> {
    return this.sessionRepository.findAll();
  }

  async sendMessage(sessionId: string, to: string, body: string): Promise<Message> {
    const client = this.clients.get(sessionId);
    if (!client) {
      throw new Error('Session not connected');
    }

    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Enviar mensaje a través de wwebjs
    const chatId = to.includes('@c.us') ? to : `${to}@c.us`;
    await client.sendMessage(chatId, body);

    // Crear mensaje en el repositorio
    const messageData: MessageCreate = {
      sessionId,
      fromMe: true,
      from: session.phoneNumber,
      to,
      body,
      type: MessageType.TEXT
    };

    const message = await this.messageRepository.create(messageData);

    // Actualizar conversación
    await this.updateConversation(sessionId, to, body, new Date());

    // Actualizar estado del mensaje
    await this.messageRepository.updateStatus(message.id, MessageStatus.SENT);

    return message;
  }

  async getMessages(sessionId: string, phoneNumber: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    return this.messageRepository.findByConversation(sessionId, phoneNumber, limit, offset);
  }

  async getConversations(sessionId: string, limit: number = 200, offset: number = 0): Promise<Conversation[]> {
    logger.info(`📋 Obteniendo conversaciones: limit=${limit}, offset=${offset}`, { 
      method: 'getConversations', 
      sessionId,
      limit,
      offset
    });
    
    const client = this.clients.get(sessionId);
    if (!client) {
      return [];
    }
    
    try {
      const contacts = await client.getContacts();
      const contactsMap = new Map(contacts.map(contact => [contact.id._serialized, contact]));
      
      const conversations = await Promise.all(Array.from(contactsMap.keys()).map(async (contactId) => {
        const chat = await client.getChatById(contactId);
        if (!chat) return null;
        
        return {
          id: chat.id._serialized,
          sessionId: sessionId,
          phoneNumber: chat.id._serialized,
          contactName: chat.name || 'Sin nombre',
          lastMessage: chat.lastMessage?.body || 'Sin mensaje',
          lastMessageTime: chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp * 1000) : new Date(),
          unreadCount: chat.unreadCount || 0,
          isGroup: chat.isGroup,
          isContact: contactsMap.has(chat.id._serialized), // Determinar si es contacto
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }));
      
      // Filtrar conversaciones nulas y retornar
      return conversations.filter((chat): chat is NonNullable<typeof chat> => chat !== null);
    } catch (error) {
      logger.error(`Error obteniendo conversaciones: ${error}`, { 
        method: 'getConversations', 
        sessionId,
        error 
      });
      return [];
    }
  }

  // 🔄 NUEVO: Obtener solo los contactos de WhatsApp con preview de mensajes
  async getContacts(sessionId: string): Promise<Array<{ 
    id: string; 
    name: string; 
    phoneNumber: string; 
    isContact: boolean;
    lastMessage?: string;
    lastMessageTime?: Date;
    unreadCount: number;
    hasUnreadMessages: boolean;
  }>> {
    logger.info(`👥 Obteniendo contactos con preview para sesión ${sessionId}`, { 
      method: 'getContacts', 
      sessionId
    });
    
    // Verificar que la sesión existe
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      logger.warn(`⚠️ Sesión no encontrada: ${sessionId}`, { 
        method: 'getContacts', 
        sessionId 
      });
      return [];
    }
    
    const client = this.clients.get(sessionId);
    if (!client) {
      logger.warn(`⚠️ Cliente no conectado para obtener contactos`, { 
        method: 'getContacts', 
        sessionId 
      });
      return [];
    }
    
    // Verificar que el cliente esté realmente conectado
    if (!client.pupPage || client.pupPage.isClosed()) {
      logger.warn(`⚠️ Cliente de WhatsApp no está listo (página cerrada)`, { 
        method: 'getContacts', 
        sessionId 
      });
      return [];
    }
    
    try {
      const contactsData = await client.getContacts();
      
      // 🔄 NUEVO: Obtener contactos básicos y enriquecerlos con preview de mensajes
      // 🚀 OPTIMIZACIÓN: Usar datos ya disponibles en el chat sin fetchMessages
      const contactsWithPreview = contactsData
        .filter(contact => contact.isMyContact)
        .map((contact) => {
          const phoneNumber = contact.id._serialized.replace('@c.us', '');
          
          // Usar datos básicos del contacto (más rápido)
          return {
            id: contact.id._serialized,
            name: contact.name || contact.pushname || contact.shortName || phoneNumber,
            phoneNumber: phoneNumber,
            isContact: true,
            // 🔄 Campos de preview básicos (sin mensajes por ahora)
            lastMessage: '', // String vacío en lugar de undefined
            lastMessageTime: new Date(), // Fecha actual en lugar de undefined
            unreadCount: 0, // WhatsApp Web no proporciona esto directamente
            hasUnreadMessages: false
          };
        });
      
      logger.info(`✅ Contactos con preview obtenidos: ${contactsWithPreview.length}`, { 
        method: 'getContacts', 
        sessionId,
        count: contactsWithPreview.length,
        contactsWithMessages: contactsWithPreview.filter(c => c.lastMessage).length,
        contactsWithUnread: contactsWithPreview.filter(c => c.unreadCount > 0).length
      });
      
      return contactsWithPreview;
      
    } catch (error) {
      logger.error(`💥 Error: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
        method: 'getContacts', 
        sessionId,
        error: error instanceof Error ? error.stack : error
      });
      return [];
    }
  }

  // 🔄 NUEVO: Obtener conversaciones de contactos (con prioridad alta)
  async getContactConversations(sessionId: string, limit: number = 100, offset: number = 0): Promise<Conversation[]> {
    logger.info(`👥 Obteniendo conversaciones de contactos: limit=${limit}, offset=${offset}`, { 
      method: 'getContactConversations', 
      sessionId,
      limit,
      offset
    });
    
    // Verificar que la sesión existe
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      logger.warn(`⚠️ Sesión no encontrada: ${sessionId}`, { 
        method: 'getContactConversations', 
        sessionId 
      });
      return [];
    }
    
    const client = this.clients.get(sessionId);
    if (!client) {
      logger.warn(`⚠️ Cliente no conectado para obtener conversaciones de contactos`, { 
        method: 'getContactConversations', 
        sessionId 
      });
      return [];
    }
    
    // Verificar que el cliente esté realmente conectado
    if (!client.pupPage || client.pupPage.isClosed()) {
      logger.warn(`⚠️ Cliente de WhatsApp no está listo (página cerrada)`, { 
        method: 'getContactConversations', 
        sessionId 
      });
      return [];
    }
    
    try {
      // Obtener contactos y crear mapa para verificación rápida
      const contacts = await client.getContacts();
      const contactsMap = new Map(contacts.map(contact => [contact.id._serialized, contact]));
      
      // Obtener chats y filtrar solo los que son contactos guardados
      const conversations = await client.getChats();
      const contactConversations = conversations.filter(chat => 
        !chat.isGroup && 
        !chat.archived && 
        contactsMap.has(chat.id._serialized)
      );
      
      // Aplicar paginación
      const paginatedConversations = contactConversations.slice(offset, offset + limit);
      
      const result = paginatedConversations.map(chat => {
        const contact = contactsMap.get(chat.id._serialized);
        return {
          id: chat.id._serialized,
          sessionId: sessionId,
          phoneNumber: chat.id._serialized.replace('@c.us', ''),
          contactName: contact?.name || contact?.pushname || contact?.shortName || chat.name || chat.id._serialized.replace('@c.us', ''),
          lastMessage: chat.lastMessage?.body || 'Sin mensaje',
          lastMessageTime: chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp * 1000) : new Date(),
          unreadCount: chat.unreadCount || 0,
          isGroup: chat.isGroup,
          isContact: true,
          isMyContact: contact?.isMyContact || false,
          isWAContact: contact?.isWAContact || false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });
      
      logger.info(`✅ Conversaciones de contactos obtenidas: ${result.length}`, { 
        method: 'getContactConversations', 
        sessionId,
        returnedCount: result.length,
        limit,
        offset
      });
      
      return result;
    } catch (error) {
      logger.error(`💥 Error obteniendo conversaciones de contactos: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
        method: 'getContactConversations', 
        sessionId,
        error: error instanceof Error ? error.stack : error
      });
      return [];
    }
  }

  // 🔄 NUEVO: Obtener conversaciones que no son contactos (con prioridad baja)
  async getNonContactConversations(sessionId: string, limit: number = 100, offset: number = 0): Promise<Conversation[]> {
    logger.info(`📱 Obteniendo conversaciones no contactos: limit=${limit}, offset=${offset}`, { 
      method: 'getNonContactConversations', 
      sessionId,
      limit,
      offset
    });
    
    // Verificar que la sesión existe
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      logger.warn(`⚠️ Sesión no encontrada: ${sessionId}`, { 
        method: 'getNonContactConversations', 
        sessionId 
      });
      return [];
    }
    
    const client = this.clients.get(sessionId);
    if (!client) {
      logger.warn(`⚠️ Cliente no conectado para obtener conversaciones no contactos`, { 
        method: 'getNonContactConversations', 
        sessionId 
      });
      return [];
    }
    
    // Verificar que el cliente esté realmente conectado
    if (!client.pupPage || client.pupPage.isClosed()) {
      logger.warn(`⚠️ Cliente de WhatsApp no está listo (página cerrada)`, { 
        method: 'getNonContactConversations', 
        sessionId 
      });
      return [];
    }
    
    try {
      // Obtener contactos y crear mapa para verificación rápida
      const contacts = await client.getContacts();
      const contactsMap = new Map(contacts.map(contact => [contact.id._serialized, contact]));
      
      // Obtener chats y filtrar solo los que NO son contactos guardados
      const conversations = await client.getChats();
      const nonContactConversations = conversations.filter(chat => 
        !chat.isGroup && 
        !chat.archived && 
        !contactsMap.has(chat.id._serialized)
      );
      
      // Aplicar paginación
      const paginatedConversations = nonContactConversations.slice(offset, offset + limit);
      
      const result = paginatedConversations.map(chat => ({
        id: chat.id._serialized,
        sessionId: sessionId,
        phoneNumber: chat.id._serialized.replace('@c.us', ''),
        contactName: chat.name || chat.id._serialized.replace('@c.us', ''),
        lastMessage: chat.lastMessage?.body || 'Sin mensaje',
        lastMessageTime: chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp * 1000) : new Date(),
        unreadCount: chat.unreadCount || 0,
        isGroup: chat.isGroup,
        isContact: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      logger.info(`✅ Conversaciones no contactos obtenidas: ${result.length}`, { 
        method: 'getNonContactConversations', 
        sessionId,
        returnedCount: result.length,
        limit,
        offset
      });
      
      return result;
    } catch (error) {
      logger.error(`💥 Error obteniendo conversaciones no contactos: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
        method: 'getNonContactConversations', 
        sessionId,
        error: error instanceof Error ? error.stack : error
      });
      return [];
    }
  }

  // 🚀 NUEVO: Obtener chats de contactos en lotes (estrategia de carga progresiva)
  async getContactChatsBatch(
    sessionId: string, 
    limit: number = 1000, 
    offset: number = 0
  ): Promise<Array<{
    chatId: string;
    contactId: string;
    contactName: string;
    phoneNumber: string;
    lastMessage?: string;
    lastMessageTime?: Date;
    unreadCount: number;
    hasUnreadMessages: boolean;
    isContact: boolean;
  }>> {
    logger.info(`📱 Obteniendo chats de contactos en lote: limit=${limit}, offset=${offset}`, { 
      method: 'getContactChatsBatch', 
      sessionId,
      limit,
      offset
    });
    
    // Verificar que la sesión existe
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      logger.warn(`⚠️ Sesión no encontrada: ${sessionId}`, { 
        method: 'getContactChatsBatch', 
        sessionId 
      });
      return [];
    }
    
    const client = this.clients.get(sessionId);
    if (!client) {
      logger.warn(`⚠️ Cliente no conectado para obtener chats de contactos`, { 
        method: 'getContactChatsBatch', 
        sessionId 
      });
      return [];
    }
    
    try {
      // 1️⃣ Obtener contactos primero
      const contacts = await client.getContacts();
      const validContacts = contacts.filter(contact => 
        !contact.isGroup && 
        contact.id._serialized.includes('@c.us') &&
        (contact.isMyContact || contact.isWAContact)
      );
      
      logger.info(`👥 Contactos válidos encontrados: ${validContacts.length}`, { 
        method: 'getContactChatsBatch', 
        sessionId,
        totalContacts: validContacts.length
      });
      
      const contactChats: Array<{
        chat: any;
        contact: any;
      }> = [];
      
      const allChats = await client.getChats();
      const contactNumbers = new Set(validContacts.map(c => c.id._serialized));
      
      // Filtrar solo chats que corresponden a contactos
      const relevantChats = allChats.filter(chat => 
        !chat.isGroup && 
        !chat.archived && 
        contactNumbers.has(chat.id._serialized)
      );
      
      // Mapear chats con sus contactos correspondientes
      for (const chat of relevantChats) {
        const contact = validContacts.find(c => c.id._serialized === chat.id._serialized);
        if (contact) {
          contactChats.push({ chat, contact });
        }
      }
      
      logger.info(`💬 Chats de contactos encontrados: ${contactChats.length}`, { 
        method: 'getContactChatsBatch', 
        sessionId,
        totalChats: contactChats.length
      });
      
      // 3️⃣ Aplicar paginación
      const paginatedChats = contactChats.slice(offset, offset + limit);
      
      // 4️⃣ Mapear resultados con información del contacto (SIN cargar mensajes)
      const result = paginatedChats.map(({ chat, contact }) => {
        // ⚠️ IMPORTANTE: NO llamar a chat.fetchMessages() aquí
        // Solo obtener metadatos básicos del chat
        const lastMessage = chat.lastMessage?.body;
        const lastMessageTime = chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp * 1000) : undefined;
        
        const chatData: {
          chatId: string;
          contactId: string;
          contactName: string;
          phoneNumber: string;
          lastMessage?: string;
          lastMessageTime?: Date;
          unreadCount: number;
          hasUnreadMessages: boolean;
          isContact: boolean;
        } = {
          chatId: chat.id._serialized,
          contactId: contact.id._serialized,
          contactName: contact.name || contact.pushname || contact.shortName || chat.name || chat.id._serialized.replace('@c.us', ''),
          phoneNumber: chat.id._serialized.replace('@c.us', ''),
          unreadCount: chat.unreadCount || 0,
          hasUnreadMessages: (chat.unreadCount || 0) > 0,
          isContact: true
        };
        
        if (lastMessage) chatData.lastMessage = lastMessage;
        if (lastMessageTime) chatData.lastMessageTime = lastMessageTime;
        
        return chatData;
      });
      
      logger.info(`✅ Chats de contactos obtenidos en lote: ${result.length}/${contactChats.length}`, { 
        method: 'getContactChatsBatch', 
        sessionId,
        returnedCount: result.length,
        totalAvailable: contactChats.length,
        limit,
        offset
      });
      
      return result;
    } catch (error) {
      logger.error(`💥 Error obteniendo chats de contactos: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
        method: 'getContactChatsBatch', 
        sessionId,
        error: error instanceof Error ? error.stack : error
      });
      return [];
    }
  }

  // 🚀 NUEVO: Obtener chats no contactos en lotes (estrategia de carga progresiva)
  async getNonContactChatsBatch(
    sessionId: string, 
    limit: number = 100, 
    offset: number = 0
  ): Promise<Array<{
    chatId: string;
    contactId: string;
    contactName: string;
    phoneNumber: string;
    lastMessage?: string;
    lastMessageTime?: Date;
    unreadCount: number;
    hasUnreadMessages: boolean;
    isContact: boolean;
  }>> {
    logger.info(`📱 Obteniendo chats no contactos en lote: limit=${limit}, offset=${offset}`, { 
      method: 'getNonContactChatsBatch', 
      sessionId,
      limit,
      offset
    });
    
    // Verificar que la sesión existe
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      logger.warn(`⚠️ Sesión no encontrada: ${sessionId}`, { 
        method: 'getNonContactChatsBatch', 
        sessionId 
      });
      return [];
    }
    
    const client = this.clients.get(sessionId);
    if (!client) {
      logger.warn(`⚠️ Cliente no conectado para obtener chats no contactos`, { 
        method: 'getNonContactChatsBatch', 
        sessionId 
      });
      return [];
    }
    
    try {
      // 1️⃣ Obtener contactos primero
      const contacts = await client.getContacts();
      const validContacts = contacts.filter(contact => 
        !contact.isGroup && 
        contact.id._serialized.includes('@c.us') &&
        (contact.isMyContact || contact.isWAContact)
      );
      
      // 2️⃣ ✅ CORRECTO: Obtener chats no contactos de manera eficiente
      // En lugar de getChats(), usamos una estrategia más inteligente
      
      // Obtener chats recientes (últimos 50) para encontrar no contactos
      // Esto es más eficiente que obtener TODOS los chats
      const recentChats = await client.getChats();
      const recentIndividualChats = recentChats
        .filter(chat => !chat.isGroup && !chat.archived)
        .slice(0, 50); // Solo los 50 más recientes
      
      // 3️⃣ Filtrar chats que NO son contactos
      const nonContactChats = recentIndividualChats.filter(chat => 
        !validContacts.some(contact => contact.id._serialized === chat.id._serialized)
      );
      
      logger.info(`💬 Chats no contactos encontrados: ${nonContactChats.length}`, { 
        method: 'getNonContactChatsBatch', 
        sessionId,
        totalChats: nonContactChats.length,
        strategy: 'recent_chats_only'
      });
      
      // 4️⃣ Aplicar paginación
      const paginatedChats = nonContactChats.slice(offset, offset + limit);
      
      // 5️⃣ Mapear resultados
      const result = paginatedChats.map(chat => {
        const lastMessage = chat.lastMessage?.body;
        const lastMessageTime = chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp * 1000) : undefined;
        
        const chatData: {
          chatId: string;
          contactId: string;
          contactName: string;
          phoneNumber: string;
          lastMessage?: string;
          lastMessageTime?: Date;
          unreadCount: number;
          hasUnreadMessages: boolean;
          isContact: boolean;
        } = {
          chatId: chat.id._serialized,
          contactId: chat.id._serialized,
          contactName: chat.name || chat.id._serialized.replace('@c.us', ''),
          phoneNumber: chat.id._serialized.replace('@c.us', ''),
          unreadCount: chat.unreadCount || 0,
          hasUnreadMessages: (chat.unreadCount || 0) > 0,
          isContact: false
        };
        
        if (lastMessage) chatData.lastMessage = lastMessage;
        if (lastMessageTime) chatData.lastMessageTime = lastMessageTime;
        
        return chatData;
      });
      
      logger.info(`✅ Chats no contactos obtenidos en lote: ${result.length}/${nonContactChats.length}`, { 
        method: 'getNonContactChatsBatch', 
        sessionId,
        returnedCount: result.length,
        totalAvailable: nonContactChats.length,
        limit,
        offset
      });
      
      return result;
    } catch (error) {
      logger.error(`💥 Error obteniendo chats no contactos: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
        method: 'getNonContactChatsBatch', 
        sessionId,
        error: error instanceof Error ? error.stack : error
      });
      return [];
    }
  }

  // 🚀 NUEVO: Obtener mensajes de un chat específico con límite configurable
  async fetchChatMessages(
    sessionId: string, 
    chatId: string, 
    limit: number = 2
  ): Promise<Message[]> {
    console.log(`🔍 [DEBUG] fetchChatMessages iniciado:`, {
      sessionId,
      chatId,
      limit,
      timestamp: new Date().toISOString()
    });
    
    logger.info(`💬 Obteniendo mensajes del chat: limit=${limit}`, { 
      method: 'fetchChatMessages', 
      sessionId,
      chatId,
      limit
    });
    
    const client = this.clients.get(sessionId);
    if (!client) {
      console.log(`❌ [DEBUG] Cliente no encontrado para sessionId: ${sessionId}`);
      console.log(`🔍 [DEBUG] Clientes disponibles:`, Array.from(this.clients.keys()));
      logger.warn(`⚠️ Cliente no conectado para obtener mensajes`, { 
        method: 'fetchChatMessages', 
        sessionId 
      });
      return [];
    }
    
    console.log(`✅ [DEBUG] Cliente encontrado para sessionId: ${sessionId}`);
    console.log(`🔍 [DEBUG] Estado del cliente:`, {
      info: client.info
    });
    
    try {
      // 🔍 Normalizar el chatId para incluir el sufijo @c.us si no lo tiene
      let normalizedChatId = chatId;
      if (!chatId.includes('@')) {
        normalizedChatId = `${chatId}@c.us`;
        console.log(`🔧 [DEBUG] ChatId normalizado: ${chatId} → ${normalizedChatId}`);
        logger.info(`🔧 ChatId normalizado: ${chatId} → ${normalizedChatId}`, { 
          method: 'fetchChatMessages', 
          sessionId,
          originalChatId: chatId,
          normalizedChatId
        });
      } else {
        console.log(`✅ [DEBUG] ChatId ya tiene formato correcto: ${chatId}`);
      }
      
      console.log(`🔍 [DEBUG] Intentando obtener chat con ID: ${normalizedChatId}`);
      
      // 🔍 Obtener chat específico
      const chat = await client.getChatById(normalizedChatId);
      if (!chat) {
        return [];
      }
      
      // 🔍 DEBUG: Verificar mensajes disponibles en el chat
      try {
        const allMessages = await chat.fetchMessages({ limit: 20 });
        console.log(`📋 [DEBUG] Total de mensajes disponibles en el chat: ${allMessages.length}`);
        console.log(`🔍 [DEBUG] Primeros 3 mensajes:`, allMessages.slice(0, 3).map(m => ({
          id: m.id,
          body: m.body?.substring(0, 30) + '...',
          from: m.from,
          timestamp: m.timestamp
        })));
      } catch (messagesError) {
        console.log(`⚠️ [DEBUG] Error obteniendo mensajes del chat:`, messagesError);
      }
      
      logger.info(`✅ Chat encontrado: ${chat.name || chat.id._serialized}`, { 
        method: 'fetchChatMessages', 
        sessionId,
        chatId: normalizedChatId,
        chatName: chat.name,
        isGroup: chat.isGroup
      });
      
      // 📋 Configurar opciones de búsqueda según la documentación de wwebjs
      const searchOptions: any = { 
        limit: Math.min(limit, 100) // Limitar a máximo 100 mensajes por seguridad
      };
      
      // Sin filtro fromMe - siempre traer TODOS los mensajes (enviados y recibidos)
      
      console.log(`🔍 [DEBUG] Opciones de búsqueda configuradas:`, searchOptions);
      logger.info(`🔍 Configurando búsqueda de mensajes con opciones:`, { 
        method: 'fetchChatMessages', 
        sessionId,
        chatId: normalizedChatId,
        searchOptions
      });
      
      console.log(`📨 [DEBUG] Llamando a chat.fetchMessages()...`);
      
      // 📨 Cargar mensajes usando fetchMessages de wwebjs
      const messages = await chat.fetchMessages(searchOptions);
      
      console.log(`📨 [DEBUG] fetchMessages completado:`, {
        mensajesObtenidos: messages.length,
        tipoDeDatos: Array.isArray(messages) ? 'Array' : typeof messages,
        primerMensaje: messages.length > 0 ? {
          id: messages[0].id,
          body: messages[0].body,
          from: messages[0].from,
          timestamp: messages[0].timestamp
        } : null
      });
      
      logger.info(`📨 Mensajes obtenidos del chat: ${messages.length}`, { 
        method: 'fetchChatMessages', 
        sessionId,
        chatId: normalizedChatId,
        messagesCount: messages.length,
        limit,
        actualLimit: messages.length
      });
      
      console.log(`🔄 [DEBUG] Iniciando mapeo de ${messages.length} mensajes...`);
      
      // 🔄 Mapear mensajes de wwebjs a nuestro modelo
      const mappedMessages = messages.map((msg, index) => {
        const mapped = this.mapWwebjsMessageToMessage(msg, sessionId);
        if (index < 3) { // Solo log los primeros 3 para no saturar
          console.log(`📝 [DEBUG] Mensaje ${index + 1} mapeado:`, {
            original: {
              id: msg.id,
              body: msg.body,
              from: msg.from,
              timestamp: msg.timestamp
            },
            mapeado: {
              id: mapped.id,
              body: mapped.body,
              from: mapped.from,
              timestamp: mapped.timestamp
            }
          });
        }
        return mapped;
      });
      
      console.log(`✅ [DEBUG] Mapeo completado: ${mappedMessages.length} mensajes procesados`);
      
      // 📊 Log de estadísticas de mapeo
      logger.info(`✅ Mapeo completado: ${mappedMessages.length} mensajes procesados`, { 
        method: 'fetchChatMessages', 
        sessionId,
        chatId: normalizedChatId,
        originalCount: messages.length,
        mappedCount: mappedMessages.length
      });
      
      console.log(`🎯 [DEBUG] fetchChatMessages completado exitosamente. Retornando ${mappedMessages.length} mensajes`);
      
      return mappedMessages;
      
    } catch (error) {
      console.log(`💥 [DEBUG] Error en fetchChatMessages:`, {
        error: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : 'No stack disponible',
        sessionId,
        chatId,
        normalizedChatId: chatId.includes('@') ? chatId : `${chatId}@c.us`
      });
      
      logger.error(`💥 Error obteniendo mensajes del chat ${chatId}: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
        method: 'fetchChatMessages', 
        sessionId,
        chatId,
        error: error instanceof Error ? error.stack : error
      });
      return [];
    }
  }

  // 🚀 NUEVO: Método avanzado para obtener mensajes con más opciones de búsqueda
  async fetchChatMessagesAdvanced(
    sessionId: string, 
    chatId: string, 
    options: {
      limit?: number;
      includeFromMe?: boolean;
      fromDate?: Date;
      toDate?: Date;
      messageType?: string;
      searchText?: string;
    }
  ): Promise<Message[]> {
    console.log(`🔍 [DEBUG] fetchChatMessagesAdvanced iniciado:`, {
      sessionId,
      chatId,
      options,
      timestamp: new Date().toISOString()
    });
    
    const {
      limit = 50,
      includeFromMe = true,
      fromDate,
      toDate,
      messageType,
      searchText
    } = options;

    console.log(`🔍 [DEBUG] Opciones procesadas:`, {
      limit,
      includeFromMe,
      fromDate: fromDate?.toISOString(),
      toDate: toDate?.toISOString(),
      messageType,
      searchText
    });

    logger.info(`🚀 Obteniendo mensajes avanzados del chat con opciones:`, { 
      method: 'fetchChatMessagesAdvanced', 
      sessionId,
      chatId,
      options
    });
    
    const client = this.clients.get(sessionId);
    if (!client) {
      console.log(`❌ [DEBUG] Cliente no encontrado para sessionId: ${sessionId}`);
      logger.warn(`⚠️ Cliente no conectado para obtener mensajes avanzados`, { 
        method: 'fetchChatMessagesAdvanced', 
        sessionId 
      });
      return [];
    }
    
    console.log(`✅ [DEBUG] Cliente encontrado para sessionId: ${sessionId}`);
    
    try {
      // 🔍 Normalizar el chatId para incluir el sufijo @c.us si no lo tiene
      let normalizedChatId = chatId;
      if (!chatId.includes('@')) {
        normalizedChatId = `${chatId}@c.us`;
        console.log(`🔧 [DEBUG] ChatId normalizado: ${chatId} → ${normalizedChatId}`);
        logger.info(`🔧 ChatId normalizado: ${chatId} → ${normalizedChatId}`, { 
          method: 'fetchChatMessagesAdvanced', 
          sessionId,
          originalChatId: chatId,
          normalizedChatId
        });
      } else {
        console.log(`✅ [DEBUG] ChatId ya tiene formato correcto: ${chatId}`);
      }
      
      console.log(`🔍 [DEBUG] Intentando obtener chat con ID: ${normalizedChatId}`);
      
      // 🔍 Obtener chat específico
      const chat = await client.getChatById(normalizedChatId);
      if (!chat) {
        console.log(`❌ [DEBUG] Chat no encontrado con ID: ${normalizedChatId}`);
        logger.warn(`⚠️ Chat no encontrado: ${normalizedChatId}`, { 
          method: 'fetchChatMessagesAdvanced', 
          sessionId,
          originalChatId: chatId,
          normalizedChatId
        });
        return [];
      }
      
      console.log(`✅ [DEBUG] Chat encontrado exitosamente:`, {
        id: chat.id._serialized,
        name: chat.name,
        isGroup: chat.isGroup
      });
      
      logger.info(`✅ Chat encontrado: ${chat.name || chat.id._serialized}`, { 
        method: 'fetchChatMessagesAdvanced', 
        sessionId,
        chatId: normalizedChatId,
        chatName: chat.name,
        isGroup: chat.isGroup
      });
      
      // 📋 Configurar opciones de búsqueda básicas
      const searchOptions: any = { 
        limit: Math.min(limit, 100) // Limitar a máximo 100 mensajes por seguridad
      };
      
      // Sin filtro fromMe - siempre traer TODOS los mensajes (enviados y recibidos)
      
      console.log(`🔍 [DEBUG] Opciones de búsqueda configuradas:`, searchOptions);
      
      // 📨 Cargar mensajes usando fetchMessages de wwebjs
      console.log(`📨 [DEBUG] Llamando a chat.fetchMessages()...`);
      const messages = await chat.fetchMessages(searchOptions);
      
      console.log(`📨 [DEBUG] fetchMessages completado:`, {
        mensajesObtenidos: messages.length,
        tipoDeDatos: Array.isArray(messages) ? 'Array' : typeof messages
      });
      
      logger.info(`📨 Mensajes base obtenidos: ${messages.length}`, { 
        method: 'fetchChatMessagesAdvanced', 
        sessionId,
        chatId: normalizedChatId,
        baseCount: messages.length
      });
      
      // 🔄 Mapear mensajes de wwebjs a nuestro modelo
      console.log(`🔄 [DEBUG] Iniciando mapeo de ${messages.length} mensajes...`);
      let mappedMessages = messages.map(msg => this.mapWwebjsMessageToMessage(msg, sessionId));
      
      console.log(`✅ [DEBUG] Mapeo base completado: ${mappedMessages.length} mensajes`);
      
      // 🔍 Aplicar filtros adicionales si se especifican
      if (fromDate || toDate || messageType || searchText) {
        console.log(`🔍 [DEBUG] Aplicando filtros adicionales...`);
        
        const filters: {
          fromDate?: Date;
          toDate?: Date;
          messageType?: string;
          searchText?: string;
        } = {};
        
        if (fromDate) filters.fromDate = fromDate;
        if (toDate) filters.toDate = toDate;
        if (messageType) filters.messageType = messageType;
        if (searchText) filters.searchText = searchText;
        
        console.log(`🔍 [DEBUG] Filtros a aplicar:`, filters);
        
        mappedMessages = this.filterMessages(mappedMessages, filters);
        
        console.log(`🔍 [DEBUG] Filtros aplicados, mensajes resultantes: ${mappedMessages.length}`);
        
        logger.info(`🔍 Filtros aplicados, mensajes resultantes: ${mappedMessages.length}`, { 
          method: 'fetchChatMessagesAdvanced', 
          sessionId,
          chatId: normalizedChatId,
          filteredCount: mappedMessages.length,
          filters
        });
      }
      
      console.log(`🎯 [DEBUG] fetchChatMessagesAdvanced completado exitosamente. Retornando ${mappedMessages.length} mensajes`);
      
      return mappedMessages;
      
    } catch (error) {
      console.log(`💥 [DEBUG] Error en fetchChatMessagesAdvanced:`, {
        error: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : 'No stack disponible',
        sessionId,
        chatId,
        normalizedChatId: chatId.includes('@') ? chatId : `${chatId}@c.us`
      });
      
      logger.error(`💥 Error obteniendo mensajes avanzados del chat ${chatId}: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
        method: 'fetchChatMessagesAdvanced', 
        sessionId,
        chatId,
        error: error instanceof Error ? error.stack : error
      });
      return [];
    }
  }

  // 🔍 NUEVO: Método privado para filtrar mensajes según criterios
  private filterMessages(messages: Message[], filters: {
    fromDate?: Date;
    toDate?: Date;
    messageType?: string;
    searchText?: string;
  }): Message[] {
    return messages.filter(message => {
      // 📅 Filtro por fecha desde
      if (filters.fromDate && message.timestamp < filters.fromDate) {
        return false;
      }
      
      // 📅 Filtro por fecha hasta
      if (filters.toDate && message.timestamp > filters.toDate) {
        return false;
      }
      
      // 📝 Filtro por tipo de mensaje
      if (filters.messageType && message.type !== filters.messageType) {
        return false;
      }
      
      // 🔍 Filtro por texto de búsqueda
      if (filters.searchText && !message.body.toLowerCase().includes(filters.searchText.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }

  // 🚀 NUEVO: Cargar más mensajes bajo demanda
  async loadChatMessagesOnDemand(
    sessionId: string, 
    chatId: string, 
    currentLimit: number, 
    additionalLimit: number = 10
  ): Promise<{
    messages: Message[];
    hasMore: boolean;
    totalLoaded: number;
  }> {
    logger.info(`📚 Cargando más mensajes bajo demanda: current=${currentLimit}, additional=${additionalLimit}`, { 
      method: 'loadChatMessagesOnDemand', 
      sessionId,
      chatId,
      currentLimit,
      additionalLimit
    });
    
    const newLimit = currentLimit + additionalLimit;
    const messages = await this.fetchChatMessages(sessionId, chatId, newLimit);
    
    // Determinar si hay más mensajes disponibles
    const hasMore = messages.length === newLimit;
    
    logger.info(`✅ Mensajes cargados bajo demanda: ${messages.length}, hasMore=${hasMore}`, { 
      method: 'loadChatMessagesOnDemand', 
      sessionId,
      chatId,
      totalMessages: messages.length,
      hasMore
    });
    
    return {
      messages,
      hasMore,
      totalLoaded: messages.length
    };
  }

  // 🔧 NUEVO: Mapear mensaje de wwebjs a nuestro modelo
  private mapWwebjsMessageToMessage(wwebjsMsg: any, sessionId: string): Message {
    // 🔍 Mapeo robusto con validaciones para evitar errores
    const from = wwebjsMsg.from ? wwebjsMsg.from.replace('@c.us', '') : '';
    const to = wwebjsMsg.to ? wwebjsMsg.to.replace('@c.us', '') : '';
    
    // 📅 Manejo robusto de timestamp
    let timestamp: Date;
    if (wwebjsMsg.timestamp) {
      // wwebjs usa timestamp en segundos, convertir a milisegundos
      timestamp = new Date(wwebjsMsg.timestamp * 1000);
    } else if (wwebjsMsg.date) {
      // Alternativa: usar la propiedad date si timestamp no está disponible
      timestamp = new Date(wwebjsMsg.date);
    } else {
      timestamp = new Date();
    }
    
    return {
      id: wwebjsMsg.id?._serialized || wwebjsMsg.id || `msg_${Date.now()}_${Math.random()}`,
      sessionId,
      fromMe: wwebjsMsg.fromMe || false,
      from,
      to,
      body: wwebjsMsg.body || wwebjsMsg.text || '',
      type: this.getMessageType(wwebjsMsg.type),
      status: MessageStatus.DELIVERED,
      timestamp
    };
  }

  private async syncConversationsFromWhatsApp(sessionId: string): Promise<void> {
    // 🔒 VERIFICAR SI YA HAY UNA SINCRONIZACIÓN ACTIVA
    if (this.activeSyncs.get(sessionId)) {
      logger.warn(`⚠️ Sincronización ya en progreso para sesión ${sessionId}, encolando...`, { 
        method: 'syncConversationsFromWhatsApp', 
        sessionId,
        activeSyncs: Array.from(this.activeSyncs.entries()),
        queueLength: this.syncQueue.get(sessionId)?.length || 0
      });
      
      // Encolar la sincronización para ejecutarla después
      return new Promise((resolve, reject) => {
        if (!this.syncQueue.has(sessionId)) {
          this.syncQueue.set(sessionId, []);
        }
        this.syncQueue.get(sessionId)!.push(async () => {
          try {
            await this.executeSync(sessionId);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    }
    
    // 🔒 MARCAR SINCRONIZACIÓN COMO ACTIVA
    this.activeSyncs.set(sessionId, true);
    logger.info(`🔒 Bloqueo de sincronización adquirido para sesión ${sessionId}`, { 
      method: 'syncConversationsFromWhatsApp', 
      sessionId 
    });
    
    try {
      // 🚀 PATRÓN READY: Solo ejecutar si el cliente está realmente listo
      const client = this.clients.get(sessionId);
      if (!client || !client.pupPage || client.pupPage.isClosed()) {
        logger.warn(`⚠️ Cliente no está listo para sincronización, omitiendo...`, { 
          method: 'syncConversationsFromWhatsApp', 
          sessionId 
        });
        return;
      }
      
      // Verificar que el contexto de ejecución esté disponible
      try {
        await client.pupPage.evaluate(() => true);
      } catch (contextError) {
        logger.warn(`⚠️ Contexto de ejecución no disponible, omitiendo sincronización...`, { 
          method: 'syncConversationsFromWhatsApp', 
          sessionId,
          error: contextError instanceof Error ? contextError.message : 'Error desconocido'
        });
        return;
      }
      
      // ✅ Cliente está listo, ejecutar sincronización
      await this.executeSync(sessionId);
      
    } finally {
      // 🔒 LIBERAR BLOQUEO Y PROCESAR COLA
      this.activeSyncs.set(sessionId, false);
      this.lastSyncTimes.set(sessionId, new Date());
      logger.info(`🔓 Bloqueo de sincronización liberado para sesión ${sessionId}`, { 
        method: 'syncConversationsFromWhatsApp', 
        sessionId 
      });
      
      // Procesar cola de sincronizaciones pendientes
      this.processSyncQueue(sessionId);
    }
  }
  
  // 🔒 NUEVO: Método privado para ejecutar la sincronización real
  private async executeSync(sessionId: string): Promise<void> {
    return logger.logOperation(
      'executeSync',
      'WhatsAppService.executeSync',
      sessionId,
      async () => {
        const client = this.clients.get(sessionId);
        if (!client) {
          logger.warn(`⚠️ Cliente no conectado, omitiendo sincronización de WhatsApp`, { 
            method: 'executeSync', 
            sessionId 
          });
          return;
        }
        
        // 🚀 PATRÓN READY: Verificación adicional de que el cliente esté listo
        try {
          if (!client.pupPage || client.pupPage.isClosed()) {
            logger.warn(`⚠️ Página de Puppeteer cerrada, omitiendo sincronización`, { 
              method: 'executeSync', 
              sessionId 
            });
            return;
          }
          
          // Verificar que el contexto de ejecución esté disponible
          await client.pupPage.evaluate(() => true);
          
          // Verificar que el cliente de WhatsApp esté realmente conectado
          const isReady = await client.pupPage.evaluate(() => {
            // Verificar si WhatsApp Web está cargado y listo
            try {
              return !!(globalThis as any)?.Store?.Chat?.getModelsArray;
            } catch {
              return false;
            }
          });
          
          if (!isReady) {
            logger.warn(`⚠️ WhatsApp Web no está completamente cargado, omitiendo sincronización`, { 
              method: 'executeSync', 
              sessionId 
            });
            return;
          }
          
        } catch (contextError) {
          logger.warn(`⚠️ Contexto de ejecución no disponible: ${contextError instanceof Error ? contextError.message : 'Error desconocido'}`, { 
            method: 'executeSync', 
            sessionId,
            error: contextError instanceof Error ? contextError.stack : contextError
          });
          return;
        }

        logger.info(`🔄 Ejecutando sincronización de conversaciones desde WhatsApp Web`, { 
          method: 'executeSync', 
          sessionId 
        });
        
        try {
          // ESTRATEGIA SIN TIMEOUT: Obtener todos los chats disponibles
          logger.info(`📱 Obteniendo todos los chats disponibles sin timeout...`, { 
            method: 'executeSync', 
            sessionId 
          });
          
          // Obtener todos los chats sin timeout para asegurar que lleguen todas las conversaciones
          let chats = null;
          let lastError = null;
          const maxRetries = 3; // Aumentar reintentos ya que no hay timeout
          
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              logger.info(`📱 Intento ${attempt}/${maxRetries} de obtener chats (sin timeout)...`, { 
                method: 'executeSync', 
                sessionId,
                attempt,
                maxRetries
              });
              
              // Usar método estándar para obtener chats sin timeout
              chats = await client.getChats();
              
              // Filtrar solo conversaciones individuales y no archivadas
              chats = chats.filter(chat => !chat.isGroup && !chat.archived);
              
              logger.info(`✅ Chats obtenidos exitosamente en intento ${attempt}: ${chats.length} conversaciones`, { 
                method: 'executeSync', 
                sessionId,
                attempt,
                totalChats: chats.length
              });
              
              break; // Salir del bucle si fue exitoso
              
            } catch (error) {
              lastError = error;
              logger.warn(`⚠️ Intento ${attempt} falló: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
                method: 'executeSync', 
                sessionId,
                attempt,
                maxRetries,
                error: error instanceof Error ? error.stack : error
              });
              
              if (attempt < maxRetries) {
                // Espera progresiva entre reintentos
                const waitTime = attempt * 2000; // 2s, 4s, 6s
                logger.info(`⏳ Esperando ${waitTime/1000}s antes del siguiente intento...`, { 
                  method: 'executeSync', 
                  sessionId,
                  waitTimeSeconds: waitTime/1000,
                  attempt
                });
                await new Promise(resolve => setTimeout(resolve, waitTime));
              }
            }
          }
          
                     if (!chats) {
             logger.warn(`⚠️ No se pudieron obtener chats después de ${maxRetries} intentos`, { 
               method: 'syncConversationsFromWhatsApp', 
               sessionId,
               lastError: lastError instanceof Error ? lastError.message : 'Error desconocido'
             });
             return; //  fallar, solo retornar
           }
          
          logger.info(`📱 Chats obtenidos desde WhatsApp Web: ${chats.length}`, { 
            method: 'syncConversationsFromWhatsApp', 
            sessionId,
            totalChats: chats.length,
            chatDetails: chats.slice(0, 10).map(chat => ({
              id: chat.id._serialized,
              name: chat.name || 'Sin nombre',
              hasLastMessage: !!chat.lastMessage,
              lastMessageTime: chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp * 1000).toISOString() : 'N/A',
              unreadCount: chat.unreadCount || 0
            }))
          });

          // Si no hay chats, no hay nada que sincronizar
          if (chats.length === 0) {
            logger.info(`📭 No hay chats disponibles en WhatsApp Web`, { 
              method: 'syncConversationsFromWhatsApp', 
              sessionId 
            });
            return;
          }

          // Filtrar solo conversaciones individuales (no grupos)
          const individualChats = chats.filter(chat => !chat.isGroup);
          logger.info(`👤 Conversaciones individuales filtradas: ${individualChats.length}`, { 
            method: 'syncConversationsFromWhatsApp', 
            sessionId,
            individualChats: individualChats.length,
            groupChats: chats.length - individualChats.length
          });

          // Obtener última conversación sincronizada para sincronización incremental
          const lastSyncedConversation = await this.conversationRepository.findLastSynced(sessionId);
          const lastSyncTime = lastSyncedConversation?.lastMessageTime || new Date(0);
          
          // Verificar si es la primera sincronización o si no hay conversaciones existentes
          const existingConversations = await this.conversationRepository.findBySessionId(sessionId, 1);
          const isFirstSync = !lastSyncedConversation || existingConversations.length === 0;
          
          let newChats;
          if (isFirstSync) {
            // En la primera sincronización, procesar todas las conversaciones
            newChats = individualChats;
            logger.info(`🔄 Primera sincronización detectada, procesando todas las conversaciones: ${newChats.length}`, { 
              method: 'syncConversationsFromWhatsApp', 
              sessionId,
              isFirstSync: true,
              existingCount: existingConversations.length,
              totalChats: individualChats.length
            });
          } else {
            // Filtrar solo conversaciones más recientes que la última sincronización
            newChats = individualChats.filter(chat => {
              const chatLastMessage = chat.lastMessage?.timestamp || new Date(0);
              return chatLastMessage > lastSyncTime;
            });
            
            logger.info(`🆕 Conversaciones nuevas desde última sincronización: ${newChats.length}`, { 
              method: 'syncConversationsFromWhatsApp', 
              sessionId,
              newChats: newChats.length,
              lastSyncTime: lastSyncTime.toISOString(),
              totalAvailable: individualChats.length
            });
          }
          
          // Si no hay conversaciones nuevas y no es la primera sincronización, no hay nada que sincronizar
          if (newChats.length === 0 && !isFirstSync) {
            logger.info(`✅ No hay conversaciones nuevas para sincronizar`, { 
              method: 'syncConversationsFromWhatsApp', 
              sessionId 
            });
            return;
          }

          // Procesar conversaciones en lotes más pequeños para mayor eficiencia
          const batchSize = 5; // Reducir tamaño de lote
          const totalBatches = Math.ceil(newChats.length / batchSize);
        
          logger.info(`📦 Procesando ${newChats.length} conversaciones en ${totalBatches} lotes de ${batchSize}`, { 
            method: 'syncConversationsFromWhatsApp', 
            sessionId,
            totalConversations: newChats.length,
            totalBatches,
            batchSize
          });
          
          for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const startIndex = batchIndex * batchSize;
            const endIndex = Math.min(startIndex + batchSize, newChats.length);
            const batch = newChats.slice(startIndex, endIndex);
            
            logger.logBatchOperation(
              'syncConversationsFromWhatsApp',
              'WhatsAppService.syncConversationsFromWhatsApp',
              sessionId,
              batchIndex,
              totalBatches,
              batchSize,
              endIndex,
              individualChats.length
            );
            
            // Procesar lote actual
            await this.processConversationBatch(sessionId, batch);
            
            // Notificar progreso en tiempo real para cada conversación del lote
            for (let i = 0; i < batch.length; i++) {
              const chat = batch[i];
              const phoneNumber = chat.id._serialized.replace('@c.us', '');
              const conversation = await this.conversationRepository.findByPhoneNumber(sessionId, phoneNumber);
              
              if (conversation) {
                const currentProgress = startIndex + batchIndex * batchSize + i + 1;
                this.notifySyncProgress(sessionId, {
                  current: currentProgress,
                  total: newChats.length,
                  conversation: conversation
                });
                
                logger.debug(`📡 Progreso de sincronización: ${currentProgress}/${newChats.length} - ${phoneNumber}`, { 
                  method: 'syncConversationsFromWhatsApp', 
                  sessionId,
                  currentProgress,
                  total: newChats.length,
                  phoneNumber
                });
              }
            }
            
            // Pausa más corta entre lotes
            if (batchIndex < totalBatches - 1) {
              logger.debug(`⏸️ Pausa entre lotes: 50ms`, { 
                method: 'syncConversationsFromWhatsApp', 
                sessionId,
                batchIndex: batchIndex + 1
              });
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }
          
          logger.info(`✅ Sincronización de conversaciones completada`, { 
            method: 'syncConversationsFromWhatsApp', 
            sessionId,
            totalProcessed: newChats.length
          });
          
          // Notificar que las conversaciones se han sincronizado
          const updatedConversations = await this.conversationRepository.findBySessionId(sessionId);
          this.notifyConversationsSynced(sessionId, updatedConversations);
          
          logger.info(`📡 Notificación de conversaciones sincronizadas enviada: ${updatedConversations.length}`, { 
            method: 'syncConversationsFromWhatsApp', 
            sessionId,
            notifiedCount: updatedConversations.length
          });
          
        } catch (error) {
          logger.error(`💥 Error en sincronización de conversaciones: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
            method: 'syncConversationsFromWhatsApp', 
            sessionId,
            error: error instanceof Error ? error.stack : error
          });
          // No propagar el error para evitar fallos en cascada
        }
      }
    );
  }

  private async processConversationBatch(sessionId: string, chats: any[]): Promise<void> {
    return logger.logOperation(
      'processConversationBatch',
      'WhatsAppService.processConversationBatch',
      sessionId,
      async () => {
        logger.info(`🔧 Procesando lote de ${chats.length} conversaciones`, { 
          method: 'processConversationBatch', 
          sessionId,
          batchSize: chats.length
        });

        let createdCount = 0;
        let updatedCount = 0;
        let errorCount = 0;

        for (let i = 0; i < chats.length; i++) {
          const chat = chats[i];
          const phoneNumber = chat.id._serialized.replace('@c.us', '');
          
          logger.debug(`📱 Procesando conversación ${i + 1}/${chats.length}: ${phoneNumber}`, { 
            method: 'processConversationBatch', 
            sessionId,
            currentIndex: i + 1,
            totalInBatch: chats.length,
            phoneNumber
          });
          
          try {
            // Verificar si la conversación ya existe
            let conversation = await this.conversationRepository.findByPhoneNumber(sessionId, phoneNumber);
            
            if (!conversation) {
              // Crear nueva conversación
              const conversationData: ConversationCreate = {
                sessionId,
                phoneNumber,
                contactName: chat.name || phoneNumber,
                isGroup: false
              };
              
              conversation = await this.conversationRepository.create(conversationData);
              createdCount++;
              
              logger.info(`🆕 Nueva conversación creada: ${phoneNumber}`, { 
                method: 'processConversationBatch', 
                sessionId,
                phoneNumber,
                contactName: chat.name || phoneNumber
              });
              
              // Notificar nueva conversación
              this.notifyNewConversation(conversation);
              logger.debug(`📡 Notificación de nueva conversación enviada: ${phoneNumber}`, { 
                method: 'processConversationBatch', 
                sessionId,
                phoneNumber
              });
            } else {
              updatedCount++;
              logger.debug(`🔄 Conversación existente actualizada: ${phoneNumber}`, { 
                method: 'processConversationBatch', 
                sessionId,
                phoneNumber
              });
            }
            
            // Actualizar conversación existente
            const updateData: any = {
              contactName: chat.name || conversation.contactName,
              unreadCount: chat.unreadCount || 0,
              updatedAt: new Date()
            };
            
            // Solo actualizar lastMessage si existe
            if (chat.lastMessage) {
              updateData.lastMessage = chat.lastMessage.body;
              updateData.lastMessageTime = new Date(chat.lastMessage.timestamp * 1000);
              logger.debug(`💬 Último mensaje actualizado: "${chat.lastMessage.body.substring(0, 50)}..."`, { 
                method: 'processConversationBatch', 
                sessionId,
                phoneNumber
              });
            }
            
            await this.conversationRepository.update(conversation.id, updateData);
            
            // Si hay mensajes no leídos, sincronizar mensajes en background
            if (chat.unreadCount > 0) {
              logger.debug(`📨 Sincronizando mensajes no leídos: ${chat.unreadCount} mensajes`, { 
                method: 'processConversationBatch', 
                sessionId,
                phoneNumber,
                unreadCount: chat.unreadCount
              });
              
              // Sincronizar mensajes sin bloquear
              this.syncMessagesFromChat(sessionId, chat).catch(error => {
                logger.error(`💥 Error sincronizando mensajes para ${phoneNumber}: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
                  method: 'processConversationBatch', 
                  sessionId,
                  phoneNumber,
                  error: error instanceof Error ? error.stack : error
                });
              });
            }
          } catch (error) {
            errorCount++;
            logger.error(`💥 Error procesando conversación ${phoneNumber}: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
              method: 'processConversationBatch', 
              sessionId,
              phoneNumber,
              error: error instanceof Error ? error.stack : error
            });
            // Continuar con la siguiente conversación
          }
        }
        
        logger.info(`✅ Lote procesado: ${createdCount} creadas, ${updatedCount} actualizadas, ${errorCount} errores`, { 
          method: 'processConversationBatch', 
          sessionId,
          createdCount,
          updatedCount,
          errorCount,
          totalProcessed: chats.length
        });
      }
    );
  }

  private async syncMessagesFromChat(sessionId: string, chat: any): Promise<void> {
    try {
      // Agregar timeout de 5 segundos para evitar bloqueos
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Message sync timeout')), 5000);
      });
      
      // Obtener mensajes recientes del chat con timeout
      const messages = await Promise.race([
        chat.fetchMessages({ limit: 50 }),
        timeoutPromise
      ]);
      console.log(`Syncing ${messages.length} messages from chat ${chat.id._serialized}`);
      
      for (const msg of messages) {
        const messageId = msg.id._serialized;
        
        // Verificar si el mensaje ya existe
        const existingMessage = await this.messageRepository.findById(messageId);
        
        if (!existingMessage) {
          const messageData: MessageCreate = {
            sessionId,
            fromMe: msg.fromMe,
            from: msg.from.replace('@c.us', ''),
            to: msg.to.replace('@c.us', ''),
            body: msg.body,
            type: this.getMessageType(msg.type)
          };

          const message = await this.messageRepository.create(messageData);
          console.log(`Synced message ${messageId}`);
          
          // Notificar nuevo mensaje
          this.notifyMessageReceived(message);
        }
      }
    } catch (error) {
      console.error('Error syncing messages from chat:', error);
    }
  }

  private getMessageType(wwebjsType: string): MessageType {
    switch (wwebjsType) {
      case 'chat':
        return MessageType.TEXT;
      case 'image':
        return MessageType.IMAGE;
      case 'document':
        return MessageType.DOCUMENT;
      case 'audio':
        return MessageType.AUDIO;
      case 'video':
        return MessageType.VIDEO;
      default:
        return MessageType.TEXT;
    }
  }

  // Método comentado - no se usa actualmente
  // private async createDemoConversations(sessionId: string): Promise<void> {
  //   // Implementación comentada para evitar errores de TypeScript
  // }

  async getConversation(sessionId: string, phoneNumber: string): Promise<Conversation | null> {
    return this.conversationRepository.findByPhoneNumber(sessionId, phoneNumber);
  }

  // Event handlers
  onMessageReceived(callback: (message: Message) => void): void {
    this.messageCallbacks.push(callback);
  }

  onSessionStatusChanged(callback: (session: WhatsAppSession) => void): void {
    this.sessionStatusCallbacks.push(callback);
  }

  onConnectionStatusChanged(callback: (sessionId: string, isConnected: boolean) => void): void {
    this.connectionStatusCallbacks.push(callback);
  }

  onNewConversation(callback: (conversation: Conversation) => void): void {
    this.newConversationCallbacks.push(callback);
  }

  onConversationsSynced(callback: (sessionId: string, conversations: Conversation[]) => void): void {
    this.conversationsSyncedCallbacks.push(callback);
  }

  onSyncProgress(callback: (sessionId: string, progress: { current: number, total: number, conversation: Conversation }) => void): void {
    this.syncProgressCallbacks.push(callback);
  }

  // Métodos privados
  private async handleIncomingMessage(sessionId: string, msg: WwebjsMessage): Promise<void> {
    try {
      logger.info(`📨 Mensaje entrante recibido para sesión ${sessionId}`, { 
        method: 'handleIncomingMessage', 
        sessionId,
        from: msg.from,
        body: msg.body?.substring(0, 50) + '...'
      });

      const session = await this.sessionRepository.findById(sessionId);
      if (!session) {
        logger.warn(`Sesión no encontrada para mensaje entrante: ${sessionId}`, { 
          method: 'handleIncomingMessage', 
          sessionId 
        });
        return;
      }

      // Crear mensaje en el repositorio
      const messageData: MessageCreate = {
        sessionId,
        fromMe: false,
        from: msg.from,
        to: session.phoneNumber,
        body: msg.body,
        type: MessageType.TEXT
      };

      const message = await this.messageRepository.create(messageData);
      logger.info(`✅ Mensaje guardado en repositorio: ${message.id}`, { 
        method: 'handleIncomingMessage', 
        sessionId,
        messageId: message.id
      });

      // Actualizar conversación
      await this.updateConversation(sessionId, msg.from, msg.body, new Date());

      // Notificar mensaje recibido
      logger.info(`📡 Notificando mensaje recibido a través de WebSocket`, { 
        method: 'handleIncomingMessage', 
        sessionId,
        messageId: message.id,
        callbackCount: this.messageCallbacks.length
      });
      
      this.notifyMessageReceived(message);
      
    } catch (error) {
      logger.error(`💥 Error procesando mensaje entrante: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
        method: 'handleIncomingMessage', 
        sessionId,
        error: error instanceof Error ? error.stack : error
      });
    }
  }

  private async updateConversation(sessionId: string, phoneNumber: string, message: string, timestamp: Date): Promise<void> {
    let conversation = await this.conversationRepository.findByPhoneNumber(sessionId, phoneNumber);
    
    if (!conversation) {
      // Crear nueva conversación
      const conversationData: ConversationCreate = {
        sessionId,
        phoneNumber,
        isGroup: false
      };
      conversation = await this.conversationRepository.create(conversationData);
    }

    // Actualizar última mensaje y timestamp
    await this.conversationRepository.updateLastMessage(conversation.id, message, timestamp);

    // Actualizar contador de mensajes no leídos si no es del usuario
    if (phoneNumber !== sessionId) {
      const unreadCount = await this.messageRepository.getUnreadCount(sessionId, phoneNumber);
      await this.conversationRepository.updateUnreadCount(conversation.id, unreadCount);
    }
  }

  private async notifyMessageReceived(message: Message): Promise<void> {
    logger.info(`🔔 Ejecutando ${this.messageCallbacks.length} callbacks para mensaje recibido`, { 
      method: 'notifyMessageReceived', 
      sessionId: message.sessionId,
      messageId: message.id,
      callbackCount: this.messageCallbacks.length
    });
    
    // Ejecutar callbacks locales (WebSocket)
    this.messageCallbacks.forEach((callback, index) => {
      try {
        logger.debug(`📞 Ejecutando callback ${index + 1}`, { 
          method: 'notifyMessageReceived', 
          sessionId: message.sessionId,
          messageId: message.id,
          callbackIndex: index
        });
        callback(message);
      } catch (error) {
        logger.error(`💥 Error en callback ${index + 1}: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
          method: 'notifyMessageReceived', 
          sessionId: message.sessionId,
          messageId: message.id,
          callbackIndex: index,
          error: error instanceof Error ? error.stack : error
        });
      }
    });

    // Notificar a Laravel a través de RabbitMQ
    try {
      await this.notifyLaravelViaRabbitMQ(message);
    } catch (error) {
      logger.error(`💥 Error notificando a Laravel: ${error instanceof Error ? error.message : 'Error desconocido'}`, {
        method: 'notifyMessageReceived',
        sessionId: message.sessionId,
        messageId: message.id,
        error: error instanceof Error ? error.stack : error
      });
    }
  }

  private async notifyLaravelViaRabbitMQ(message: Message): Promise<void> {
    try {
      // TODO: Implementar notificación RabbitMQ si es necesario
      logger.info(`📡 Notificación RabbitMQ deshabilitada (archivo eliminado)`, {
        method: 'notifyLaravelViaRabbitMQ',
        sessionId: message.sessionId,
        messageId: message.id
      });
    } catch (error) {
      logger.error(`💥 Error en notificación RabbitMQ: ${error instanceof Error ? error.message : 'Error desconocido'}`, {
        method: 'notifyLaravelViaRabbitMQ',
        sessionId: message.sessionId,
        messageId: message.id,
        error: error instanceof Error ? error.stack : error
      });
      throw error;
    }
  }

  private notifySessionStatusChanged(session: WhatsAppSession): void {
    this.sessionStatusCallbacks.forEach(callback => callback(session));
  }

  private notifyConnectionStatusChanged(sessionId: string, isConnected: boolean): void {
    this.connectionStatusCallbacks.forEach(callback => callback(sessionId, isConnected));
  }

  private notifyNewConversation(conversation: Conversation): void {
    // Notificar nueva conversación a través de WebSocket
    this.newConversationCallbacks.forEach(callback => {
      callback(conversation);
    });
  }

  private notifyConversationsSynced(sessionId: string, conversations: Conversation[]): void {
    // Notificar conversaciones sincronizadas a través de WebSocket
    this.conversationsSyncedCallbacks.forEach(callback => {
      callback(sessionId, conversations);
    });
  }

  private notifySyncProgress(sessionId: string, progress: { current: number, total: number, conversation: Conversation }): void {
    // Notificar progreso de sincronización a través de WebSocket
    this.syncProgressCallbacks.forEach(callback => {
      callback(sessionId, progress);
    });
  }

  // Iniciar sincronización automática para una sesión
  startAutoSync(sessionId: string): void {
    const client = this.clients.get(sessionId);
    if (!client) {
      console.log('Client not connected, cannot start auto sync');
      return;
    }

    console.log(`Starting auto sync for session ${sessionId}`);
    
    // Sincronizar cada 30 segundos
    const syncInterval = setInterval(async () => {
      try {
        await this.syncConversationsFromWhatsApp(sessionId);
      } catch (error) {
        console.error('Auto sync error:', error);
        // Si hay error, detener la sincronización
        clearInterval(syncInterval);
      }
    }, 30000);

    // Guardar el intervalo para poder detenerlo después
    this.syncIntervals.set(sessionId, syncInterval);
  }

  // Detener sincronización automática
  stopAutoSync(sessionId: string): void {
    const interval = this.syncIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(sessionId);
      console.log(`Stopped auto sync for session ${sessionId}`);
    }
  }

  // Método para forzar sincronización manual
  async forceSync(sessionId: string): Promise<void> {
    console.log(`Forcing manual sync for session ${sessionId}`);
    await this.syncConversationsFromWhatsApp(sessionId);
  }

  // Método para forzar sincronización completa (ignorar incremental)
  async forceFullSync(sessionId: string): Promise<void> {
    logger.info(`🔄 Forzando sincronización completa para sesión ${sessionId}`, { 
      method: 'forceFullSync', 
      sessionId 
    });
    
    const client = this.clients.get(sessionId);
    if (!client) {
      throw new Error('Session not connected');
    }
    
    try {
      // Obtener todos los chats sin timeout
      logger.info(`📱 Obteniendo todos los chats para sincronización completa...`, { 
        method: 'forceFullSync', 
        sessionId 
      });
      
      const chats = await client.getChats();
      
      // Filtrar solo conversaciones individuales y no archivadas
      const individualChats = chats.filter(chat => !chat.isGroup && !chat.archived);
      
      logger.info(`📱 Total de conversaciones individuales encontradas: ${individualChats.length}`, { 
        method: 'forceFullSync', 
        sessionId,
        totalChats: chats.length,
        individualChats: individualChats.length
      });
      
      // Procesar todas las conversaciones
      await this.processConversationBatch(sessionId, individualChats);
      
      // Notificar que todas las conversaciones se han sincronizado
      const updatedConversations = await this.conversationRepository.findBySessionId(sessionId);
      this.notifyConversationsSynced(sessionId, updatedConversations);
      
      logger.info(`✅ Sincronización completa completada: ${individualChats.length} conversaciones`, { 
        method: 'forceFullSync', 
        sessionId,
        totalProcessed: individualChats.length
      });
      
    } catch (error) {
      logger.error(`💥 Error en sincronización completa: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
        method: 'forceFullSync', 
        sessionId,
        error: error instanceof Error ? error.stack : error
      });
      throw error;
    }
  }

  // Método para obtener conversaciones en tiempo real
  async getConversationsRealtime(sessionId: string, limit: number = 200, offset: number = 0): Promise<Conversation[]> {
    // Forzar sincronización antes de devolver
    await this.forceSync(sessionId);
    return this.conversationRepository.findBySessionId(sessionId, limit, offset);
  }

  // Método para verificar si hay conversaciones reales disponibles
  async hasRealConversations(sessionId: string): Promise<boolean> {
    const client = this.clients.get(sessionId);
    if (!client) {
      return false;
    }

    try {
      const chats = await client.getChats();
      const individualChats = chats.filter(chat => !chat.isGroup);
      return individualChats.length > 0;
    } catch (error) {
      logger.error(`💥 Error verificando conversaciones reales: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
        method: 'hasRealConversations', 
        sessionId,
        error: error instanceof Error ? error.stack : error
      });
      return false;
    }
  }

  // Método alternativo para sincronización rápida (sin timeout largo)
  async quickSyncConversations(sessionId: string): Promise<void> {
    const client = this.clients.get(sessionId);
    if (!client) {
      logger.warn(`⚠️ Cliente no conectado para sincronización rápida`, { 
        method: 'quickSyncConversations', 
        sessionId 
      });
      return;
    }

    try {
      logger.info(`🚀 Iniciando sincronización rápida de conversaciones`, { 
        method: 'quickSyncConversations', 
        sessionId 
      });

      // Usar timeout muy corto para evitar bloqueos
      const quickTimeout = 5000; // 5 segundos máximo
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Quick sync timeout after ${quickTimeout/1000} seconds`)), quickTimeout);
      });

      const chats = await Promise.race([
        client.getChats(),
        timeoutPromise
      ]);

      if (chats.length === 0) {
        logger.info(`📭 No hay chats para sincronización rápida`, { 
          method: 'quickSyncConversations', 
          sessionId 
        });
        return;
      }

      // Solo procesar las primeras 20 conversaciones para sincronización rápida
      const individualChats = chats.filter(chat => !chat.isGroup).slice(0, 20);
      
      logger.info(`📱 Procesando ${individualChats.length} conversaciones en sincronización rápida`, { 
        method: 'quickSyncConversations', 
        sessionId,
        totalChats: chats.length,
        individualChats: individualChats.length
      });

      // Procesar en lotes pequeños para mayor velocidad
      const batchSize = 3;
      for (let i = 0; i < individualChats.length; i += batchSize) {
        const batch = individualChats.slice(i, i + batchSize);
        await this.processConversationBatch(sessionId, batch);
        
        // Pausa mínima entre lotes
        if (i + batchSize < individualChats.length) {
          await new Promise(resolve => setTimeout(resolve, 25));
        }
      }

      logger.info(`✅ Sincronización rápida completada: ${individualChats.length} conversaciones`, { 
        method: 'quickSyncConversations', 
        sessionId,
        processedCount: individualChats.length
      });

    } catch (error) {
      logger.warn(`⚠️ Sincronización rápida falló (no crítico): ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
        method: 'quickSyncConversations', 
        sessionId,
        error: error instanceof Error ? error.stack : error
      });
      // No propagar error para evitar fallos en cascada
    }
  }

  // Método para obtener conversaciones no leídas cuando el cliente esté listo
  private async getUnreadConversations(client: Client, sessionId: string): Promise<void> {
    try {
      logger.info(`🚀 Cliente WhatsApp listo, obteniendo conversaciones no leídas...`, { 
        method: 'getUnreadConversations', 
        sessionId 
      });

      const allChats = await client.getChats();
      logger.info(`📱 Total de chats obtenidos: ${allChats.length}`, { 
        method: 'getUnreadConversations', 
        sessionId,
        totalChats: allChats.length
      });

      // Filtrar solo conversaciones individuales (no grupos)
      const individualChats = allChats.filter(chat => !chat.isGroup);
      logger.info(`👤 Conversaciones individuales: ${individualChats.length}`, { 
        method: 'getUnreadConversations', 
        sessionId,
        individualChats: individualChats.length,
        groupChats: allChats.length - individualChats.length
      });

      // Procesar todas las conversaciones inmediatamente
      await this.processConversationBatch(sessionId, individualChats);
      
      logger.info(`✅ Conversaciones procesadas exitosamente: ${individualChats.length}`, { 
        method: 'getUnreadConversations', 
        sessionId,
        processedCount: individualChats.length
      });

      // Notificar que las conversaciones se han sincronizado
      const updatedConversations = await this.conversationRepository.findBySessionId(sessionId);
      this.notifyConversationsSynced(sessionId, updatedConversations);
      
      logger.info(`📡 Notificación de conversaciones sincronizadas enviada: ${updatedConversations.length}`, { 
        method: 'getUnreadConversations', 
        sessionId,
        notifiedCount: updatedConversations.length
      });

    } catch (error) {
      logger.error(`💥 Error obteniendo conversaciones no leídas: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
        method: 'getUnreadConversations', 
        sessionId,
        error: error instanceof Error ? error.stack : error
      });
    }
  }

  // Método para sincronización progresiva (por lotes)
  async progressiveSync(sessionId: string, batchSize: number = 10): Promise<{
    totalConversations: number;
    processedConversations: number;
    isComplete: boolean;
  }> {
    const client = this.clients.get(sessionId);
    if (!client) {
      throw new Error('Session not connected');
    }

    try {
      console.log(`Starting progressive sync with batch size ${batchSize}`);
      
      // Obtener total de chats
      const chats = await client.getChats();
      const individualChats = chats.filter(chat => !chat.isGroup);
      const totalConversations = individualChats.length;
      
      console.log(`Found ${totalConversations} individual conversations to sync`);
      
      // Procesar solo el primer lote
      const firstBatch = individualChats.slice(0, batchSize);
      await this.processConversationBatch(sessionId, firstBatch);
      
      const processedConversations = Math.min(batchSize, totalConversations);
      const isComplete = processedConversations >= totalConversations;
      
      console.log(`Progressive sync: processed ${processedConversations}/${totalConversations} conversations`);
      
      return {
        totalConversations,
        processedConversations,
        isComplete
      };
    } catch (error) {
      console.error('Error in progressive sync:', error);
      throw error;
    }
  }

  // Método para continuar sincronización progresiva desde un offset
  async continueProgressiveSync(sessionId: string, offset: number, batchSize: number = 10): Promise<{
    totalConversations: number;
    processedConversations: number;
    isComplete: boolean;
  }> {
    const client = this.clients.get(sessionId);
    if (!client) {
      throw new Error('Session not connected');
    }

    try {
      const chats = await client.getChats();
      const individualChats = chats.filter(chat => !chat.isGroup);
      const totalConversations = individualChats.length;
      
      if (offset >= totalConversations) {
        return {
          totalConversations,
          processedConversations: totalConversations,
          isComplete: true
        };
      }
      
      const batch = individualChats.slice(offset, offset + batchSize);
      await this.processConversationBatch(sessionId, batch);
      
      const processedConversations = Math.min(offset + batchSize, totalConversations);
      const isComplete = processedConversations >= totalConversations;
      
      console.log(`Progressive sync continued: processed ${processedConversations}/${totalConversations} conversations`);
      
      return {
        totalConversations,
        processedConversations,
        isComplete
      };
    } catch (error) {
      console.error('Error continuing progressive sync:', error);
      throw error;
    }
  }

  // Métodos comentados - no se usan actualmente
  // private extractContactName(chatId: string): string {
  //   // Implementación comentada para evitar errores de TypeScript
  // }

  // private async processConversationsFromData(sessionId: string, conversations: any[]): Promise<void> {
  //   // Implementación comentada para evitar errores de TypeScript
  // }
  
  // 🔒 NUEVO: Procesar cola de sincronizaciones pendientes
  private async processSyncQueue(sessionId: string): Promise<void> {
    const queue = this.syncQueue.get(sessionId);
    if (!queue || queue.length === 0) return;
    
    logger.info(`🔄 Procesando cola de sincronización para sesión ${sessionId}: ${queue.length} pendientes`, { 
      method: 'processSyncQueue', 
      sessionId,
      pendingCount: queue.length
    });
    
    // Procesar todas las sincronizaciones pendientes
    while (queue.length > 0) {
      const syncTask = queue.shift();
      if (syncTask) {
        try {
          await syncTask();
        } catch (error) {
          logger.error(`💥 Error en sincronización encolada: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
            method: 'processSyncQueue', 
            sessionId,
            error: error instanceof Error ? error.stack : error
          });
        }
      }
    }
    
    logger.info(`✅ Cola de sincronización procesada para sesión ${sessionId}`, { 
      method: 'processSyncQueue', 
      sessionId 
    });
  }
  
  // 🔒 NUEVO: Verificar estado de sincronización
  isSyncActive(sessionId: string): boolean {
    return this.activeSyncs.get(sessionId) || false;
  }
  
  // 🔒 NUEVO: Obtener estadísticas de sincronización
  getSyncStats(sessionId: string): {
    isActive: boolean;
    queueLength: number;
    lastSyncTime: Date | undefined;
  } {
    return {
      isActive: this.activeSyncs.get(sessionId) || false,
      queueLength: this.syncQueue.get(sessionId)?.length || 0,
      lastSyncTime: this.lastSyncTimes.get(sessionId)
    };
  }

  // 🔄 NUEVO: Método para obtener preview específico de un contacto
  async getContactPreview(sessionId: string, contactId: string): Promise<{
    lastMessage?: string;
    lastMessageTime?: Date;
    unreadCount: number;
    hasUnreadMessages: boolean;
  }> {
    try {
      // Buscar la conversación por el número de teléfono (contactId)
      const conversation = await this.conversationRepository.findByPhoneNumber(sessionId, contactId);
      if (!conversation) {
        return {
          unreadCount: 0,
          hasUnreadMessages: false
        };
      }

      const result: {
        lastMessage?: string;
        lastMessageTime?: Date;
        unreadCount: number;
        hasUnreadMessages: boolean;
      } = {
        unreadCount: conversation.unreadCount,
        hasUnreadMessages: conversation.unreadCount > 0
      };

      if (conversation.lastMessage) {
        result.lastMessage = conversation.lastMessage;
      }
      if (conversation.lastMessageTime) {
        result.lastMessageTime = conversation.lastMessageTime;
      }

      return result;
    } catch (error) {
      logger.error(`Error getting contact preview: ${error}`);
      return {
        unreadCount: 0,
        hasUnreadMessages: false
      };
    }
  }

  // 🔄 NUEVO: Método para obtener previews de múltiples contactos de manera eficiente
  async getContactsPreviews(sessionId: string, contactIds: string[]): Promise<Map<string, {
    lastMessage?: string;
    lastMessageTime?: Date;
    unreadCount: number;
    hasUnreadMessages: boolean;
  }>> {
    const previews = new Map();
    
    try {
      for (const contactId of contactIds) {
        const preview = await this.getContactPreview(sessionId, contactId);
        previews.set(contactId, preview);
      }
    } catch (error) {
      logger.error(`Error getting contacts previews: ${error}`);
    }

    return previews;
  }

  // 🔧 Método para obtener la ruta correcta del ejecutable de Puppeteer según el sistema operativo
  private getPuppeteerExecutablePath(): string {
    const os = require('os');
    const platform = os.platform();
    
    if (platform === 'win32') {
      // En Windows, usar la ruta por defecto de Puppeteer (bundled Chromium)
      return '';
    } else if (platform === 'linux') {
      // En Linux, usar la ruta por defecto o chromium-browser
      return '/usr/bin/chromium-browser';
    } else if (platform === 'darwin') {
      // En macOS, usar la ruta por defecto
      return '';
    } else {
      // Para otros sistemas, usar la ruta por defecto
      return '';
    }
  }

  // 🔧 Método para limpiar sesiones anteriores y evitar conflictos
  private async cleanupPreviousSession(clientId: string): Promise<void> {
    try {
      const sessionPath = `./sessions/${clientId}`;
      const fs = require('fs');
      const path = require('path');
      
      if (fs.existsSync(sessionPath)) {
        // Intentar eliminar archivos de debug que pueden estar bloqueados
        const debugLogPath = path.join(sessionPath, 'session-' + clientId, 'Default', 'chrome_debug.log');
        if (fs.existsSync(debugLogPath)) {
          try {
            fs.unlinkSync(debugLogPath);
          } catch (error) {
            // Si no se puede eliminar, continuar
            console.log(`No se pudo eliminar ${debugLogPath}: ${error}`);
          }
        }
      }
    } catch (error) {
      console.log(`Error durante limpieza de sesión: ${error}`);
    }
  }
}
