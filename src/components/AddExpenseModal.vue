<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '../stores/app'
import type { Event, Expense, ExpenseSplit } from '../types'
import { X, Check, Camera, Upload, Loader2 } from 'lucide-vue-next'
import { extractTextFromImage } from '../utils/ocr'
import type { ExtractedItem } from '../utils/ocr'
import { Plus, Trash2 } from 'lucide-vue-next'

// Computed totals (reactive to edits)
const calculatedSubtotal = computed(() => {
  return parsedItems.value.reduce((sum, item) => sum + (item.price || 0), 0)
})

const calculatedTotal = computed(() => {
  return calculatedSubtotal.value + extractedTax.value
})

function addItem() {
  parsedItems.value.push({
    name: 'New Item',
    quantity: 1,
    price: 0,
    originalLine: ''
  })
  // Initialize assignment for new item
  const newIndex = parsedItems.value.length - 1
  itemAssignments.value[newIndex] = props.event.participants.map(p => p.id)
}

function deleteItem(index: number) {
  parsedItems.value.splice(index, 1)
  // Clean up assignments
  delete itemAssignments.value[index]
  // Re-index assignments
  const newAssignments: Record<number, string[]> = {}
  Object.keys(itemAssignments.value).forEach(key => {
    const numKey = parseInt(key)
    if (numKey > index) {
      newAssignments[numKey - 1] = itemAssignments.value[numKey]
    } else if (numKey < index) {
      newAssignments[numKey] = itemAssignments.value[numKey]
    }
  })
  itemAssignments.value = newAssignments
}

const props = defineProps<{ event: Event, expense?: Expense }>()
const emit = defineEmits(['close'])

const appStore = useAppStore()

// UI State
const entryMode = ref<'manual' | 'scan'>('manual')
const uploadedImage = ref<string | null>(null)
const uploadedFile = ref<File | null>(null)
const isProcessing = ref(false)
const ocrRawText = ref('')

// Form State
const title = ref(props.expense?.title || '')
const amount = ref(props.expense?.totalAmount || 0)
const payerId = ref(props.expense?.payerId || props.event.participants[0]?.id || '')
const splitType = ref<'equal' | 'custom'>('equal')
const includedIds = ref<string[]>(
  props.expense?.splits.map(s => s.participantId) || props.event.participants.map(p => p.id)
)

const parsedItems = ref<ExtractedItem[]>([])
const extractedTotal = ref(0)
const extractedSubtotal = ref(0)
const extractedTax = ref(0)
const showItemAssignment = ref(false)
const itemAssignments = ref<Record<number, string[]>>({}) // item index -> participant IDs

// Initialize custom amounts for editing
if (props.expense && props.expense.splits.length > 0) {
  const amounts = props.expense.splits.map(s => s.amount)
  const isCustom = amounts.some((amt, _, arr) => amt !== arr[0])
  if (isCustom) {
    splitType.value = 'custom'
    props.expense.splits.forEach(split => {
      const participant = props.event.participants.find(p => p.id === split.participantId)
      if (participant) participant.customAmount = split.amount
    })
  }
}

const currencySymbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', IDR: 'Rp' }
const symbol = currencySymbols[props.event.currency] || props.event.currency

const equalSplitAmount = computed(() => {
  if (includedIds.value.length === 0 || amount.value === 0) return 0
  return amount.value / includedIds.value.length
})

const customSplitTotal = computed(() => {
  return props.event.participants.reduce((sum, p) => sum + (p.customAmount || 0), 0)
})

function toggleParticipant(id: string) {
  if (includedIds.value.includes(id)) {
    includedIds.value = includedIds.value.filter(pid => pid !== id)
  } else {
    includedIds.value.push(id)
  }
}

// --- OCR & Upload Logic ---

