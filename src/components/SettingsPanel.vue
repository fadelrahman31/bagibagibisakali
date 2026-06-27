<script setup lang="ts">
import { X, Download, Upload, Trash2 } from 'lucide-vue-next'

const emit = defineEmits(['close'])

function exportData() {
  const data = localStorage.getItem('bagibagi_events') || '[]'
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bagibagi-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function importData(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string)
      localStorage.setItem('bagibagi_events', JSON.stringify(data))
      window.location.reload()
    } catch (error) {
      alert('Invalid file format')
    }
  }
  reader.readAsText(file)
}

function clearAllData() {
  if (confirm('⚠️ Are you sure? This will delete ALL events and cannot be undone!')) {
    localStorage.removeItem('bagibagi_events')
    window.location.reload()
  }
}
</script>

<template>
  <!-- Backdrop -->
  <div class="fixed inset-0 bg-black/50 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4" @click.self="emit('close')">
    
    <!-- Modal Content -->
    <div class="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-y-auto">
      
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center rounded-t-2xl">
        <h2 class="text-xl font-bold text-[#7B1D3A]">Settings</h2>
        <button @click="emit('close')" class="p-2 hover:bg-gray-100 rounded-full">
          <X class="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-4 space-y-6">
        
        <!-- Data Management -->
        <div>
          <h3 class="text-sm font-bold text-[#7B1D3A] uppercase tracking-wide mb-3">Data Management</h3>
          <div class="flex gap-3">
            <button 
              @click="exportData"
              class="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#7B1D3A] text-white rounded-xl hover:bg-[#5a152a] transition-colors"
            >
              <Download class="w-4 h-4" />
              <span class="font-medium">Export Data</span>
            </button>
            <label class="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#7B1D3A] text-white rounded-xl hover:bg-[#5a152a] transition-colors cursor-pointer">
              <Upload class="w-4 h-4" />
              <span class="font-medium">Import Data</span>
              <input 
                type="file" 
                accept=".json" 
                @change="importData"
                class="hidden"
              />
            </label>
          </div>
          <p class="text-xs text-gray-500 mt-2">Backup or restore your data</p>
        </div>

        <!-- Danger Zone -->
        <div>
          <h3 class="text-sm font-bold text-red-600 uppercase tracking-wide mb-3">Danger Zone</h3>
          <button 
            @click="clearAllData"
            class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
          >
            <Trash2 class="w-4 h-4" />
            <span class="font-medium">Clear All Data</span>
          </button>
          <p class="text-xs text-gray-500 mt-2">This will delete all events and cannot be undone</p>
        </div>

        <!-- About -->
        <div>
          <h3 class="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">About</h3>
          <div class="bg-gray-50 rounded-xl p-4">
            <p class="text-sm font-semibold text-gray-900">BagiBagiBisaKali</p>
            <p class="text-xs text-gray-500 mt-1">v1.0.0</p>
            <p class="text-xs text-gray-500 mt-2">Split bills made simple</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>