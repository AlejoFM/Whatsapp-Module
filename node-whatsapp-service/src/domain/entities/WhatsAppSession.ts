export interface WhatsAppSession {
  id: string;
  clientId: string;
  phoneNumber: string;
  isConnected: boolean;
  isAuthenticated: boolean;
  qrCode?: string;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhatsAppSessionCreate {
  clientId: string;
  phoneNumber?: string;
}

export interface WhatsAppSessionUpdate {
  isConnected?: boolean;
  isAuthenticated?: boolean;
  qrCode?: string;
  phoneNumber?: string;
  lastSeen?: Date;
}
