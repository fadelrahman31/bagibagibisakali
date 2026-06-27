<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { ArrowLeft, Utensils, Coffee, Home, Handshake, Plus, Edit, Trash2 } from 'lucide-vue-next'
import LogPaymentModal from '../components/LogPaymentModal.vue'
import AddExpenseModal from '../components/AddExpenseModal.vue'
import { calculateSettlements } from '../utils/settlement'
import type { Event, Expense } from '../types'


const isAddExpenseOpen = ref(false)
const isLogPaymentOpen = ref(false)
const showAllExpenses = ref(false)
const showAllSettlements = ref(false)

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const eventId = route.params.id as string
const event = computed(() => appStore.events.find(e => e.id === eventId))

const editingExpense = ref<Expense | undefined>()

// Currency formatting helper
const currencySymbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', IDR: 'Rp' }

function formatAmount(amount: number): string {
  if (!event.value) return ''
  const symbol = currencySymbols[event.value.currency] || event.value.currency
  return `${symbol}${amount.toLocaleString()}`
}

// Format timestamp helper
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function deleteExpense(expenseId: string) {
  if (!event.value) return
  if (confirm('Are you sure you want to delete this expense?')) {
    const updatedEvent = { ...event.value }
    updatedEvent.expenses = updatedEvent.expenses.filter(e => e.id !== expenseId)
    appStore.updateEvent(updatedEvent)
  }
}

function openEditExpense(expense: Expense) {
  editingExpense.value = expense
  isAddExpenseOpen.value = true
}

function closeAddExpenseModal() {
  editingExpense.value = undefined
  isAddExpenseOpen.value = false
}

const totalSpent = computed(() => {
  if (!event.value) return 0
  return event.value.expenses.reduce((sum, expense) => sum + expense.totalAmount, 0)
})

// Sorted and limited expenses
const displayedExpenses = computed(() => {
  if (!event.value) return []
  const sorted = [...event.value.expenses].sort((a, b) => b.createdAt - a.createdAt)
  return showAllExpenses.value ? sorted : sorted.slice(0, 3)
})

const hasMoreExpenses = computed(() => {
  return event.value && event.value.expenses.length > 3
})

// Sorted and limited settlements
const displayedSettlements = computed(() => {
  if (!event.value) return []
  const sorted = [...event.value.payments].sort((a, b) => b.createdAt - a.createdAt)
  return showAllSettlements.value ? sorted : sorted.slice(0, 3)
})

const hasMoreSettlements = computed(() => {
  return event.value && event.value.payments.length > 3
})

const settlementStatus = computed(() => {
  if (!event.value) return null
  
  const settlements = calculateSettlements(event.value)
  
  if (settlements.length === 0) {
    return { 
      type: 'success', 
      message: 'All settled up! 🎉' 
    }
  }
  
  // Get unique debtors (people who owe money)
  const debtors = [...new Set(settlements.map(s => s.from.name))]
  
  if (debtors.length === 1) {
    return { 
      type: 'warning', 
      message: `${debtors[0]} still needs to settle up` 
    }
  }
  
  return { 
    type: 'warning', 
    message: `${debtors.length} people still need to settle up` 
  }
})

function goBack() {
  router.push({ name: 'home' })
}

function handleSettleUp() {
  router.push({ name: 'settlement', params: { id: eventId } })
}
</script>

