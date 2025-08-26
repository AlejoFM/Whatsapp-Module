# WhatsApp Manager - Kiteprop Challenge

Un sistema completo de gestión de WhatsApp optimizado que permite manejar múltiples sesiones simultáneamente, con arquitectura de microservicios, comunicación en tiempo real y interfaz moderna.

## 🚀 Características

### 🏗️ Arquitectura de Microservicios
- **Node.js WhatsApp Service**: Servicio principal con Clean Architecture + DDD
- **Laravel API Gateway**: API intermediaria para proxy y validación
- **Vue.js Frontend**: Interfaz de usuario moderna y reactiva
- **Socket.IO**: Comunicación en tiempo real entre todos los servicios

### 🔧 Backend Optimizado (Node.js + TypeScript)
- **Clean Architecture + DDD**: Implementación de patrones empresariales
- **wwebjs Integrado**: Manejo completo de sesiones de WhatsApp Web
- **WebSocket en tiempo real**: Sincronización instantánea de mensajes y estados  
- **API REST optimizada**: Endpoints con timeout y manejo de errores robusto
- **QR automático**: Generación y renovación automática de códigos QR
- **Múltiples sesiones**: Soporte concurrente para varias cuentas WhatsApp
- **Gestión de contactos**: Carga inteligente y filtrado de contactos
- **Sistema de mensajes**: Envío/recepción con persistencia y sincronización

### 🎨 Frontend Moderno (Vue.js 3 + TypeScript)
- **Interfaz responsiva**: Diseño adaptable con Tailwind CSS
- **Gestión avanzada de sesiones**: Crear, conectar, desconectar con notificaciones
- **Chat en tiempo real**: Mensajería instantánea con burbujas modernas
- **Vista inteligente de conversaciones**: Lista con filtros, búsqueda y paginación
- **Componentes optimizados**: Arquitectura modular con scroll virtual
- **Notificaciones automáticas**: Confirmación de conexión y estados
- **Modal QR interactivo**: Códigos QR con cierre automático tras éxito

### 🚀 Laravel API Gateway
- **Proxy inteligente**: Enrutamiento y validación de peticiones
- **Timeout optimizado**: Manejo de peticiones largas (60s timeout)
- **Middleware de seguridad**: Validación, rate limiting y CORS
- **Manejo de errores**: Respuestas consistentes y logging

## 🏗️ Arquitectura del Sistema

### 🔄 Flujo de Comunicación
```
[Vue.js Frontend] ←→ [Laravel API] ←→ [Node.js Service] ←→ [WhatsApp Web]
                    ↕                    ↕
                 [Socket.IO] ←→ [Socket.IO Server]
```

### 📁 Estructura de Microservicios

```
kiteprop-challenge/
├── node-whatsapp-service/     # 🚀 Servicio principal WhatsApp
│   ├── src/
│   │   ├── domain/           # 🏛️ Capa de dominio (DDD)
│   │   │   ├── entities/     # Entidades de negocio
│   │   │   ├── repositories/ # Interfaces de repositorios
│   │   │   └── services/     # Servicios de dominio
│   │   ├── infrastructure/   # 🔧 Capa de infraestructura
│   │   │   ├── repositories/ # Implementaciones de datos
│   │   │   ├── services/     # WhatsApp Service optimizado
│   │   │   ├── controllers/  # Controladores HTTP
│   │   │   └── websocket/    # Manejo de Socket.IO
│   │   └── shared/          # 📦 Código compartido
│   └── sessions/            # 💾 Datos de sesiones WhatsApp
├── laravel-whatsapp-api/      # 🛡️ API Gateway
│   ├── app/Http/Controllers/ # Controladores de proxy
│   ├── config/              # Configuración Laravel
│   └── routes/              # Definición de rutas API
└── vue-whatsapp-frontend/     # 🎨 Interfaz de usuario
    ├── src/
    │   ├── components/       # Componentes optimizados
    │   │   ├── message/     # Componentes de mensajería
    │   │   └── conversation/ # Componentes de chat
    │   ├── views/           # Vistas principales
    │   ├── store/           # Estado global (Vuex)
    │   ├── services/        # Servicios API + WebSocket
    │   └── viewmodels/      # Lógica de presentación
```

