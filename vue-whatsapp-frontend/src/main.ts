import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import { socketService } from './services/socketService'
import './index.css'

const app = createApp(App)

app.use(router)
app.use(store)

// 🔄 NUEVO: Conectar WebSocket automáticamente al inicializar la aplicación
console.log('🚀 Inicializando aplicación y conectando WebSocket...')
socketService.connect()

app.mount('#app')
