<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '../stores/app'
import type { Event, Payment } from '../types'
import { X, Check, Handshake } from 'lucide-vue-next'

const props = defineProps<{ event: Event }>()
const emit = defineEmits(['close'])

const appStore = useAppStore()

// Form State
const fromId = ref(props.event.participants[0]?.id || '')
const toId = ref(props.event.participants[1]?.id || '')
const amount = ref<number>(0)
const note = ref('')

// Currency helper
const currencySymbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', IDR: 'Rp' }
const symbol = currencySymbols[props.event.currency] || props.event.currency

function savePayment() {
  if (fromId.value === toId.value) {
    alert('Cannot pay yourself!')
    return
  }
  if (amount.value <= 0) {
    alert('Please enter a valid amount')
    return
  }

  const newPayment: Payment = {
    id: crypto.randomUUID(),
    eventId: props.event.id,
    fromParticipantId: fromId.value,
    toParticipantId: toId.value,
    amount: amount.value,
    createdAt: Date.now(),
    note: note.value.trim()
  }

  appStore.addPayment(props.event.id, newPayment)
  emit('close')
}
</script>

<template>
  <!-- Backdrop -->
  <div class="fixed inset-0 bg-black/50 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4" @click.self="emit('close')">
    
    <!-- Modal Content -->
    <div class="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
      
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center rounded-t-2xl z-10">
        <h2 class="text-xl font-bold text-[#7B1D3A]">Log Settlement</h2>
        <button @click="emit('close')" class="p-2 hover:bg-gray-100 rounded-full">
          <X class="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-4 space-y-6">
        
        <!-- From -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">From (Payer)</label>
          <div class="flex gap-3 overflow-x-auto pb-2">
            <button 
              v-for="p in event.participants" 
              :key="p.id"
              @click="fromId = p.id"
              class="flex flex-col items-center gap-1 min-w-[60px]"
            >
              <div 
                class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-sm transition-all relative"
                :class="fromId === p.id ? 'ring-2 ring-offset-2 ring-[#F97316] scale-105' : 'opacity-60'"
                :style="{ backgroundColor: p.color }"
              >
                {{ p.name.charAt(0).toUpperCase() }}
                <Check v-if="fromId === p.id" class="w-4 h-4 absolute text-white bg-[#F97316] rounded-full p-0.5 -top-1 -right-1" />
              </div>
              <span class="text-xs font-medium text-gray-700 truncate w-full text-center">{{ p.name }}</span>
            </button>
          </div>
        </div>

        <!-- To -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">To (Receiver)</label>
          <div class="flex gap-3 overflow-x-auto pb-2">
            <button 
              v-for="p in event.participants" 
              :key="p.id"
              @click="toId = p.id"
              class="flex flex-col items-center gap-1 min-w-[60px]"
            >
              <div 
                class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-sm transition-all relative"
                :class="toId === p.id ? 'ring-2 ring-offset-2 ring-[#F97316] scale-105' : 'opacity-60'"
                :style="{ backgroundColor: p.color }"
              >
                {{ p.name.charAt(0).toUpperCase() }}
                <Check v-if="toId === p.id" class="w-4 h-4 absolute text-white bg-[#F97316] rounded-full p-0.5 -top-1 -right-1" />
              </div>
              <span class="text-xs font-medium text-gray-700 truncate w-full text-center">{{ p.name }}</span>
            </button>
          </div>
        </div>

        <!-- Amount -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">{{ symbol }}</span>
            <input 
              v-model.number="amount" 
              type="number" 
              min="0"
              step="0.01"
              placeholder="0"
              class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7B1D3A]/20 focus:border-[#7B1D3A] transition-all text-lg font-bold"
            />
          </div>
        </div>

        <!-- Note -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Note (Optional)</label>
          <input 
            v-model="note" 
            type="text" 
            placeholder="e.g., Cash from Day 1"
            class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7B1D3A]/20 focus:border-[#7B1D3A] transition-all"
          />
        </div>
      </div>

      <!-- Footer -->
      <div class="sticky bottom-0 bg-white border-t border-gray-100 p-4 rounded-b-2xl">
        <button 
          @click="savePayment"
          class="w-full py-4 bg-[#F97316] text-white font-bold text-lg rounded-xl hover:bg-orange-600 transition-colors shadow-lg flex items-center justify-center gap-2"
        >
          <Handshake class="w-5 h-5" />
          Save Payment
        </button>
      </div>
    </div>
  </div>
</template>