### 🔧 Componentes Técnicos

#### Node.js WhatsApp Service (Puerto 3000)
- **wwebjs**: Integración directa con WhatsApp Web
- **Socket.IO Server**: Comunicación en tiempo real
- **Express API**: Endpoints REST optimizados
- **Session Management**: Manejo persistente de sesiones

#### Laravel API Gateway (Puerto 8000)  
- **HTTP Proxy**: Enrutamiento a Node.js con timeout de 60s
- **Validation**: Middleware de validación de datos
- **Error Handling**: Manejo unificado de errores
- **CORS**: Configuración de políticas de origen

#### Vue.js Frontend (Puerto 8080)
- **Composition API**: Lógica reactiva moderna
- **Socket.IO Client**: Cliente WebSocket optimizado
- **Tailwind CSS**: Diseño responsive
- **Vuex Store**: Estado centralizado y reactivo

## 🛠️ Stack Tecnológico

### 🚀 Node.js WhatsApp Service
- **Node.js 18+** + **TypeScript** - Runtime y tipado
- **Express.js** - Framework web minimalista
- **wwebjs** - Integración nativa con WhatsApp Web
- **Socket.IO** - WebSocket bidireccional en tiempo real
- **qrcode** - Generación de códigos QR dinámicos
- **Clean Architecture** + **DDD** + **SOLID** - Patrones de diseño

### 🛡️ Laravel API Gateway
- **Laravel 10** + **PHP 8.1+** - Framework de API
- **Guzzle HTTP** - Cliente HTTP con timeout configurado
- **Spatie Packages** - Utilities y middleware

### 🎨 Vue.js Frontend
- **Vue.js 3** + **TypeScript** - Framework reactivo
- **Composition API** - API moderna de Vue
- **Vuex 4** - Gestión de estado centralizada
- **Vue Router 4** - SPA routing
- **Tailwind CSS 3** - Framework de utilidades CSS
- **Socket.IO Client** - Cliente WebSocket reactivo
- **Axios** - Cliente HTTP con interceptores

## 📋 Requisitos del Sistema

- **Node.js >= 18.0.0** (recomendado 18.x LTS)
- **PHP >= 8.1** (para Laravel API Gateway)
- **Composer** (gestor de dependencias PHP)
- **npm o yarn** (gestor de dependencias Node.js)
- **Navegador moderno** con soporte para ES2020+
- **Chrome/Chromium** (recomendado para wwebjs)

## 🚀 Instalación y Configuración

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd kiteprop-challenge
```

### 2. Configurar Node.js WhatsApp Service (Puerto 3000)

```bash
cd node-whatsapp-service

# Instalar dependencias
npm install

# Crear archivo de entorno
cp .env.example .env

# Configurar variables de entorno
# PORT=3000
# FRONTEND_URL=http://localhost:8080
# NODE_ENV=development

# Iniciar en modo desarrollo con hot reload
npm run dev

# O construir y ejecutar en producción
npm run build
npm start
```

### 3. Configurar Laravel API Gateway (Puerto 8000)

```bash
cd laravel-whatsapp-api

# Instalar dependencias PHP
composer install

# Crear archivo de entorno
cp .env.example .env

# Generar clave de aplicación
php artisan key:generate

# Configurar variables de entorno
# NODE_WHATSAPP_SERVICE_URL=http://localhost:3000

# Iniciar servidor de desarrollo
php artisan serve
```

### 4. Configurar Vue.js Frontend (Puerto 8080)

```bash
cd vue-whatsapp-frontend

# Instalar dependencias
npm install

# Crear archivo de entorno
cp .env.example .env

