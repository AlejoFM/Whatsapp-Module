export interface Message {
  id: string;
  sessionId: string;
  fromMe: boolean;
  from: string;
  to: string;
  body: string;
  type: MessageType;
  status: MessageStatus;
  timestamp: Date;
  metadata?: MessageMetadata;
  isRead?: boolean;
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO'
}

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}

export interface MessageMetadata {
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number; // para audio/video
  thumbnail?: string;
}

export class MessageModel implements Message {
  id: string;
  sessionId: string;
  fromMe: boolean;
  from: string;
  to: string;
  body: string;
  type: MessageType;
  status: MessageStatus;
  timestamp: Date;
  metadata?: MessageMetadata;
  isRead?: boolean;

  constructor(data: Partial<Message>) {
    this.id = data.id || '';
    this.sessionId = data.sessionId || '';
    this.fromMe = data.fromMe || false;
    this.from = data.from || '';
    this.to = data.to || '';
    this.body = data.body || '';
    this.type = data.type || MessageType.TEXT;
    this.status = data.status || MessageStatus.SENT;
    this.timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
    this.metadata = data.metadata;
    this.isRead = data.isRead || false;
  }

  // Métodos de negocio
  get isIncoming(): boolean {
    return !this.fromMe;
  }

  get isOutgoing(): boolean {
    return this.fromMe;
  }

  get isMedia(): boolean {
    return this.type !== MessageType.TEXT;
  }

  get displayTime(): string {
    return this.timestamp.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  get displayDate(): string {
    const now = new Date();
    const diffInHours = (now.getTime() - this.timestamp.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return this.timestamp.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return this.timestamp.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  }

  get statusIcon(): string {
    switch (this.status) {
      case MessageStatus.SENT:
        return '✓';
      case MessageStatus.DELIVERED:
        return '✓✓';
      case MessageStatus.READ:
        return '✓✓';
      case MessageStatus.FAILED:
        return '✗';
      default:
        return '';
    }
  }

  get statusColor(): string {
    switch (this.status) {
      case MessageStatus.SENT:
        return 'text-gray-400';
      case MessageStatus.DELIVERED:
        return 'text-blue-400';
      case MessageStatus.READ:
        return 'text-green-400';
      case MessageStatus.FAILED:
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  }

  // Métodos de actualización
  updateStatus(status: MessageStatus): void {
    this.status = status;
  }

  markAsRead(): void {
    if (this.status !== MessageStatus.READ) {
      this.status = MessageStatus.READ;
    }
  }

  // Validación
  isValid(): boolean {
    return !!(
      this.sessionId &&
      this.from &&
      this.to &&
      this.body &&
      this.type
    );
  }

  // Serialización
  toJSON(): Message {
    return {
      id: this.id,
      sessionId: this.sessionId,
      fromMe: this.fromMe,
      from: this.from,
      to: this.to,
      body: this.body,
      type: this.type,
      status: this.status,
      timestamp: this.timestamp,
      metadata: this.metadata,
      isRead: this.isRead
    };
  }

  // Factory methods
  static fromData(data: Partial<Message>): MessageModel {
    if (!data) {
      throw new Error('Message data cannot be null or undefined');
    }
    return new MessageModel(data);
  }

  static createTextMessage(
    sessionId: string, 
    from: string, 
    to: string, 
    body: string, 
    fromMe: boolean = false
  ): MessageModel {
    return new MessageModel({
      sessionId,
      from,
      to,
      body,
      fromMe,
      type: MessageType.TEXT,
      status: fromMe ? MessageStatus.SENT : MessageStatus.DELIVERED
    });
  }

  static createMediaMessage(
    sessionId: string,
    from: string,
    to: string,
    body: string,
    type: MessageType,
    metadata?: MessageMetadata,
    fromMe: boolean = false
  ): MessageModel {
    return new MessageModel({
      sessionId,
      from,
      to,
      body,
      type,
      metadata,
      fromMe,
      status: fromMe ? MessageStatus.SENT : MessageStatus.DELIVERED
    });
  }
}
