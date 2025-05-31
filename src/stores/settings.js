import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // 状态
  const fontSize = ref(16)
  const theme = ref('light')
  const speechRate = ref(1)
  const speechVoice = ref('')
  const autoSave = ref(true)

  // 字体大小范围
  const minFontSize = 8
  const maxFontSize = 24

  // 动作
  const increaseFontSize = () => {
    if (fontSize.value < maxFontSize) {
      fontSize.value += 2
      saveSettings()
    }
  }

  const decreaseFontSize = () => {
    if (fontSize.value > minFontSize) {
      fontSize.value -= 2
      saveSettings()
    }
  }

  const setFontSize = (size) => {
    if (size >= minFontSize && size <= maxFontSize) {
      fontSize.value = size
      saveSettings()
    }
  }

  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    saveSettings()
  }

  const setSpeechRate = (rate) => {
    speechRate.value = Math.max(0.1, Math.min(2, rate))
    saveSettings()
  }

  const setSpeechVoice = (voice) => {
    speechVoice.value = voice
    saveSettings()
  }

  // 保存设置到localStorage
  const saveSettings = () => {
    if (autoSave.value) {
      const settings = {
        fontSize: fontSize.value,
        theme: theme.value,
        speechRate: speechRate.value,
        speechVoice: speechVoice.value,
        autoSave: autoSave.value
      }
      localStorage.setItem('epub-reader-settings', JSON.stringify(settings))
    }
  }

  // 从localStorage加载设置
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('epub-reader-settings')
      if (saved) {
        const settings = JSON.parse(saved)
        fontSize.value = settings.fontSize || 16
        theme.value = settings.theme || 'light'
        speechRate.value = settings.speechRate || 1
        speechVoice.value = settings.speechVoice || ''
        autoSave.value = settings.autoSave !== false
      }
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  }

  // 重置设置
  const resetSettings = () => {
    fontSize.value = 16
    theme.value = 'light'
    speechRate.value = 1
    speechVoice.value = ''
    autoSave.value = true
    saveSettings()
  }

  return {
    // 状态
    fontSize,
    theme,
    speechRate,
    speechVoice,
    autoSave,
    minFontSize,
    maxFontSize,
    // 动作
    increaseFontSize,
    decreaseFontSize,
    setFontSize,
    toggleTheme,
    setSpeechRate,
    setSpeechVoice,
    saveSettings,
    loadSettings,
    resetSettings
  }
}) 