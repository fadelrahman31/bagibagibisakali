import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Event , Expense, Payment} from '../types'

export const useAppStore = defineStore('app', () => {
  // Load from localStorage or initialize empty
  const stored = localStorage.getItem('bagibagi_events')
  const events = ref<Event[]>(stored ? JSON.parse(stored) : [])

  // Save to localStorage whenever events change
  function saveEvents() {
    localStorage.setItem('bagibagi_events', JSON.stringify(events.value))
  }

  // Watch for changes and auto-save
  watch(events, () => {
    saveEvents()
  }, { deep: true })

  // Computed: Group events by currency
  const eventsByCurrency = computed(() => {
    const grouped: { [key: string]: Event[] } = {}
    events.value.forEach(event => {
      if (!grouped[event.currency]) {
        grouped[event.currency] = []
      }
      grouped[event.currency].push(event)
    })
    return grouped
  })

  // Actions
  function addEvent(event: Event) {
    events.value.push(event)
    // saveEvents() is called automatically by the watcher
  }

  function deleteEvent(eventId: string) {
    events.value = events.value.filter(e => e.id !== eventId)
  }

  function updateEvent(updatedEvent: Event) {
    const index = events.value.findIndex(e => e.id === updatedEvent.id)
    if (index !== -1) {
      events.value[index] = updatedEvent
    }
  }

  // Function to add Expense inside the EventView.vuew
  function addExpense(eventId: string, expense: Expense) {
    const eventIndex = events.value.findIndex(e => e.id === eventId)
    if (eventIndex !== -1) {
      events.value[eventIndex].expenses.push(expense)
      // The watcher will automatically save to localStorage
    }
  }

  // Function to add Payment
  function addPayment(eventId: string, payment: Payment) {
    const eventIndex = events.value.findIndex(e => e.id === eventId)
    if (eventIndex !== -1) {
      events.value[eventIndex].payments.push(payment)
    }
  }

  // Function to Update Expense inside the EventView.vue
    function updateExpense(eventId: string, updatedExpense: Expense) {
    const eventIndex = events.value.findIndex(e => e.id === eventId)
    if (eventIndex !== -1) {
      const expenseIndex = events.value[eventIndex].expenses.findIndex(e => e.id === updatedExpense.id)
      if (expenseIndex !== -1) {
        events.value[eventIndex].expenses[expenseIndex] = updatedExpense
      }
    }
  }

  return {
    events,
    eventsByCurrency,
    addEvent,
    deleteEvent,
    updateEvent,
    addExpense,
    addPayment,
    updateExpense
  }

})