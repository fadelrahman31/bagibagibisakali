<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '../stores/app'
import type { Participant, Event } from '../types'
import { X, UserPlus, Trash2 } from 'lucide-vue-next'

const appStore = useAppStore()
const emit = defineEmits(['close'])

// Form State
const title = ref('')
const date = ref(new Date().toISOString().split('T')[0])
const currency = ref('USD')
const newParticipantName = ref('')

// Available currencies
const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'IDR']

// Participant State
const participants = ref<Participant[]>([])
const colorPalette = ['#7B1D3A', '#F97316', '#EC4899', '#8B5CF6', '#14B8A6', '#3B82F6', '#EAB308']

function addParticipant() {
  const name = newParticipantName.value.trim()
  if (!name) return
  
  // Check for duplicates
  if (participants.value.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    alert('Participant already exists!')
    return
  }

  participants.value.push({
    id: crypto.randomUUID(),
    name: name,
    color: colorPalette[participants.value.length % colorPalette.length]
  })
  
  newParticipantName.value = ''
}

function removeParticipant(id: string) {
  participants.value = participants.value.filter(p => p.id !== id)
}

function createEvent() {
  if (!title.value.trim()) {
    alert('Please enter an event name')
    return
  }
  if (participants.value.length < 2) {
    alert('Please add at least 2 participants')
    return
  }

  const newEvent: Event = {
    id: crypto.randomUUID(),
    title: title.value.trim(),
    date: date.value,
    currency: currency.value,
    participants: participants.value,
    expenses: [],
    payments: []
  }

  appStore.addEvent(newEvent)
  emit('close')
}
</script>

<template>
  <!-- Backdrop -->
  <div class="fixed inset-0 bg-black/50 z-30 flex items-end sm:items-center justify-center p-0 sm:p-4" @click.self="emit('close')">
    
    <!-- Modal Content -->
    <div class="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
      
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center rounded-t-2xl">
        <h2 class="text-xl font-bold text-[#7B1D3A]">New Hangout</h2>
        <button @click="emit('close')" class="p-2 hover:bg-gray-100 rounded-full">
          <X class="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-4 space-y-6">
        
        <!-- Event Name -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Event Name</label>
          <input 
            v-model="title" 
            type="text" 
            placeholder="e.g., Saturday Cafe Crawl"
            class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7B1D3A]/20 focus:border-[#7B1D3A] transition-all"
          />
        </div>

        <!-- Date -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Date</label>
          <input 
            v-model="date" 
            type="date" 
            class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7B1D3A]/20 focus:border-[#7B1D3A] transition-all"
          />
        </div>

        <!-- Currency Selector -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Currency</label>
          <div class="flex gap-2 overflow-x-auto pb-2">
            <button 
              v-for="curr in currencies" 
              :key="curr"
              @click="currency = curr"
              :class="[
                'px-4 py-2 rounded-full font-semibold transition-all whitespace-nowrap',
                currency === curr 
                  ? 'bg-[#7B1D3A] text-white shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              ]"
            >
              {{ curr }}
            </button>
          </div>
        </div>

        <!-- Participant Manager -->
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Participants</label>
          
          <!-- Add Input -->
          <div class="flex gap-2 mb-4">
            <input 
              v-model="newParticipantName" 
              @keyup.enter="addParticipant"
              type="text" 
              placeholder="Add participant name"
              class="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7B1D3A]/20 focus:border-[#7B1D3A] transition-all"
            />
            <button 
              @click="addParticipant"
              class="px-4 py-3 bg-[#7B1D3A] text-white rounded-xl hover:bg-[#5a152a] transition-colors"
            >
              <UserPlus class="w-5 h-5" />
            </button>
          </div>

          <!-- Participant List -->
          <div class="flex flex-wrap gap-3">
            <div 
              v-for="p in participants" 
              :key="p.id"
              class="flex flex-col items-center gap-1 group"
            >
              <div class="relative">
                <div 
                  class="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm"
                  :style="{ backgroundColor: p.color }"
                >
                  {{ p.name.charAt(0).toUpperCase() }}
                </div>
                <button 
                  @click="removeParticipant(p.id)"
                  class="absolute -top-1 -right-1 bg-white text-red-500 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                >
                  <Trash2 class="w-3 h-3" />
                </button>
              </div>
              <span class="text-xs font-medium text-gray-700">{{ p.name }}</span>
            </div>
            
            <!-- Empty State -->
            <div v-if="participants.length === 0" class="w-full text-center py-4 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
              Add at least 2 people to start
            </div>
          </div>
        </div>
      </div>

      <!-- Footer / CTA -->
      <div class="sticky bottom-0 bg-white border-t border-gray-100 p-4 rounded-b-2xl">
        <button 
          @click="createEvent"
          class="w-full py-4 bg-[#7B1D3A] text-white font-bold text-lg rounded-xl hover:bg-[#5a152a] transition-colors shadow-lg"
        >
          Create Event
        </button>
      </div>
    </div>
  </div>
</template>