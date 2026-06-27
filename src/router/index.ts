import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import EventView from '../views/EventView.vue'
import SettlementView from '../views/SettlementView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/event/:id',
      name: 'event',
      component: EventView
    },
    {
      path: '/event/:id/settle',
      name: 'settlement',
      component: SettlementView
    }
  ]
})

export default router