function handleFileSelect(event: any) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  uploadedFile.value = file
  const reader = new FileReader()
  reader.onload = (e: any) => {
    uploadedImage.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

async function processImage() {
  if (!uploadedFile.value) return
  
  isProcessing.value = true
  try {
    const text = await extractTextFromImage(uploadedFile.value)
    ocrRawText.value = text
    
    // Import and use the parser
    const { parseReceiptText } = await import('../utils/ocr')
    const parsed = parseReceiptText(text)
    
    console.log('PARSED RECEIPT:', parsed)
    
    // Store parsed data
    parsedItems.value = parsed.items
    extractedTotal.value = parsed.total
    extractedSubtotal.value = parsed.subtotal
    extractedTax.value = parsed.tax
    
    // Auto-fill title and amount
    if (parsed.merchant) {
      title.value = parsed.merchant
    }
    if (parsed.total > 0) {
      amount.value = parsed.total
    }
    
    // Initialize assignments - assign all items to all participants by default
    itemAssignments.value = {} // Reset first
    parsed.items.forEach((_, index) => {
        itemAssignments.value[index] = props.event.participants.map(p => p.id)
    })
    
    // Show the item assignment UI
    showItemAssignment.value = true
    
  } catch (error) {
    console.error('OCR Failed:', error)
    alert('Failed to process image. Please try a clearer photo.')
  } finally {
    isProcessing.value = false
  }
}

function resetImage() {
  uploadedImage.value = null
  uploadedFile.value = null
  ocrRawText.value = ''
}

function toggleItemAssignment(itemIndex: number, participantId: string) {
  const currentAssignments = itemAssignments.value[itemIndex] || []
  
  // Create a new array to trigger reactivity
  let newAssignments: string[]
  if (currentAssignments.includes(participantId)) {
    // Remove participant
    newAssignments = currentAssignments.filter(id => id !== participantId)
  } else {
    // Add participant
    newAssignments = [...currentAssignments, participantId]
  }
  
  // Update the ref properly
  itemAssignments.value = {
    ...itemAssignments.value,
    [itemIndex]: newAssignments
  }
  
  console.log(`Item ${itemIndex} assignments:`, newAssignments)
}

function saveExpenseWithItems() {
  // Filter out items with no name or price
  const validItems = parsedItems.value.filter(item => item.name.trim() && item.price > 0)
  
  if (validItems.length === 0) {
    alert('Please add at least one item with a name and price')
    return
  }
  
  // Calculate each person's total from assigned items
  const participantTotals: Record<string, number> = {}
  props.event.participants.forEach(p => participantTotals[p.id] = 0)
  
  // Sum up item prices for each participant
  parsedItems.value.forEach((item, index) => {
    const assignedParticipants = itemAssignments.value[index] || []
    if (assignedParticipants.length === 0) return
    
    const pricePerPerson = item.price / assignedParticipants.length
    
    assignedParticipants.forEach(participantId => {
      participantTotals[participantId] += pricePerPerson
    })
  })
  
  // Calculate proportional tax based on edited subtotal
  const taxRate = calculatedSubtotal.value > 0 ? extractedTax.value / calculatedSubtotal.value : 0
  
  const splits: ExpenseSplit[] = []
  
  Object.entries(participantTotals).forEach(([participantId, itemTotal]) => {
    if (itemTotal > 0) {
      const taxAmount = itemTotal * taxRate
      const totalWithTax = itemTotal + taxAmount
      
      splits.push({
        participantId,
        amount: totalWithTax
      })
    }
  })
  
  // Create the expense
  const expenseData: Expense = {
    id: crypto.randomUUID(),
    eventId: props.event.id,
    title: title.value || validItems[0].name || 'Receipt Scan',
    totalAmount: calculatedTotal.value,
    payerId: payerId.value,
    splits: splits,
    createdAt: Date.now()
  }

  appStore.addExpense(props.event.id, expenseData)
  emit('close')
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
    appStore.updateExpense(props.event.id, expenseData)
  } else {
    appStore.addExpense(props.event.id, expenseData)
  }
  
  emit('close')
}
</script>

