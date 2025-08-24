import { createStore } from 'vuex'
import whatsapp from './modules/whatsapp'
import { socketService } from '../services/socketService'

const store = createStore({
  modules: {
    whatsapp
  }
})

// 🔄 NUEVO: Conectar el socketService con el store para eventos en tiempo real
socketService.setStore(store as unknown as Parameters<typeof socketService.setStore>[0])

export default store