# Configurar variables de entorno
# VUE_APP_API_URL=http://localhost:8000/api
# VUE_APP_SOCKET_URL=http://localhost:3000

# Iniciar servidor de desarrollo con hot reload
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

## 📱 Guía de Uso del Sistema

### 🔥 Orden de Inicio de Servicios

1. **Iniciar Node.js Service** (Puerto 3000) - Servicio principal
2. **Iniciar Laravel API** (Puerto 8000) - Gateway intermedio  
3. **Iniciar Vue.js Frontend** (Puerto 8080) - Interfaz de usuario

### 🆕 1. Crear Nueva Sesión

1. Acceder a `http://localhost:8080`
2. En la vista principal, completar el formulario:
   - **ID del Cliente**: Identificador único (ej: `cliente-1`)
   - **Número de Teléfono** (opcional): Para referencia
3. Hacer clic en **"Crear Sesión"**
4. La sesión aparecerá en "Sesiones Desconectadas"

### 📱 2. Conectar Sesión WhatsApp

1. Hacer clic en **"Conectar"** en la sesión deseada
2. Se abrirá un modal con código QR generado automáticamente
3. **En tu teléfono móvil:**
   - Abrir WhatsApp
   - Ir a **Configuración > Dispositivos vinculados**
   - Tocar **"Vincular un dispositivo"**
   - Escanear el código QR del modal
4. **El modal se cerrará automáticamente** tras conexión exitosa
5. Aparecerá una **notificación verde** de confirmación
6. La sesión se moverá a **"Sesiones Conectadas"**

### 💬 3. Gestionar Conversaciones

1. En una sesión conectada, hacer clic en **"Ver Conversaciones"**
2. Se cargará la vista de conversaciones con **4 pestañas:**
   - **👥 Contactos**: Personas en tu agenda
   - **💬 Chats de Contactos**: Conversaciones activas
   - **💬 Conversaciones de Contactos**: Historial detallado
   - **📱 Otros Chats**: Números no agregados
3. Usar **"📱 Cargar Contactos"** para sincronizar
4. **Hacer clic en cualquier contacto/conversación** para abrir el chat

### ✉️ 4. Chatear en Tiempo Real

1. En la vista de chat:
   - **Campo de texto** en la parte inferior
   - **Historial de mensajes** con burbujas diferenciadas
   - **Scroll automático** a mensajes nuevos
2. Escribir mensaje y presionar **Enter** o **"Enviar"**
3. **Los mensajes se sincronizan en tiempo real** entre:
   - Tu WhatsApp móvil
   - La interfaz web del sistema
   - Otros dispositivos vinculados

### 🔄 5. Funciones Avanzadas

- **Reconexión automática**: Si se pierde conexión, se reintenta automáticamente
- **Notificaciones en tiempo real**: Estados de sesión y nuevos mensajes
- **Scroll virtual**: Optimizado para conversaciones largas
- **Búsqueda de mensajes**: Filtros y búsqueda en tiempo real
- **Responsive design**: Funciona en móvil, tablet y desktop

## 🔌 API Endpoints Optimizados

### 🔐 Rutas de Sesiones (Laravel Gateway → Node.js)

| Método | Endpoint | Descripción | Timeout |
|--------|----------|-------------|---------|
| `POST` | `/api/whatsapp/sessions` | Crear nueva sesión | 60s |
| `GET` | `/api/whatsapp/sessions` | Obtener todas las sesiones | 60s |
| `GET` | `/api/whatsapp/sessions/:sessionId` | Estado de sesión específica | 60s |
| `POST` | `/api/whatsapp/sessions/:sessionId/connect` | Conectar y generar QR | 60s |
| `POST` | `/api/whatsapp/sessions/:sessionId/disconnect` | Desconectar sesión | 60s |

### 💬 Rutas de Mensajería

| Método | Endpoint | Descripción | Optimización |
|--------|----------|-------------|--------------|
| `POST` | `/api/whatsapp/sessions/:sessionId/messages` | Enviar mensaje | Instant |
| `GET` | `/api/whatsapp/sessions/:sessionId/chats/:chatId/messages` | Obtener mensajes (sin filtros) | Cache |

