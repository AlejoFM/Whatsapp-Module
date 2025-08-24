# WhatsApp Manager - Kiteprop Challenge

Un sistema completo de gestión de WhatsApp que permite manejar múltiples sesiones simultáneamente, con arquitectura limpia, DDD y principios SOLID.

## 🚀 Características

### Backend (Node.js + TypeScript)
- **Arquitectura Limpia + DDD**: Implementación de Clean Architecture con Domain-Driven Design
- **Integración con wwebjs**: Manejo completo de sesiones de WhatsApp
- **WebSocket en tiempo real**: Comunicación bidireccional para mensajes y estados
- **API REST**: Endpoints para gestión de sesiones, mensajes y conversaciones
- **Manejo de QR**: Generación automática de códigos QR para autenticación
- **Múltiples sesiones**: Soporte para operar con varias cuentas simultáneamente

### Frontend (Vue.js 3 + TypeScript)
- **Interfaz moderna**: Diseño responsive con Tailwind CSS
- **Gestión de sesiones**: Crear, conectar y desconectar sesiones
- **Chat en tiempo real**: Envío y recepción de mensajes instantáneos
- **Vista de conversaciones**: Lista de chats con búsqueda y filtrado
- **Componentes reutilizables**: Arquitectura modular y escalable

## 🏗️ Arquitectura

### Backend - Clean Architecture + DDD

```
src/
├── domain/                 # Capa de dominio
│   ├── entities/          # Entidades de negocio
│   ├── repositories/      # Interfaces de repositorios
│   └── services/          # Servicios de dominio
├── application/           # Capa de aplicación
│   └── use-cases/        # Casos de uso
├── infrastructure/        # Capa de infraestructura
│   ├── repositories/     # Implementaciones de repositorios
│   ├── services/         # Implementaciones de servicios
│   ├── controllers/      # Controladores HTTP
│   └── routes/           # Definición de rutas
└── shared/               # Código compartido
    └── infrastructure/   # Utilidades de infraestructura
```

### Frontend - Vue.js 3 + Composition API

```
src/
├── components/           # Componentes reutilizables
├── views/               # Vistas principales
├── store/               # Estado global (Vuex)
├── services/            # Servicios de API y WebSocket
└── router/              # Configuración de rutas
```

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js** + **TypeScript**
- **Express.js** - Framework web
- **wwebjs** - Librería de WhatsApp
- **Socket.IO** - WebSocket en tiempo real
- **qrcode** - Generación de códigos QR
- **Clean Architecture** + **DDD** + **SOLID**

### Frontend
- **Vue.js 3** + **TypeScript**
- **Vuex 4** - Gestión de estado
- **Vue Router 4** - Enrutamiento
- **Tailwind CSS** - Framework de estilos
- **Socket.IO Client** - Cliente WebSocket
- **Axios** - Cliente HTTP

## 📋 Requisitos Previos

- Node.js >= 18.0.0
- npm o yarn
- Navegador moderno con soporte para ES6+

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd kiteprop-challenge
```

### 2. Configurar Backend

```bash
cd node-whatsapp-service

# Instalar dependencias
npm install

# Crear archivo de entorno
cp env.example .env

# Editar variables de entorno
# PORT=3000
# FRONTEND_URL=http://localhost:8080
# NODE_ENV=development

# Iniciar en modo desarrollo
npm run dev

# O construir y ejecutar en producción
npm run build
npm start
```

### 3. Configurar Frontend

```bash
cd vue-whatsapp-frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run serve

# O construir para producción
npm run build
```

## 🔧 Configuración del Entorno

### Variables de Entorno Backend (.env)

```env
# Configuración del servidor
PORT=3000
NODE_ENV=development

# Configuración del frontend
FRONTEND_URL=http://localhost:8080

# Configuración de WhatsApp
WHATSAPP_SESSION_PATH=./sessions

# Configuración de seguridad
CORS_ORIGIN=http://localhost:8080

# Configuración de rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Variables de Entorno Frontend (.env)

```env
VUE_APP_API_URL=http://localhost:3000/api
VUE_APP_SOCKET_URL=http://localhost:3000
```

## 📱 Uso del Sistema

### 1. Crear Nueva Sesión

1. En la vista principal, completar el formulario con:
   - **ID del Cliente**: Identificador único para la sesión
   - **Número de Teléfono** (opcional): Número asociado a la cuenta

2. Hacer clic en "Crear Sesión"

### 2. Conectar Sesión

1. Hacer clic en "Conectar" en la sesión deseada
2. Se generará un código QR
3. Escanear el QR con WhatsApp en el dispositivo móvil:
   - Abrir WhatsApp
   - Ir a Configuración > Dispositivos vinculados
   - Escanear el código QR

