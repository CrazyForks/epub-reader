<template>
  <div id="app" :class="{ 'dark-theme': isDarkTheme }">
    <router-view />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()
const isDarkTheme = computed(() => settingsStore.theme === 'dark')
</script>

<style lang="scss">
#app {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  transition: all 0.3s ease;
}

.dark-theme {
  background-color: #1a1a1a;
  color: #e0e0e0;
}
</style> 