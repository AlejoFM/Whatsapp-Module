<template>
  <div id="app" class="min-h-screen bg-gray-100">
    <nav class="bg-green-600 text-white shadow-lg">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-semibold">WhatsApp Integration</h1>
          </div>
          <div class="flex items-center space-x-4">
            <span class="text-sm">
              Sesiones activas: {{ activeSessionsCount }}
            </span>
          </div>
        </div>
      </div>
    </nav>
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <router-view />
    </main>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useStore } from 'vuex'
import { WhatsAppSession } from './types'

export default defineComponent({
  name: 'App',
  setup() {
    const store = useStore()
    const activeSessionsCount = computed(() => {
      return store.state.whatsapp.sessions.filter((s: WhatsAppSession) => s.isConnected).length
    })
    return {
      activeSessionsCount
    }
  }
})
</script>

<style>
#app {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
