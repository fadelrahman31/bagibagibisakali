<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '../stores/app'
import type { Event, Expense, ExpenseSplit } from '../types'
import { X, Check } from 'lucide-vue-next'

const props = defineProps<{ event: Event, expense?: Expense }>()
const emit = defineEmits(['close'])

const appStore = useAppStore()

// Form State
const title = ref(props.expense?.title || '')
const amount = ref(props.expense?.totalAmount || 0)
const payerId = ref(props.expense?.payerId || props.event.participants[0]?.id || '')
const splitType = ref<'equal' | 'custom'>('equal')
const includedIds = ref<string[]>(
  props.expense?.splits.map(s => s.participantId) || props.event.participants.map(p => p.id)
)

// Currency helper
const currencySymbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', IDR: 'Rp' }
const symbol = currencySymbols[props.event.currency] || props.event.currency

// Computed: Equal split amount per person
const equalSplitAmount = computed(() => {
  if (includedIds.value.length === 0 || amount.value === 0) return 0
  return amount.value / includedIds.value.length
})

// Computed: Custom split total
const customSplitTotal = computed(() => {
  return props.event.participants.reduce((sum, p) => {
    return sum + (p.customAmount || 0)
  }, 0)
})

// Initialize custom amounts to 0
props.event.participants.forEach(p => {
  if (p.customAmount === undefined) p.customAmount = 0
  // Initialize custom amounts for editing
if (props.expense && props.expense.splits.length > 0) {
  // Check if it's custom split (amounts are different)
  const amounts = props.expense.splits.map(s => s.amount)
  const isCustom = amounts.some((amt, _, arr) => amt !== arr[0])
  
  if (isCustom) {
    splitType.value = 'custom'
    // Set custom amounts on participants
    props.expense.splits.forEach(split => {
      const participant = props.event.participants.find(p => p.id === split.participantId)
      if (participant) {
        participant.customAmount = split.amount
      }
    })
  }
}
})

function toggleParticipant(id: string) {
  if (includedIds.value.includes(id)) {
    includedIds.value = includedIds.value.filter(pid => pid !== id)
  } else {
    includedIds.value.push(id)
  }
}