### 3. Gestionar Conversaciones

1. Una vez conectada la sesión, hacer clic en "Ver Conversaciones"
2. Se mostrará la lista de conversaciones existentes
3. Seleccionar una conversación para chatear

### 4. Enviar y Recibir Mensajes

1. En la vista de chat, escribir el mensaje en el campo de texto
2. Hacer clic en "Enviar"
3. Los mensajes se sincronizan en tiempo real entre dispositivos

## 🔌 API Endpoints

### Sesiones

- `POST /api/whatsapp/sessions` - Crear nueva sesión
- `GET /api/whatsapp/sessions` - Obtener todas las sesiones
- `GET /api/whatsapp/sessions/:sessionId` - Obtener estado de sesión
- `POST /api/whatsapp/sessions/:sessionId/connect` - Conectar sesión
- `POST /api/whatsapp/sessions/:sessionId/disconnect` - Desconectar sesión

### Mensajes

- `POST /api/whatsapp/sessions/:sessionId/messages` - Enviar mensaje
- `GET /api/whatsapp/sessions/:sessionId/messages/:phoneNumber` - Obtener mensajes

### Conversaciones

- `GET /api/whatsapp/sessions/:sessionId/conversations` - Obtener conversaciones
- `GET /api/whatsapp/sessions/:sessionId/conversations/:phoneNumber` - Obtener conversación específica

## 🔌 WebSocket Events

### Eventos del Cliente

- `join-session` - Unirse a una sala de sesión
- `leave-session` - Salir de una sala de sesión

### Eventos del Servidor

- `message-received` - Nuevo mensaje recibido
- `session-status-changed` - Cambio de estado de sesión
- `connection-status-changed` - Cambio de estado de conexión

## 🧪 Pruebas

### Backend

```bash
cd node-whatsapp-service

# Ejecutar tests
npm test

# Ejecutar tests en modo watch
npm run test:watch
```

### Frontend

```bash
cd vue-whatsapp-frontend

# Ejecutar tests unitarios
npm run test:unit
```

## 📦 Estructura de Archivos

```
kiteprop-challenge/
├── node-whatsapp-service/          # Backend Node.js
│   ├── src/
│   │   ├── domain/                # Entidades y lógica de negocio
│   │   ├── application/           # Casos de uso
│   │   ├── infrastructure/        # Implementaciones técnicas
│   │   └── shared/                # Código compartido
│   ├── package.json
│   └── tsconfig.json
├── vue-whatsapp-frontend/          # Frontend Vue.js
│   ├── src/
│   │   ├── components/            # Componentes reutilizables
│   │   ├── views/                 # Vistas principales
│   │   ├── store/                 # Estado global
│   │   ├── services/              # Servicios de API
│   │   └── router/                # Configuración de rutas
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## 🚀 Despliegue

### Backend (Producción)

```bash
cd node-whatsapp-service

# Construir proyecto
npm run build

# Iniciar en producción
npm run start:prod
```

### Frontend (Producción)

```bash
cd vue-whatsapp-frontend

# Construir proyecto
npm run build

# Los archivos se generan en /dist
# Servir con nginx, Apache o cualquier servidor web
```

## 🔒 Seguridad

- **CORS configurado** para control de orígenes
- **Rate limiting** para prevenir abuso de API
- **Helmet** para headers de seguridad HTTP
- **Validación de entrada** en todos los endpoints
- **Manejo de errores** centralizado y seguro

## 📈 Escalabilidad

### Backend
- **Arquitectura modular** para fácil extensión
- **Repositorios abstractos** para cambiar base de datos
- **Eventos desacoplados** para procesamiento asíncrono
- **Rate limiting** configurable por endpoint

### Frontend
- **Componentes reutilizables** para consistencia
- **Estado global centralizado** para gestión eficiente
- **Lazy loading** para optimización de rendimiento
- **Responsive design** para múltiples dispositivos

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

Para soporte técnico o preguntas sobre el proyecto:

- Crear un issue en GitHub
- Contactar al equipo de desarrollo
- Revisar la documentación de la API

## 🔮 Roadmap

### Próximas Funcionalidades
- [ ] Soporte para grupos de WhatsApp
- [ ] Envío de archivos multimedia
- [ ] Integración con bases de datos persistentes
- [ ] Sistema de notificaciones push
- [ ] Dashboard de analytics
- [ ] API para integración con Laravel
- [ ] Sistema de webhooks
- [ ] Autenticación JWT
- [ ] Logs y auditoría
- [ ] Tests de integración

---

**Desarrollado con ❤️ para el Kiteprop Challenge**