<template>
  <!-- Backdrop -->
  <div class="fixed inset-0 bg-black/50 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4" @click.self="emit('close')">
    
    <!-- Modal Content -->
    <div class="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[95vh] overflow-y-auto flex flex-col">
      
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center rounded-t-2xl z-10">
        <h2 class="text-xl font-bold text-[#7B1D3A]">{{ expense ? 'Edit Expense' : 'Add Expense' }}</h2>
        <button @click="emit('close')" class="p-2 hover:bg-gray-100 rounded-full">
          <X class="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <!-- Mode Toggle -->
      <div v-if="!expense" class="p-4 pb-0">
        <div class="flex bg-gray-100 p-1 rounded-xl">
          <button 
            @click="entryMode = 'manual'"
            :class="entryMode === 'manual' ? 'bg-white text-[#7B1D3A] shadow-sm' : 'text-gray-500'"
            class="flex-1 py-2 rounded-lg font-semibold text-sm transition-all"
          >
            ⌨️ Manual Entry
          </button>
          <button 
            @click="entryMode = 'scan'"
            :class="entryMode === 'scan' ? 'bg-white text-[#7B1D3A] shadow-sm' : 'text-gray-500'"
            class="flex-1 py-2 rounded-lg font-semibold text-sm transition-all"
          >
             Scan Receipt
          </button>
        </div>
      </div>

      <!-- Body (Scrollable) -->
      <div class="p-4 flex-1">
        
        <!-- MANUAL ENTRY FORM -->
        <div v-if="entryMode === 'manual'" class="space-y-6">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">What's this for?</label>
            <input v-model="title" type="text" placeholder="e.g., Dinner, Cafe, Uber" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7B1D3A]/20 focus:border-[#7B1D3A]" />
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Total Amount</label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">{{ symbol }}</span>
              <input v-model.number="amount" type="number" min="0" step="0.01" placeholder="0" class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7B1D3A]/20 focus:border-[#7B1D3A] text-lg font-bold" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Paid by</label>
            <div class="flex gap-3 overflow-x-auto pb-2">
              <button v-for="p in event.participants" :key="p.id" @click="payerId = p.id" class="flex flex-col items-center gap-1 min-w-[60px]">
                <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-sm transition-all relative" :class="payerId === p.id ? 'ring-2 ring-offset-2 ring-[#F97316] scale-105' : 'opacity-60'" :style="{ backgroundColor: p.color }">
                  {{ p.name.charAt(0).toUpperCase() }}
                  <Check v-if="payerId === p.id" class="w-4 h-4 absolute text-white bg-[#F97316] rounded-full p-0.5 -top-1 -right-1" />
                </div>
                <span class="text-xs font-medium text-gray-700 truncate w-full text-center">{{ p.name }}</span>
              </button>
            </div>
          </div>

          <div class="flex bg-gray-100 p-1 rounded-xl">
            <button @click="splitType = 'equal'" :class="splitType === 'equal' ? 'bg-white text-[#7B1D3A] shadow-sm' : 'text-gray-500'" class="flex-1 py-2 rounded-lg font-semibold text-sm transition-all">Equal Split</button>
            <button @click="splitType = 'custom'" :class="splitType === 'custom' ? 'bg-white text-[#7B1D3A] shadow-sm' : 'text-gray-500'" class="flex-1 py-2 rounded-lg font-semibold text-sm transition-all">Custom Amounts</button>
          </div>

          <div>
            <div v-if="splitType === 'equal'" class="space-y-3">
              <div class="flex flex-wrap gap-2">
                <button v-for="p in event.participants" :key="p.id" @click="toggleParticipant(p.id)" :class="includedIds.includes(p.id) ? 'opacity-100' : 'opacity-40 grayscale'" class="flex flex-col items-center gap-1">
                  <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-sm border-2 border-transparent transition-all" :style="{ backgroundColor: p.color, borderColor: includedIds.includes(p.id) ? '#7B1D3A' : 'transparent' }">{{ p.name.charAt(0).toUpperCase() }}</div>
                  <span class="text-xs font-medium text-gray-700">{{ p.name }}</span>
                </button>
              </div>
              <p class="text-center text-sm text-gray-500 mt-4">Split between {{ includedIds.length }} people <span v-if="amount > 0" class="font-bold text-[#7B1D3A]">({{ symbol }}{{ equalSplitAmount.toFixed(2) }} each)</span></p>
            </div>

            <div v-if="splitType === 'custom'" class="space-y-3">
              <div v-for="p in event.participants" :key="p.id" class="flex items-center justify-between bg-gray-50 p-3 rounded-xl">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" :style="{ backgroundColor: p.color }">{{ p.name.charAt(0).toUpperCase() }}</div>
                  <span class="font-medium text-gray-800">{{ p.name }}</span>
                </div>
                <div class="relative w-32">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{{ symbol }}</span>
                  <input v-model.number="p.customAmount" type="number" min="0" step="0.01" class="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-right focus:outline-none focus:ring-1 focus:ring-[#7B1D3A]" />
                </div>
              </div>
              <div class="flex justify-between items-center pt-2 border-t border-gray-200">
                <span class="text-sm font-semibold text-gray-600">Total Custom:</span>
                <span class="font-bold" :class="Math.abs(customSplitTotal - amount) < 0.01 ? 'text-green-600' : 'text-red-500'">{{ symbol }}{{ customSplitTotal.toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- SCAN RECEIPT FORM -->
        <div v-else class="space-y-6">
          
          <!-- Upload State -->
          <div v-if="!uploadedImage" class="space-y-4 py-8">
            <p class="text-center text-gray-500 text-sm">Take a clear photo of your receipt or upload one from your gallery.</p>
            
            <div class="flex flex-col gap-3">
              <!-- Camera Button -->
              <label class="w-full flex items-center justify-center gap-3 py-4 bg-[#7B1D3A] text-white font-bold rounded-xl hover:bg-[#5a152a] transition-colors cursor-pointer shadow-md">
                <Camera class="w-5 h-5" />
                Take Photo
                <input type="file" accept="image/*" capture="environment" @change="handleFileSelect" class="hidden" />
              </label>
              
              <!-- Gallery Button -->
              <label class="w-full flex items-center justify-center gap-3 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer">
                <Upload class="w-5 h-5" />
                Upload from Gallery
                <input type="file" accept="image/*" @change="handleFileSelect" class="hidden" />
              </label>
            </div>
          </div>

          <!-- Preview & Process State -->
          <div v-else class="space-y-4">
            <div class="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              <img :src="uploadedImage" alt="Receipt Preview" class="w-full h-64 object-contain" />
              <button @click="resetImage" class="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70">
                <X class="w-4 h-4" />
              </button>
            </div>

            <button 
              @click="processImage" 
              :disabled="isProcessing"
              class="w-full py-4 bg-[#F97316] text-white font-bold text-lg rounded-xl hover:bg-orange-600 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Loader2 v-if="isProcessing" class="w-5 h-5 animate-spin" />
              {{ isProcessing ? 'Processing...' : 'Extract Text' }}
            </button>

            <!-- Raw Text Preview (For debugging Step 2) -->
            <!-- <div v-if="ocrRawText" class="bg-gray-50 p-3 rounded-xl border border-gray-200">
              <p class="text-xs font-bold text-gray-500 mb-1">EXTRACTED TEXT:</p>
              <pre class="text-xs text-gray-700 whitespace-pre-wrap font-mono">{{ ocrRawText }}</pre>
            </div> -->

            <!-- Item Assignment UI (shown after extraction) -->
            <!-- Item Assignment UI (shown after extraction) -->
<div v-if="showItemAssignment && parsedItems.length > 0" class="space-y-4 border-t border-gray-200 pt-4">
  <div class="flex justify-between items-center">
    <h3 class="font-bold text-gray-900 text-lg">Assign Items:</h3>
    <button 
      @click="addItem"
      class="text-sm font-semibold text-[#F97316] hover:text-orange-600 flex items-center gap-1"
    >
      <Plus class="w-4 h-4" /> Add Item
    </button>
  </div>
  <p class="text-sm text-gray-500">Tap to edit names/prices, tap participants to assign</p>
        <!-- Paid By Selector -->
      <div class="space-y-2 bg-orange-50 p-3 rounded-xl border border-orange-100">
        <label class="block text-sm font-bold text-gray-700">Who paid for this?</label>
        <div class="flex gap-3 overflow-x-auto pb-1">
          <button 
            v-for="p in event.participants" 
            :key="p.id"
            @click="payerId = p.id"
            class="flex flex-col items-center gap-1 min-w-[60px]"
          >
            <div 
              class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-sm transition-all relative"
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
  
  <div class="space-y-3">
    <div 
      v-for="(item, index) in parsedItems" 
      :key="index"
      class="bg-gray-50 p-3 rounded-xl border border-gray-200"
    >
      <div class="flex justify-between items-start mb-2 gap-2">
        <!-- Editable Item Name -->
        <input 
          v-model="item.name"
          type="text"
          class="flex-1 font-semibold text-gray-900 text-sm bg-transparent border-b border-gray-300 focus:border-[#7B1D3A] focus:outline-none pb-1"
          placeholder="Item name"
        />
        <!-- Editable Price -->
        <div class="relative w-32">
          <span class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">{{ symbol }}</span>
          <input 
            v-model.number="item.price"
            type="number"
            min="0"
            step="100"
            class="w-full pl-8 pr-2 py-1 font-bold text-[#7B1D3A] text-sm bg-transparent border-b border-gray-300 focus:border-[#7B1D3A] focus:outline-none text-right"
          />
        </div>
        <!-- Delete Button -->
        <button 
          @click="deleteItem(index)"
          class="p-1 text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
      
      <p class="text-xs text-gray-500 mb-2">Qty: {{ item.quantity }}</p>
      
      <!-- Participant Assignment Chips -->
      <div class="flex flex-wrap gap-2">
        <button
          v-for="participant in event.participants"
          :key="participant.id"
          @click="toggleItemAssignment(index, participant.id)"
          :class="[
            'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
            (itemAssignments[index] || []).includes(participant.id)
              ? 'bg-[#7B1D3A] text-white shadow-sm'
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          ]"
        >
          {{ participant.name }}
        </button>
      </div>
    </div>
  </div>
  
  <!-- Summary (now reactive) -->
  <div class="bg-gray-100 p-4 rounded-xl space-y-2 text-sm">
    <div class="flex justify-between text-gray-600">
      <span>Items Total:</span>
      <span>{{ symbol }}{{ calculatedSubtotal.toLocaleString('id-ID') }}</span>
    </div>
    <div class="flex justify-between text-gray-600">
      <span>Tax (auto):</span>
      <span>{{ symbol }}{{ extractedTax.toLocaleString('id-ID') }}</span>
    </div>
    <div class="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-300">
      <span>Grand Total:</span>
      <span>{{ symbol }}{{ calculatedTotal.toLocaleString('id-ID') }}</span>
    </div>
  </div>
  
  <button 
    @click="saveExpenseWithItems"
    class="w-full py-4 bg-[#F97316] text-white font-bold text-lg rounded-xl hover:bg-orange-600 transition-colors shadow-lg"
  >
    Confirm & Save Expense
  </button>
</div>

          </div>
        </div>

      </div>

      <!-- Footer (Only show for Manual Mode or if we have a parsed amount) -->
      <div v-if="entryMode === 'manual'" class="sticky bottom-0 bg-white border-t border-gray-100 p-4 rounded-b-2xl">
        <button @click="saveExpense" class="w-full py-4 bg-[#F97316] text-white font-bold text-lg rounded-xl hover:bg-orange-600 transition-colors shadow-lg">
          {{ expense ? 'Update Expense' : 'Save Expense' }}
        </button>
      </div>
    </div>
  </div>
</template>