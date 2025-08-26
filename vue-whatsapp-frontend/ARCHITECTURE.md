# Arquitectura MVVM - Frontend WhatsApp

## **Descripción General**

Este proyecto implementa el patrón **MVVM (Model-View-ViewModel)** para crear una arquitectura limpia, mantenible y escalable. La separación de responsabilidades permite un desarrollo más eficiente y un código más fácil de mantener.

## **Estructura de Carpetas**

```
src/
├── components/          # Componentes Vue reutilizables (V)
│   ├── chat/           # Componentes específicos del chat
│   ├── conversation/   # Componentes de conversación
│   └── message/        # Componentes de mensaje
├── models/             # Modelos de datos y lógica de negocio (M)
├── viewmodels/         # ViewModels - lógica de presentación (VM)
├── views/              # Vistas principales (V)
├── stores/             # Estado global (Vuex)
├── services/           # Servicios de API y WebSocket
├── types/              # Tipos TypeScript
└── utils/              # Utilidades y helpers
```

## **Patrón MVVM Implementado**

### **1. Model (Modelo)**
- **Responsabilidad**: Lógica de negocio, validación y manipulación de datos
- **Ubicación**: `src/models/`
- **Características**:
  - Clases con métodos de negocio
  - Validación de datos
  - Factory methods
  - Serialización/deserialización
  - Getters computados para lógica de presentación

**Ejemplo de Modelo:**
```typescript
export class ConversationModel implements Conversation {
  // Propiedades
  id: string;
  sessionId: string;
  phoneNumber: string;
  
  // Métodos de negocio
  get displayName(): string {
    return this.contactName || this.phoneNumber;
  }
  
  get hasUnreadMessages(): boolean {
    return this.unreadCount > 0;
  }
  
  // Métodos de actualización
  updateLastMessage(message: string, timestamp: Date): void {
    this.lastMessage = message;
    this.lastMessageTime = timestamp;
    this.updatedAt = new Date();
  }
}
```

### **2. View (Vista)**
- **Responsabilidad**: Presentación visual y interacción del usuario
- **Ubicación**: `src/views/` y `src/components/`
- **Características**:
  - Solo maneja la presentación
  - No contiene lógica de negocio
  - Se comunica con el ViewModel a través de props y eventos
  - Componentes reutilizables y modulares

**Ejemplo de Vista:**
```vue
<template>
  <div class="chat-container">
    <ConversationItem
      v-for="conversation in filteredConversations"
      :key="conversation.id"
      :conversation="conversation"
      @select="selectConversation"
    />
  </div>
</template>
```

### **3. ViewModel**
- **Responsabilidad**: Lógica de presentación, estado del componente y comunicación con el Model
- **Ubicación**: `src/viewmodels/`
- **Características**:
  - Maneja el estado reactivo del componente
  - Contiene la lógica de presentación
  - Se comunica con el store y los modelos
  - Proporciona métodos para la vista
  - Gestiona el ciclo de vida del componente

**Ejemplo de ViewModel:**
```typescript
export class ChatViewModel {
  // Estado reactivo
  public searchQuery = ref('')
  public selectedConversation = ref<Conversation | null>(null)
  
  // Computed properties
  get filteredConversations(): Conversation[] {
    if (!this.searchQuery.value) return this.conversations
    return this.conversations.filter(conv => 
      conv.displayName.toLowerCase().includes(this.searchQuery.value.toLowerCase())
    )
  }
  
  // Métodos de negocio
  async selectConversation(conversation: Conversation): Promise<void> {
    this.selectedConversation.value = conversation
    await this.store.dispatch('whatsapp/getMessages', {
      sessionId: this.sessionId,
      phoneNumber: conversation.phoneNumber
    })
    this.scrollToBottom()
  }
}
```