function saveExpense() {
  if (!title.value.trim()) {
    alert('Please enter a title')
    return
  }
  if (amount.value <= 0) {
    alert('Please enter a valid amount')
    return
  }

  let splits: ExpenseSplit[] = []

  if (splitType.value === 'equal') {
    if (includedIds.value.length === 0) {
      alert('Select at least one person to split with')
      return
    }
    splits = includedIds.value.map(id => ({
      participantId: id,
      amount: equalSplitAmount.value
    }))
  } else {
    if (Math.abs(customSplitTotal.value - amount.value) > 0.01) {
      alert(`Custom amounts must equal the total bill (${symbol}${amount.value})`)
      return
    }
    splits = props.event.participants
      .filter(p => (p.customAmount || 0) > 0)
      .map(p => ({
        participantId: p.id,
        amount: p.customAmount || 0
      }))
  }

  const expenseData: Expense = {
    id: props.expense?.id || crypto.randomUUID(),
    eventId: props.event.id,
    title: title.value.trim(),
    totalAmount: amount.value,
    payerId: payerId.value,
    splits: splits,
    createdAt: props.expense?.createdAt || Date.now()
  }

  if (props.expense) {
    // Update existing
    appStore.updateExpense(props.event.id, expenseData)
  } else {
    // Add new
    appStore.addExpense(props.event.id, expenseData)
  }
  
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
        <h2 class="text-xl font-bold text-[#7B1D3A]">{{ expense ? 'Edit Expense' : 'Add Expense' }}</h2>
        <button @click="emit('close')" class="p-2 hover:bg-gray-100 rounded-full">
          <X class="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-4 space-y-6">
        
        <!-- Title -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">What's this for?</label>
          <input 
            v-model="title" 
            type="text" 
            placeholder="e.g., Dinner, Cafe, Uber"
            class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7B1D3A]/20 focus:border-[#7B1D3A] transition-all"
          />
        </div>

        <!-- Amount -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Total Amount</label>
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

        <!-- Paid By -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Paid by</label>
          <div class="flex gap-3 overflow-x-auto pb-2">
            <button 
              v-for="p in event.participants" 
              :key="p.id"
              @click="payerId = p.id"
              class="flex flex-col items-center gap-1 min-w-[60px]"
            >
              <div 
                class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-sm transition-all"
                :class="payerId === p.id ? 'ring-2 ring-offset-2 ring-[#F97316] scale-105' : 'opacity-60'"
                :style="{ backgroundColor: p.color }"
              >
                {{ p.name.charAt(0).toUpperCase() }}
                <Check v-if="payerId === p.id" class="w-4 h-4 absolute text-white bg-[#F97316] rounded-full p-0.5 -top-1 -right-1" />
              </div>
              <span class="text-xs font-medium text-gray-700 truncate w-full text-center">{{ p.name }}</span>
            </button>
          </div>
        </div>

        <!-- Split Type Toggle -->
        <div class="flex bg-gray-100 p-1 rounded-xl">
          <button 
            @click="splitType = 'equal'"
            :class="splitType === 'equal' ? 'bg-white text-[#7B1D3A] shadow-sm' : 'text-gray-500'"
            class="flex-1 py-2 rounded-lg font-semibold text-sm transition-all"
          >
            Equal Split
          </button>
          <button 
            @click="splitType = 'custom'"
            :class="splitType === 'custom' ? 'bg-white text-[#7B1D3A] shadow-sm' : 'text-gray-500'"
            class="flex-1 py-2 rounded-lg font-semibold text-sm transition-all"
          >
            Custom Amounts
          </button>
        </div>

        <!-- Split Details -->
        <div>
          <!-- Equal Split UI -->
          <div v-if="splitType === 'equal'" class="space-y-3">
            <div class="flex flex-wrap gap-2">
              <button 
                v-for="p in event.participants" 
                :key="p.id"
                @click="toggleParticipant(p.id)"
                :class="includedIds.includes(p.id) ? 'opacity-100' : 'opacity-40 grayscale'"
                class="flex flex-col items-center gap-1"
              >
                <div 
                  class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-sm border-2 border-transparent transition-all"
                  :style="{ backgroundColor: p.color, borderColor: includedIds.includes(p.id) ? '#7B1D3A' : 'transparent' }"
                >
                  {{ p.name.charAt(0).toUpperCase() }}
                </div>
                <span class="text-xs font-medium text-gray-700">{{ p.name }}</span>
              </button>
            </div>
            <p class="text-center text-sm text-gray-500 mt-4">
              Split between {{ includedIds.length }} people 
              <span v-if="amount > 0" class="font-bold text-[#7B1D3A]">
                ({{ symbol }}{{ equalSplitAmount.toFixed(2) }} each)
              </span>
            </p>
          </div>

          <!-- Custom Split UI -->
          <div v-if="splitType === 'custom'" class="space-y-3">
            <div 
              v-for="p in event.participants" 
              :key="p.id"
              class="flex items-center justify-between bg-gray-50 p-3 rounded-xl"
            >
              <div class="flex items-center gap-3">
                <div 
                  class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  :style="{ backgroundColor: p.color }"
                >
                  {{ p.name.charAt(0).toUpperCase() }}
                </div>
                <span class="font-medium text-gray-800">{{ p.name }}</span>
              </div>
              <div class="relative w-32">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{{ symbol }}</span>
                <input 
                  v-model.number="p.customAmount" 
                  type="number" 
                  min="0"
                  step="0.01"
                  class="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-right focus:outline-none focus:ring-1 focus:ring-[#7B1D3A]"
                />
              </div>
            </div>
            <div class="flex justify-between items-center pt-2 border-t border-gray-200">
              <span class="text-sm font-semibold text-gray-600">Total Custom:</span>
              <span 
                class="font-bold"
                :class="Math.abs(customSplitTotal - amount) < 0.01 ? 'text-green-600' : 'text-red-500'"
              >
                {{ symbol }}{{ customSplitTotal.toFixed(2) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="sticky bottom-0 bg-white border-t border-gray-100 p-4 rounded-b-2xl">
        <button 
          @click="saveExpense"
          class="w-full py-4 bg-[#F97316] text-white font-bold text-lg rounded-xl hover:bg-orange-600 transition-colors shadow-lg"
        >
          Save Expense
        </button>
      </div>
    </div>
  </div>
</template>