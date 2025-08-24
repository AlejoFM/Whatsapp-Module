export interface WhatsAppSession {
  id: string;
  clientId: string;
  phoneNumber?: string;
  qrCode?: string;
  isConnected: boolean;
  isAuthenticated: boolean;
  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class SessionModel implements WhatsAppSession {
  id: string;
  clientId: string;
  phoneNumber?: string;
  qrCode?: string;
  isConnected: boolean;
  isAuthenticated: boolean;
  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: Partial<WhatsAppSession>) {
    this.id = data.id || '';
    this.clientId = data.clientId || '';
    this.phoneNumber = data.phoneNumber;
    this.qrCode = data.qrCode;
    this.isConnected = data.isConnected || false;
    this.isAuthenticated = data.isAuthenticated || false;
    this.lastSeen = data.lastSeen ? new Date(data.lastSeen) : undefined;
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
  }

  // Métodos de negocio
  get isActive(): boolean {
    return this.isConnected && this.isAuthenticated;
  }

  get needsQR(): boolean {
    return !this.isAuthenticated && !this.qrCode;
  }

  get statusText(): string {
    if (this.isAuthenticated && this.isConnected) {
      return 'Conectado';
    } else if (this.isAuthenticated && !this.isConnected) {
      return 'Desconectado';
    } else if (this.qrCode) {
      return 'Esperando QR';
    } else {
      return 'Inicializando';
    }
  }

  get statusColor(): string {
    if (this.isAuthenticated && this.isConnected) {
      return 'text-green-600';
    } else if (this.isAuthenticated && !this.isConnected) {
      return 'text-red-600';
    } else if (this.qrCode) {
      return 'text-yellow-600';
    } else {
      return 'text-gray-600';
    }
  }

  get displayName(): string {
    return this.phoneNumber || this.clientId || 'Sesión sin nombre';
  }

  get timeSinceLastSeen(): string {
    if (!this.lastSeen) return 'Nunca';
    
    const now = new Date();
    const diffInMinutes = (now.getTime() - this.lastSeen.getTime()) / (1000 * 60);

    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`; // 24 horas
    return `${Math.floor(diffInMinutes / 1440)}d`;
  }

  // Métodos de actualización
  updateConnectionStatus(isConnected: boolean, isAuthenticated: boolean): void {
    this.isConnected = isConnected;
    this.isAuthenticated = isAuthenticated;
    this.updatedAt = new Date();
    
    if (isConnected && isAuthenticated) {
      this.lastSeen = new Date();
    }
  }

  updatePhoneNumber(phoneNumber: string): void {
    this.phoneNumber = phoneNumber;
    this.updatedAt = new Date();
  }

  setQRCode(qrCode: string): void {
    this.qrCode = qrCode;
    this.updatedAt = new Date();
  }

  clearQRCode(): void {
    this.qrCode = undefined;
    this.updatedAt = new Date();
  }

  updateLastSeen(): void {
    this.lastSeen = new Date();
    this.updatedAt = new Date();
  }

  // Validación
  isValid(): boolean {
    return !!(this.id && this.clientId);
  }

  canConnect(): boolean {
    return this.isValid() && !this.isConnected;
  }

  canDisconnect(): boolean {
    return this.isValid() && this.isConnected;
  }

  // Serialización
  toJSON(): WhatsAppSession {
    return {
      id: this.id,
      clientId: this.clientId,
      phoneNumber: this.phoneNumber,
      qrCode: this.qrCode,
      isConnected: this.isConnected,
      isAuthenticated: this.isAuthenticated,
      lastSeen: this.lastSeen,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Factory methods
  static fromData(data: any): SessionModel {
    return new SessionModel(data);
  }

  static createNew(clientId: string): SessionModel {
    return new SessionModel({
      clientId,
      isConnected: false,
      isAuthenticated: false
    });
  }
}
