<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <main class="flex-1">
      <RouterView />
    </main>
    
    <!-- Footer Credit -->
    <footer class="py-4 text-center text-xs text-gray-400 border-t border-gray-100 bg-white">
      <p>
        Made with <span class="text-red-400">♥</span> by 
        <a 
          href="https://github.com/fadelrahman31" 
          target="_blank" 
          rel="noopener noreferrer"
          class="text-[#7B1D3A] font-semibold hover:text-[#5a152a] transition-colors"
        >
          @fadelrahman31
        </a>
      </p>
    </footer>
  </div>
</template>

<style scoped>
</style>