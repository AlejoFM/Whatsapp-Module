import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import SessionsView from '../views/SessionsView.vue'
import ChatView from '../views/ChatView.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Sessions',
    component: SessionsView
  },
  {
    path: '/chat/:sessionId/:phoneNumber?',
    name: 'Chat',
    component: ChatView,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