### 👥 Rutas de Contactos (Optimizadas)

| Método | Endpoint | Descripción | Performance |
|--------|----------|-------------|-------------|
| `GET` | `/api/whatsapp/sessions/:sessionId/contacts` | Obtener contactos | ⚡ Optimizado |
| `GET` | `/api/whatsapp/sessions/:sessionId/chats/contacts` | Chats de contactos | ⚡ Batch loading |
| `GET` | `/api/whatsapp/sessions/:sessionId/chats/non-contacts` | Chats de no-contactos | ⚡ Filtrado |

### 🗨️ Rutas de Conversaciones

| Método | Endpoint | Descripción | Features |
|--------|----------|-------------|----------|
| `GET` | `/api/whatsapp/sessions/:sessionId/conversations/contacts` | Conversaciones de contactos | Grid responsive |
| `GET` | `/api/whatsapp/sessions/:sessionId/conversations/non-contacts` | Conversaciones de no-contactos | Scroll virtual |
| `GET` | `/api/whatsapp/sessions/:sessionId/conversations/realtime` | Conversaciones en tiempo real | Live updates |
| `GET` | `/api/whatsapp/sessions/:sessionId/conversations/:phoneNumber` | Conversación específica | Detail view |

### ⚡ Parámetros de Optimización

#### Paginación Estándar
```http
GET /api/endpoint?limit=50&offset=0
```

#### Filtros de Mensajes (Eliminados)
```http
# ❌ Antes (complejo):
GET /messages?includeFromMe=true&fromDate=2024-01-01

# ✅ Ahora (simple):
GET /messages?limit=100  # Siempre incluye todos los mensajes
```

### 🏃‍♂️ Mejoras de Performance

- **Timeout configurado**: 60 segundos para operaciones largas
- **Batch loading**: Contactos cargados en una sola petición
- **Cache interno**: Sesiones y contactos cached
- **Lazy loading**: Conversaciones cargadas bajo demanda
- **Filtros optimizados**: Eliminación de parámetros innecesarios

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

### ✅ Funcionalidades Implementadas

- [x] **Arquitectura de microservicios** - Node.js + Laravel + Vue.js
- [x] **API Gateway optimizada** - Laravel con timeout de 60s  
- [x] **WebSocket en tiempo real** - Socket.IO bidireccional
- [x] **Gestión avanzada de sesiones** - Crear, conectar, desconectar
- [x] **Modal QR automático** - Generación y cierre automático
- [x] **Chat optimizado** - Mensajes sin filtros innecesarios
- [x] **Carga inteligente de contactos** - Batch loading optimizado
- [x] **Interfaz responsive** - Grid responsivo y scroll virtual
- [x] **Notificaciones en tiempo real** - Estados y confirmaciones
- [x] **Limpieza de código** - Eliminación de código innecesario
- [x] **Manejo de errores robusto** - Timeout y error handling

### 🚀 Próximas Funcionalidades

- [ ] **Soporte para grupos de WhatsApp** - Gestión de grupos
- [ ] **Envío de archivos multimedia** - Imágenes, videos, documentos
- [ ] **Base de datos persistente** - PostgreSQL/MySQL para historial
- [ ] **Sistema de notificaciones push** - Push notifications web
- [ ] **Dashboard de analytics** - Métricas y estadísticas de uso
- [ ] **Sistema de webhooks** - Eventos hacia servicios externos
- [ ] **Autenticación JWT** - Sistema de usuarios y permisos
- [ ] **Logs centralizados** - Sistema de auditoría completo
- [ ] **Tests automatizados** - Unit tests e integration tests
- [ ] **Docker containerization** - Despliegue containerizado
- [ ] **CI/CD pipeline** - Integración y despliegue continuo

---

**Desarrollado con ❤️ para el Kiteprop Challenge**
