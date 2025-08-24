import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import dotenv from 'dotenv';

// Importar servicios y repositorios
import { InMemoryWhatsAppSessionRepository } from './infrastructure/repositories/InMemoryWhatsAppSessionRepository';
import { InMemoryMessageRepository } from './infrastructure/repositories/InMemoryMessageRepository';
import { InMemoryConversationRepository } from './infrastructure/repositories/InMemoryConversationRepository';
import { WhatsAppService } from './infrastructure/services/WhatsAppService';
import { WebSocketService } from './infrastructure/services/WebSocketService';

// Importar casos de uso
import { CreateWhatsAppSessionUseCase } from './application/use-cases/CreateWhatsAppSessionUseCase';
import { ConnectWhatsAppSessionUseCase } from './application/use-cases/ConnectWhatsAppSessionUseCase';
import { SendMessageUseCase } from './application/use-cases/SendMessageUseCase';
import { GetConversationsUseCase } from './application/use-cases/GetConversationsUseCase';

// Importar controladores y rutas
import { WhatsAppController } from './infrastructure/controllers/WhatsAppController';
import { WhatsAppRoutes } from './infrastructure/routes/WhatsAppRoutes';

// Cargar variables de entorno
dotenv.config();

class WhatsAppServer {
  private app: express.Application;
  private server: any;
  private port: number;

  constructor() {
    this.port = parseInt(process.env.PORT || '3000', 10);
    this.app = express();
    this.setupMiddleware();
    this.setupServices();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Configuración de seguridad
    this.app.use(helmet());
    
    // Configuración de CORS
    const corsOptions = {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Permitir requests sin origin (como aplicaciones móviles o Postman)
        if (!origin) {
          return callback(null, true);
        }
        
        // Lista de orígenes permitidos
        const allowedOrigins = [
          'http://localhost:8080',           // Vue dev server
          'http://localhost:3000',           // Backend (por si acaso)
          'http://127.0.0.1:8080',          // Vue dev server (alternativo)
          'http://127.0.0.1:3000',          // Backend (alternativo)
          process.env.FRONTEND_URL           // Variable de entorno
        ].filter(Boolean); // Remover valores undefined
        
        // Verificar si el origin está permitido
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.log(`CORS blocked origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      optionsSuccessStatus: 200
    };
    
    this.app.use(cors(corsOptions));
    
    // Manejar preflight requests de CORS
    this.app.options('*', cors(corsOptions));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // máximo 100 requests por ventana
      message: 'Too many requests from this IP, please try again later.'
    });
    this.app.use('/api/', limiter);

    // Parsing de JSON
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging de requests
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
    
    // Health check endpoint (sin CORS para debugging)
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        cors: {
          allowedOrigins: [
            'http://localhost:8080',
            'http://localhost:3000',
            'http://127.0.0.1:8080',
            'http://127.0.0.1:3000'
          ]
        }
      });
    });
  }

  private setupServices(): void {
    // Crear instancias de repositorios
    const sessionRepository = new InMemoryWhatsAppSessionRepository();
    const messageRepository = new InMemoryMessageRepository();
    const conversationRepository = new InMemoryConversationRepository();

    // Crear servicio de WhatsApp
    const whatsAppService = new WhatsAppService(
      sessionRepository,
      messageRepository,
      conversationRepository
    );

    // Crear casos de uso
    const createSessionUseCase = new CreateWhatsAppSessionUseCase(whatsAppService);
    const connectSessionUseCase = new ConnectWhatsAppSessionUseCase(whatsAppService);
    const sendMessageUseCase = new SendMessageUseCase(whatsAppService);
    const getConversationsUseCase = new GetConversationsUseCase(whatsAppService);

    // Crear controlador
    const whatsAppController = new WhatsAppController(
      createSessionUseCase,
      connectSessionUseCase,
      sendMessageUseCase,
      getConversationsUseCase,
      whatsAppService
    );

    // Crear rutas
    const whatsAppRoutes = new WhatsAppRoutes(whatsAppController);

    // Registrar rutas
    this.app.use('/api/whatsapp', whatsAppRoutes.getRouter());

    // Crear servidor HTTP
    this.server = createServer(this.app);

    // Inicializar WebSocket
    new WebSocketService(this.server, whatsAppService);

    // Ruta de health check
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'WhatsApp Service',
        version: '1.0.0'
      });
    });

    // Ruta raíz
    this.app.get('/', (req, res) => {
      res.status(200).json({
        message: 'WhatsApp Service API',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          whatsapp: '/api/whatsapp'
        }
      });
    });
  }

  private setupRoutes(): void {
    // Middleware para manejar rutas no encontradas
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl
      });
    });
  }

  private setupErrorHandling(): void {
    // Middleware para manejo de errores
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Error:', error);
      
      res.status(error.status || 500).json({
        error: error.message || 'Internal Server Error',
        timestamp: new Date().toISOString()
      });
    });
  }

  public start(): void {
    this.server.listen(this.port, () => {
      console.log(`🚀 WhatsApp Service iniciado en puerto ${this.port}`);
      console.log(`📱 API disponible en: http://localhost:${this.port}/api/whatsapp`);
      console.log(`🔌 WebSocket disponible en: http://localhost:${this.port}`);
      console.log(`🏥 Health check: http://localhost:${this.port}/health`);
    });
  }

  public stop(): void {
    if (this.server) {
      this.server.close(() => {
        console.log('🛑 WhatsApp Service detenido');
      });
    }
  }
}

// Crear y iniciar el servidor
const server = new WhatsAppServer();

// Manejo de señales para cierre graceful
process.on('SIGINT', () => {
  console.log('\n🔄 Recibida señal SIGINT, cerrando servidor...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🔄 Recibida señal SIGTERM, cerrando servidor...');
  server.stop();
  process.exit(0);
});

// Iniciar servidor
server.start();
