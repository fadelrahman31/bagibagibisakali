<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { ArrowLeft, CheckCircle2, Share2 } from 'lucide-vue-next'
import { calculateSettlements } from '../utils/settlement'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const eventId = route.params.id as string
const event = computed(() => appStore.events.find(e => e.id === eventId))

const currencySymbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', IDR: 'Rp' }

function formatAmount(amount: number): string {
  if (!event.value) return ''
  const symbol = currencySymbols[event.value.currency] || event.value.currency
  return `${symbol}${amount.toLocaleString()}`
}

function isAlreadyPaid(settlement: { from: any, to: any, amount: number }): boolean {
  if (!event.value) return false
  return event.value.payments.some(p => 
    p.fromParticipantId === settlement.from.id &&
    p.toParticipantId === settlement.to.id &&
    Math.abs(p.amount - settlement.amount) < 0.01
  )
}

// The Magic: Calculate simplified debts reactively
const settlements = computed(() => {
  if (!event.value) return []
  return calculateSettlements(event.value)
})

const totalSettled = computed(() => {
  return settlements.value.reduce((sum, s) => sum + s.amount, 0)
})

function goBack() {
  router.push({ name: 'event', params: { id: eventId } })
}

function markAsPaid(settlement: { from: any, to: any, amount: number }) {
  if (!event.value) return
  
  // Check if this exact payment already exists
  const alreadyPaid = event.value.payments.some(p => 
    p.fromParticipantId === settlement.from.id &&
    p.toParticipantId === settlement.to.id &&
    Math.abs(p.amount - settlement.amount) < 0.01
  )
  
  if (alreadyPaid) {
    alert('This payment has already been recorded!')
    return
  }
  
  // Create a payment record in the store
  appStore.addPayment(event.value.id, {
    id: crypto.randomUUID(),
    eventId: event.value.id,
    fromParticipantId: settlement.from.id,
    toParticipantId: settlement.to.id,
    amount: settlement.amount,
    createdAt: Date.now(),
    note: 'Settled via app'
  })
}

function shareToWhatsApp() {
  if (!event.value) return
  let text = `*${event.value.title} - Settlement*\n\n`
  settlements.value.forEach(s => {
    text += `${s.from.name} pays ${s.to.name}: ${formatAmount(s.amount)}\n`
  })
  
  const encoded = encodeURIComponent(text)
  window.open(`https://wa.me/?text=${encoded}`, '_blank')
}
</script>

<template>
  <div v-if="event" class="min-h-screen bg-slate-900 text-white pb-32">
    
    <!-- Header -->
    <div class="px-4 py-6 text-center border-b border-slate-800">
      <button @click="goBack" class="absolute top-6 left-4 p-2 text-slate-400 hover:text-white">
        <ArrowLeft class="w-6 h-6" />
      </button>
      <h1 class="text-2xl font-bold mb-2">{{ event.title }}</h1>
      <p class="text-slate-400 text-sm">Total to settle: {{ formatAmount(totalSettled) }}</p>
    </div>

    <!-- Main Content -->
    <div class="max-w-md mx-auto p-4 space-y-4 mt-4">
      
      <!-- Empty State -->
      <div v-if="settlements.length === 0" class="text-center py-20">
        <div class="text-6xl mb-4"></div>
        <h2 class="text-xl font-bold text-green-400">All Settled Up!</h2>
        <p class="text-slate-400 mt-2">No one owes anything.</p>
      </div>

      <!-- Settlement Cards -->
      <div 
        v-for="(s, index) in settlements" 
        :key="index"
        :class="[
          'bg-slate-800 rounded-2xl p-4 flex items-center justify-between border shadow-lg transition-all',
          isAlreadyPaid(s) ? 'border-green-500/30 opacity-60' : 'border-slate-700'
        ]"
      >
                <div class="flex items-start gap-3 flex-1">
          <!-- From (Payer) -->
          <div class="flex flex-col items-center">
            <div 
              class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md"
              :style="{ backgroundColor: s.from.color }"
            >
              {{ s.from.name.charAt(0) }}
            </div>
            <p class="text-xs text-slate-400 mt-1 text-center truncate w-16">{{ s.from.name }}</p>
          </div>
          
          <!-- Arrow -->
          <div class="text-slate-500 text-xl mt-3">→</div>
          
          <!-- To (Receiver) -->
          <div class="flex flex-col items-center">
            <div 
              class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md"
              :style="{ backgroundColor: s.to.color }"
            >
              {{ s.to.name.charAt(0) }}
            </div>
            <p class="text-xs text-slate-400 mt-1 text-center truncate w-16">{{ s.to.name }}</p>
          </div>
        </div>

        <div class="flex flex-col items-end gap-2">
          <span class="text-2xl font-bold text-[#F97316]">{{ formatAmount(s.amount) }}</span>
          
          <!-- Paid Badge (only show when already paid) -->
          <div v-if="isAlreadyPaid(s)" class="flex items-center gap-1 text-sm text-green-400 font-medium">
            <CheckCircle2 class="w-5 h-5" />
            <span>Paid</span>
          </div>
          
          <!-- Mark Paid Button (only show when NOT paid) -->
          <button 
            v-else
            @click="markAsPaid(s)"
            class="flex items-center gap-1 text-xs text-slate-400 hover:text-green-400 transition-colors px-3 py-1 rounded-lg hover:bg-slate-700"
          >
            <CheckCircle2 class="w-4 h-4" />
            Mark Paid
          </button>
        </div>
      </div>

    <!-- Bottom Action Bar -->
    <div class="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-4 z-20">
      <div class="max-w-md mx-auto flex gap-3">
        <button 
          @click="goBack"
          class="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors border border-slate-700"
        >
          Back to Event
        </button>
        <button 
          @click="shareToWhatsApp"
          class="flex-1 py-3 bg-[#F97316] text-white font-bold rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
        >
          <Share2 class="w-5 h-5" />
          Share
        </button>
      </div>
    </div>
  </div>
  </div>
</template>