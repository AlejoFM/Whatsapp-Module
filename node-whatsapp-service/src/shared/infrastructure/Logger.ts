export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogContext {
  sessionId?: string;
  method?: string;
  operation?: string;
  duration?: number;
  [key: string]: any;
}

export class Logger {
  private static instance: Logger;
  private isDevelopment = process.env.NODE_ENV === 'development';

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const sessionInfo = context?.sessionId ? `[Session: ${context.sessionId}]` : '';
    const methodInfo = context?.method ? `[${context.method}]` : '';
    const operationInfo = context?.operation ? `[${context.operation}]` : '';
    const durationInfo = context?.duration ? `[${context.duration}ms]` : '';
    
    const contextStr = [sessionInfo, methodInfo, operationInfo, durationInfo]
      .filter(Boolean)
      .join(' ');
    
    return `${timestamp} [${level}] ${contextStr} ${message}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    const formattedMessage = this.formatMessage(level, message, context);
    
    switch (level) {
      case LogLevel.DEBUG:
        if (this.isDevelopment) {
          console.log(`🔍 ${formattedMessage}`);
        }
        break;
      case LogLevel.INFO:
        console.log(`ℹ️  ${formattedMessage}`);
        break;
      case LogLevel.WARN:
        console.warn(`⚠️  ${formattedMessage}`);
        break;
      case LogLevel.ERROR:
        console.error(`❌ ${formattedMessage}`);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context);
  }

  // Método para logging de operaciones con duración
  async logOperation<T>(
    operation: string,
    method: string,
    sessionId: string,
    operationFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const context: LogContext = { operation, method, sessionId };
    
    try {
      this.info(`🚀 Iniciando operación`, context);
      const result = await operationFn();
      const duration = Date.now() - startTime;
      
      this.info(`✅ Operación completada exitosamente`, { ...context, duration });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.error(`💥 Operación falló: ${error instanceof Error ? error.message : 'Error desconocido'}`, { 
        ...context, 
        duration,
        error: error instanceof Error ? error.stack : error
      });
      throw error;
    }
  }

  // Método para logging de operaciones en lotes
  logBatchOperation(
    operation: string,
    method: string,
    sessionId: string,
    batchIndex: number,
    totalBatches: number,
    batchSize: number,
    processedItems: number,
    totalItems: number
  ): void {
    const progress = ((batchIndex + 1) / totalBatches * 100).toFixed(1);
    const context: LogContext = { 
      operation, 
      method, 
      sessionId,
      batchIndex: batchIndex + 1,
      totalBatches,
      batchSize,
      processedItems,
      totalItems,
      progress: `${progress}%`
    };
    
    this.info(`📦 Procesando lote ${batchIndex + 1}/${totalBatches} (${progress}% completado)`, context);
  }

  // Método para logging de sincronización
  logSyncProgress(
    operation: string,
    sessionId: string,
    current: number,
    total: number,
    itemType: string = 'elementos'
  ): void {
    const progress = total > 0 ? ((current / total) * 100).toFixed(1) : '0.0';
    const context: LogContext = { 
      operation, 
      method: 'sync', 
      sessionId,
      current,
      total,
      progress: `${progress}%`
    };
    
    this.info(`🔄 Sincronizando ${itemType}: ${current}/${total} (${progress}% completado)`, context);
  }
}

export const logger = Logger.getInstance();