## **Flujo de Datos**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│    View     │◄──►│  ViewModel   │◄──►│    Model    │
│             │    │              │    │             │
│ - Template  │    │ - Estado     │    │ - Lógica    │
│ - Estilos   │    │ - Métodos    │    │ - Validación│
│ - Eventos   │    │ - Computed   │    │ - Datos     │
└─────────────┘    └──────────────┘    └─────────────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  Component  │    │     Store    │    │   Service   │
│  Vue        │    │    (Vuex)    │    │   (API)     │
└─────────────┘    └──────────────┘    └─────────────┘
```

## **Ventajas de esta Arquitectura**

### **1. Separación de Responsabilidades**
- **View**: Solo presentación visual
- **ViewModel**: Lógica de presentación y estado
- **Model**: Lógica de negocio y datos

### **2. Reutilización de Código**
- Los modelos pueden ser utilizados en múltiples ViewModels
- Los ViewModels pueden ser reutilizados en diferentes vistas
- Los componentes son modulares y reutilizables

### **3. Testabilidad**
- Cada capa puede ser testeada independientemente
- Los ViewModels pueden ser testeados sin dependencias de Vue
- Los modelos pueden ser testeados unitariamente

### **4. Mantenibilidad**
- Código más organizado y fácil de entender
- Cambios en una capa no afectan a las otras
- Debugging más sencillo

### **5. Escalabilidad**
- Fácil agregar nuevas funcionalidades
- Estructura clara para nuevos desarrolladores
- Patrón consistente en todo el proyecto

## **Convenciones de Nomenclatura**

### **Archivos**
- **Modelos**: `PascalCase.ts` (ej: `ConversationModel.ts`)
- **ViewModels**: `PascalCase.ts` (ej: `ChatViewModel.ts`)
- **Componentes**: `PascalCase.vue` (ej: `MessageBubble.vue`)
- **Vistas**: `PascalCase.vue` (ej: `ChatView.vue`)

### **Clases**
- **Modelos**: Sufijo `Model` (ej: `ConversationModel`)
- **ViewModels**: Sufijo `ViewModel` (ej: `ChatViewModel`)

### **Métodos**
- **Getters**: `get propertyName()`
- **Métodos privados**: `private methodName()`
- **Métodos públicos**: `public methodName()`

## **Ejemplo de Uso Completo**

### **1. Crear un nuevo Modelo**
```typescript
// src/models/User.ts
export interface User {
  id: string;
  name: string;
  email: string;
}

export class UserModel implements User {
  constructor(data: Partial<User>) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.email = data.email || '';
  }
  
  get displayName(): string {
    return this.name || this.email;
  }
  
  isValid(): boolean {
    return !!(this.id && this.name && this.email);
  }
}
```

### **2. Crear un ViewModel**
```typescript
// src/viewmodels/UserViewModel.ts
export class UserViewModel {
  public users = ref<User[]>([])
  public selectedUser = ref<User | null>(null)
  
  async loadUsers(): Promise<void> {
    // Lógica para cargar usuarios
  }
  
  selectUser(user: User): void {
    this.selectedUser.value = user;
  }
}
```

### **3. Usar en una Vista**
```vue
<template>
  <div>
    <div v-for="user in users" @click="selectUser(user)">
      {{ user.displayName }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { UserViewModel } from '../viewmodels/UserViewModel'

const viewModel = new UserViewModel()
const { users, selectedUser } = viewModel.reactiveState
const { loadUsers, selectUser } = viewModel.reactiveMethods

onMounted(() => {
  loadUsers()
})
</script>
```

## **Consideraciones de Implementación**

### **1. Estado Reactivo**
- Usar `ref()` y `computed()` en ViewModels
- Exponer estado a través de getters
- Mantener la reactividad de Vue

### **2. Comunicación entre Componentes**
- Usar props para pasar datos hacia abajo
- Usar eventos para comunicar hacia arriba
- Evitar comunicación directa entre componentes hermanos

### **3. Manejo de Errores**
- Implementar manejo de errores en ViewModels
- Mostrar errores en la vista
- Logging apropiado para debugging

### **4. Performance**
- Usar `computed` para cálculos costosos
- Implementar lazy loading cuando sea apropiado
- Optimizar re-renders con `v-memo` si es necesario

## **Próximos Pasos**

1. **Refactorizar SessionsView** para usar el patrón MVVM
2. **Crear más componentes reutilizables**
3. **Implementar tests unitarios** para modelos y ViewModels
4. **Agregar validación de datos** en los modelos
5. **Implementar manejo de errores** más robusto
6. **Crear documentación de componentes** con Storybook

## **Conclusión**

Esta arquitectura MVVM proporciona una base sólida para el desarrollo del frontend, permitiendo un código más organizado, mantenible y escalable. La separación clara de responsabilidades facilita el desarrollo en equipo y la implementación de nuevas funcionalidades.
