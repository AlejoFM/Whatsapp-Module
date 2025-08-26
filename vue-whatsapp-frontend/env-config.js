// Configuración de entorno para el frontend
window.ENV_CONFIG = {
  // API Configuration
  API_URL: process.env.VUE_APP_API_URL || 'http://localhost:8000/api',
  
  // WebSocket Configuration
  SOCKET_URL: process.env.VUE_APP_SOCKET_URL || 'http://localhost:3000',
  
  // Pusher Configuration (for Laravel Echo Server)
  PUSHER_APP_KEY: process.env.VUE_APP_PUSHER_APP_KEY || 'pusher-key-123',
  PUSHER_APP_CLUSTER: process.env.VUE_APP_PUSHER_APP_CLUSTER || 'us1',
  PUSHER_HOST: process.env.VUE_APP_PUSHER_HOST || 'localhost',
  PUSHER_PORT: process.env.VUE_APP_PUSHER_PORT || 6001,

  // Reverb Configuration
  REVERB_APP_KEY: process.env.VUE_APP_REVERB_APP_KEY || 'my-app-key',
  REVERB_HOST: process.env.VUE_APP_REVERB_HOST || 'localhost',
  REVERB_PORT: process.env.VUE_APP_REVERB_PORT || 6001
}
