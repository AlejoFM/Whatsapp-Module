export interface Message {
  id: string;
  sessionId: string;
  fromMe: boolean;
  from: string;
  to: string;
  body: string;
  timestamp: Date;
  type: MessageType;
  status: MessageStatus;
  metadata?: MessageMetadata;
}

export interface MessageCreate {
  sessionId: string;
  fromMe: boolean;
  from: string;
  to: string;
  body: string;
  type: MessageType;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  quotedMessageId?: string;
  mentions?: string[];
  replyTo?: string;
  mediaUrl?: string;
  mediaType?: string;
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document',
  LOCATION = 'location',
  CONTACT = 'contact'
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}
