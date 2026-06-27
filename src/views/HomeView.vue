<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '../stores/app'
import type { Event } from '../types'
import CreateEventModal from '../components/CreateEventModal.vue'
import { Bell, Plus, ChevronDown, ChevronRight } from 'lucide-vue-next'
import SettingsPanel from '../components/SettingsPanel.vue'

const appStore = useAppStore()
const isSettingsOpen = ref(false)

// UI State
const isCreateModalOpen = ref(false)
const expandedCurrencies = ref<Record<string, boolean>>({})

// Currency display names
const currencySymbols: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  IDR: 'Rp'
}

// Ensure all currencies are expanded by default when they appear
const allCurrencies = computed(() => Object.keys(appStore.eventsByCurrency))
allCurrencies.value.forEach(c => {
  if (expandedCurrencies.value[c] === undefined) {
    expandedCurrencies.value[c] = true
  }
})

function toggleCurrency(currency: string) {
  expandedCurrencies.value[currency] = !expandedCurrencies.value[currency]
}

function getTotalAmount(event: Event): number {
  return event.expenses.reduce((sum, expense) => sum + expense.totalAmount, 0)
}

function formatAmount(amount: number, currency: string): string {
  const symbol = currencySymbols[currency] || currency
  return `${symbol}${amount.toLocaleString()}`
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
      <div class="max-w-md mx-auto flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-[#7B1D3A]">BagiBagiBisaKali</h1>
          <p class="text-gray-600 text-sm mt-1">Record and split your expenses today!</p>
        </div>
        <button @click="isSettingsOpen = true" class="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Bell class="w-6 h-6 text-[#7B1D3A]" />
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-md mx-auto p-4 pb-24">
      <!-- Empty State -->
      <div v-if="Object.keys(appStore.eventsByCurrency).length === 0" class="text-center py-20">
        <p class="text-gray-400 text-lg">No hangouts yet.</p>
        <p class="text-gray-400 text-sm mt-2">Tap + to start one!</p>
      </div>

      <!-- Currency Groups -->
      <div v-for="(currencyEvents, currency) in appStore.eventsByCurrency" :key="currency" class="mb-6">
        <!-- Currency Header -->
        <button 
          @click="toggleCurrency(currency)"
          class="w-full flex items-center justify-between mb-3 px-1"
        >
          <div class="flex items-center gap-2">
            <span class="text-2xl font-bold text-[#7B1D3A]">{{ currencySymbols[currency] || currency }}</span>
            <span class="text-xl font-bold text-[#7B1D3A]">{{ currency }}</span>
          </div>
          <component 
            :is="expandedCurrencies[currency] ? ChevronDown : ChevronRight" 
            class="w-6 h-6 text-[#7B1D3A]"
          />
        </button>

        <!-- Event Cards -->
        <div v-if="expandedCurrencies[currency]" class="space-y-3">
                  <!-- Event Cards -->
        <div v-if="expandedCurrencies[currency]" class="space-y-3">
          <router-link 
            v-for="event in currencyEvents" 
            :key="event.id"
            :to="{ name: 'event', params: { id: event.id } }"
            class="block bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div class="flex justify-between items-start mb-2">
              <h3 class="font-semibold text-gray-900 text-lg">{{ event.title }}</h3>
              <span 
                v-if="event.expenses.length > 0"
                class="px-3 py-1 bg-[#F97316] text-white text-xs font-medium rounded-full"
              >
                Active
              </span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <span class="font-bold text-[#7B1D3A] text-lg">
                {{ formatAmount(getTotalAmount(event), currency) }}
              </span>
              <span class="text-gray-500">{{ event.participants.length }} people</span>
            </div>
          </router-link>
        </div>
        </div>
      </div>
    </div>

    <!-- Floating Action Button -->
    <button 
      @click="isCreateModalOpen = true"
      class="fixed bottom-6 right-6 w-14 h-14 bg-[#F97316] rounded-full shadow-lg flex items-center justify-center hover:bg-orange-600 transition-colors hover:scale-105 transform z-20"
    >
      <Plus class="w-8 h-8 text-white" />
    </button>

    <SettingsPanel 
        v-if="isSettingsOpen" 
        @close="isSettingsOpen = false" 
    />

    <!-- Create Event Modal -->
    <CreateEventModal 
      v-if="isCreateModalOpen" 
      @close="isCreateModalOpen = false" 
    />
  </div>
</template>