<template>
  <div v-if="event" class="min-h-screen bg-gray-50 pb-32">
    
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
      <div class="max-w-md mx-auto flex items-center justify-between">
        <button @click="goBack" class="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft class="w-6 h-6 text-[#7B1D3A]" />
        </button>
        <h1 class="text-lg font-bold text-gray-900 truncate px-2">{{ event.title }}</h1>
        <div class="w-10"></div> <!-- Spacer for balance -->
      </div>
      <div class="max-w-md mx-auto mt-2 text-center">
        <span class="text-2xl font-bold text-[#7B1D3A]">{{ formatAmount(totalSpent) }}</span>
        <span class="text-gray-500 text-sm ml-2">total spent</span>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-md mx-auto p-4 space-y-6">
      
      <!-- Participants Summary -->
      <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
        <p class="text-sm font-semibold text-gray-700 mb-3">{{ event.participants.length }} participants</p>
        <div class="flex justify-center gap-2 mb-2">
          <div 
            v-for="p in event.participants" 
            :key="p.id"
            class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
            :style="{ backgroundColor: p.color }"
            :title="p.name"
          >
            {{ p.name.charAt(0).toUpperCase() }}
          </div>
        </div>
        <p class="text-xs text-gray-500">{{ event.expenses.length }} expenses logged</p>
      </div>

      <!-- Settlement Status Banner -->
      <div 
        v-if="settlementStatus"
        :class="[
          'rounded-xl p-3 text-center font-medium text-sm transition-all',
          settlementStatus.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-orange-50 text-orange-700 border border-orange-200'
        ]"
      >
        {{ settlementStatus.message }}
      </div>

      <!-- Expenses List -->
      <div>
        <div class="flex justify-between items-center mb-3 px-1">
          <h2 class="text-sm font-bold text-gray-500 uppercase tracking-wide">Expenses</h2>
          <span class="text-xs text-gray-400">{{ event.expenses.length }} total</span>
        </div>
        
        <div v-if="event.expenses.length === 0" class="text-center py-8 bg-white rounded-xl border border-dashed border-gray-200">
          <Utensils class="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p class="text-gray-400 text-sm">No expenses yet.</p>
          <p class="text-gray-400 text-xs mt-1">Tap + to add the first bill!</p>
        </div>

        <div v-else class="space-y-3">
          <div 
            v-for="expense in displayedExpenses" 
            :key="expense.id" 
            class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group"
          >
            <div class="flex items-center gap-3 flex-1">
              <div class="w-10 h-10 rounded-full bg-[#7B1D3A]/10 flex items-center justify-center text-[#7B1D3A]">
                <Utensils class="w-5 h-5" />
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-bold text-gray-900">{{ expense.title }}</h4>
                <p class="text-xs text-gray-500">
                  Paid by {{ event.participants.find(p => p.id === expense.payerId)?.name }} • Split {{ expense.splits.length }} ways
                </p>
                <p class="text-xs text-gray-400 mt-0.5">{{ formatTimestamp(expense.createdAt) }}</p>
              </div>
            </div>
              <div class="flex items-center gap-2">
              <p class="font-bold text-[#7B1D3A] text-lg">{{ formatAmount(expense.totalAmount) }}</p>
              
              <!-- Edit Button (Always visible, subtle gray) -->
              <button 
                @click.stop="openEditExpense(expense)"
                class="p-2 text-gray-400 active:text-[#7B1D3A] active:bg-[#7B1D3A]/10 rounded-full transition-colors"
              >
                <Edit class="w-4 h-4" />
              </button>
              
              <!-- Delete Button (Always visible, subtle gray) -->
              <button 
                @click.stop="deleteExpense(expense.id)"
                class="p-2 text-gray-400 active:text-red-500 active:bg-red-50 rounded-full transition-colors"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <!-- Show More/Less Button -->
          <button 
            v-if="hasMoreExpenses"
            @click="showAllExpenses = !showAllExpenses"
            class="w-full py-3 text-sm font-semibold text-[#7B1D3A] hover:bg-[#7B1D3A]/5 rounded-xl transition-colors"
          >
            {{ showAllExpenses ? 'Show Less' : `Show ${event.expenses.length - 3} More` }}
          </button>
        </div>
      </div>

      <!-- Settlements List -->
      <div>
        <div class="flex justify-between items-center mb-3 px-1">
          <h2 class="text-sm font-bold text-gray-500 uppercase tracking-wide">Settlements</h2>
          <button 
            @click="isLogPaymentOpen = true"
            class="text-xs font-bold text-[#F97316] hover:text-orange-600 flex items-center gap-1"
          >
            <Plus class="w-3 h-3" /> Log Payment
          </button>
        </div>
        
        <div v-if="event.payments.length === 0" class="text-center py-4 text-gray-400 text-sm bg-gray-50 rounded-xl">
          No payments recorded yet.
        </div>
        
        <div v-else class="space-y-3">
          <div 
            v-for="payment in displayedSettlements" 
            :key="payment.id"
            class="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center justify-between"
          >
            <div class="flex items-center gap-3 flex-1">
              <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700">
                <Handshake class="w-5 h-5" />
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-bold text-gray-900 text-sm">
                  {{ event.participants.find(p => p.id === payment.fromParticipantId)?.name }} 
                  paid 
                  {{ event.participants.find(p => p.id === payment.toParticipantId)?.name }}
                </h4>
                <p v-if="payment.note" class="text-xs text-gray-600">{{ payment.note }}</p>
                <p class="text-xs text-gray-400 mt-0.5">{{ formatTimestamp(payment.createdAt) }}</p>
              </div>
            </div>
            <div class="text-right">
              <p class="font-bold text-green-700 text-lg">{{ formatAmount(payment.amount) }}</p>
            </div>
          </div>
          
          <!-- Show More/Less Button -->
          <button 
            v-if="hasMoreSettlements"
            @click="showAllSettlements = !showAllSettlements"
            class="w-full py-3 text-sm font-semibold text-[#7B1D3A] hover:bg-[#7B1D3A]/5 rounded-xl transition-colors"
          >
            {{ showAllSettlements ? 'Show Less' : `Show ${event.payments.length - 3} More` }}
          </button>
        </div>
      </div>

    </div>

    <!-- Bottom Action Bar -->
    <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
      <div class="max-w-md mx-auto flex gap-3">
        <button 
          @click="isAddExpenseOpen = true"
          class="flex-1 py-3 bg-[#F97316] text-white font-bold rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
        >
          <Plus class="w-5 h-5" />
          Add Expense
        </button>
        <button 
          @click="handleSettleUp"
          class="flex-1 py-3 bg-[#7B1D3A] text-white font-bold rounded-xl hover:bg-[#5a152a] transition-colors"
        >
          Settle Up
        </button>
      </div>
    </div>

    <!-- Add the Modal at the very bottom of the template -->
    <AddExpenseModal 
      v-if="isAddExpenseOpen" 
      :event="event" 
      @close="isAddExpenseOpen = false" 
    />

    <!-- Log Payment Modal -->
    <LogPaymentModal 
      v-if="isLogPaymentOpen" 
      :event="event" 
      @close="isLogPaymentOpen = false" 
    />

        <!-- Add/Edit Expense Modal -->
    <AddExpenseModal 
      v-if="isAddExpenseOpen" 
      :event="event"
      :expense="editingExpense"
      @close="closeAddExpenseModal" 
    />

  </div>
</template>