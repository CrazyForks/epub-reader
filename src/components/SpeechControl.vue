<template>
  <div class="speech-control">
    <div class="speech-status" v-if="!isSupported">
      <el-alert
        title="语音功能不可用"
        :description="errorMessage"
        type="warning"
        :closable="false"
      />
      
      <!-- 重新检测按钮 -->
      <div class="reload-section">
        <el-button @click="reloadVoices" type="primary" size="small" :loading="isReloading">
          {{ isReloading ? '检测中...' : '重新检测语音' }}
        </el-button>
        <p class="reload-tip">如果语音功能突然不可用，请点击重新检测</p>
      </div>
      
      <!-- 移动端特殊提示 -->
      <div v-if="isMobile && suggestions.length > 0" class="mobile-suggestions">
        <h4>解决建议：</h4>
        <ul>
          <li v-for="(suggestion, index) in suggestions" :key="index">
            {{ suggestion }}
          </li>
        </ul>
      </div>
    </div>
    
    <div v-else class="speech-panel">
      <!-- 语音控制按钮 -->
      <div class="control-buttons">
        <el-button-group>
          <el-button
            @click="startSpeech"
            :disabled="!canSpeak"
            type="primary"
            :icon="CaretRight"
          >
            {{ isPlaying ? '朗读中' : '开始朗读' }}
          </el-button>
          
          <el-button
            @click="pauseResumeSpeech"
            :disabled="!isPlaying"
            :icon="isPaused ? CaretRight : Switch"
          >
            {{ isPaused ? '继续' : '暂停' }}
          </el-button>
          
          <el-button
            @click="stopSpeech"
            :disabled="!isPlaying"
            :icon="Close"
          >
            停止
          </el-button>
        </el-button-group>
      </div>
      
      <!-- 移动端警告信息 -->
      <div v-if="isMobile && fallbackMessage" class="mobile-warning">
        <el-alert
          :title="fallbackMessage"
          type="info"
          :closable="true"
          show-icon
        />
      </div>
      
      <!-- 华为设备特殊提示 -->
      <div v-if="isHuawei && needsActivation" class="huawei-activation-tip">
        <el-card class="activation-card" shadow="hover">
          <template #header>
            <div class="activation-header">
              <span class="activation-icon">🎯</span>
              <span>华为设备语音激活</span>
            </div>
          </template>
          <div class="activation-content">
            <p>华为设备的语音功能可能需要手动激活：</p>
            <el-button 
              type="primary" 
              @click="activateHuaweiSpeech"
              :loading="isActivating"
              class="activation-button"
            >
              {{ isActivating ? '正在激活...' : '点击激活语音功能' }}
            </el-button>
            <p class="activation-note">激活后请等待几秒钟，然后尝试使用语音朗读功能</p>
          </div>
        </el-card>
      </div>
      
      <!-- 语音设置 -->
      <div class="speech-settings">
        <!-- 语音选择 -->
        <el-form-item label="语音选择">
          <el-select
            v-model="selectedVoice"
            placeholder="选择语音"
            @change="handleVoiceChange"
            style="width: 100%"
          >
            <el-option
              v-for="voice in availableVoices"
              :key="voice.name"
              :label="`${voice.name} (${voice.lang})`"
              :value="voice.name"
            />
          </el-select>
        </el-form-item>
        
        <!-- 语速控制 -->
        <el-form-item label="语速">
          <div class="rate-control">
            <el-slider
              v-model="speechRate"
              :min="0.1"
              :max="2"
              :step="0.1"
              @change="handleRateChange"
              class="speech-slider"
            />
            <span class="rate-value">{{ speechRate.toFixed(1) }}x</span>
          </div>
        </el-form-item>
        
        <!-- 音量控制 -->
        <el-form-item label="音量">
          <div class="volume-control">
            <el-slider
              v-model="volume"
              :min="0"
              :max="1"
              :step="0.1"
              @change="handleVolumeChange"
              class="speech-slider"
            />
            <span class="volume-value">{{ Math.round(volume * 100) }}%</span>
          </div>
        </el-form-item>
        
        <!-- 朗读选项 -->
        <el-form-item label="朗读选项">
          <el-checkbox v-model="autoNextChapter">
            章节结束后自动朗读下一章
          </el-checkbox>
        </el-form-item>
      </div>
      
      <!-- 朗读状态 -->
      <div class="speech-status" v-if="isPlaying">
        <el-progress
          :percentage="progressPercentage"
          :status="isPaused ? 'warning' : 'success'"
        />
        <div class="status-text">
          <span v-if="isPaused">已暂停</span>
          <span v-else>正在朗读: {{ currentChapter?.title }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useEpubStore } from '@/stores/epub'
import { useSettingsStore } from '@/stores/settings'
import { speechManager } from '@/utils/speechSynthesis'
import { CaretRight, Switch, Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// 状态管理
const epubStore = useEpubStore()
const settingsStore = useSettingsStore()

// 响应式数据
const isSupported = ref(false)
const isPlaying = ref(false)
const isPaused = ref(false)
const availableVoices = ref([])
const selectedVoice = ref('')
const speechRate = ref(1)
const volume = ref(1)
const autoNextChapter = ref(false)
const progressPercentage = ref(0)
const errorMessage = ref('')
const isMobile = ref(false)
const suggestions = ref([])
const fallbackMessage = ref('')
const isReloading = ref(false)
const isHuawei = ref(false)
const needsActivation = ref(false)
const isActivating = ref(false)

// 计算属性
const currentBook = computed(() => epubStore.currentBook)
const currentChapter = computed(() => epubStore.currentChapter)
const currentChapterContent = computed(() => epubStore.currentChapterContent)
const hasNextChapter = computed(() => epubStore.hasNextChapter)

const canSpeak = computed(() => {
  return isSupported.value && currentChapterContent.value && !isPlaying.value && !isPaused.value
})

// 方法
const initSpeech = () => {
  console.log('初始化语音功能...')
  
  // 强制重新加载语音列表
  speechManager.forceReloadVoices()
  
  const status = speechManager.getStatus()
  console.log('语音状态:', status)
  
  isSupported.value = status.isSupported
  isMobile.value = speechManager.isMobile
  isHuawei.value = speechManager.isHuawei
  needsActivation.value = speechManager.isHuawei && !isSupported.value
  
  if (isSupported.value) {
    console.log('语音功能可用')
    // 加载可用语音
    loadVoices()
    
    // 设置事件回调
    speechManager.setEventCallbacks({
      onStart: handleSpeechStart,
      onEnd: handleSpeechEnd,
      onPause: handleSpeechPause,
      onResume: handleSpeechResume,
      onError: handleSpeechError
    })
    
    // 从设置中恢复语音参数
    speechRate.value = settingsStore.speechRate
    selectedVoice.value = settingsStore.speechVoice
    
    // 应用设置
    speechManager.setRate(speechRate.value)
    speechManager.setVolume(volume.value)
    if (selectedVoice.value) {
      speechManager.setVoice(selectedVoice.value)
    }
    
    // 检查移动端警告信息
    if (isMobile.value && speechManager.fallbackMessage) {
      fallbackMessage.value = speechManager.fallbackMessage
    }
    
    // 清除错误信息
    errorMessage.value = ''
    suggestions.value = []
    
  } else {
    console.log('语音功能不可用')
    errorMessage.value = speechManager.fallbackMessage || '您的浏览器不支持语音合成功能'
    
    if (speechManager.fallbackMode) {
      suggestions.value = speechManager.getFallbackSuggestions()
    }
    
    // 如果是因为语音列表为空，给出特定的建议
    if (status.voiceCount === 0) {
      errorMessage.value = '没有检测到可用的语音引擎'
      suggestions.value = [
        '请确保系统已安装语音合成引擎',
        '在Windows上，请检查"设置 > 时间和语言 > 语音"',
        '在macOS上，请检查"系统偏好设置 > 辅助功能 > 语音"',
        '尝试重启浏览器或刷新页面',
        '如果问题持续，请尝试使用Chrome或Edge浏览器'
      ]
    }
  }
}

const loadVoices = () => {
  const allVoices = speechManager.getVoices()
  
  // 只保留中文语音
  availableVoices.value = allVoices.filter(voice => {
    const lang = voice.lang.toLowerCase()
    const name = voice.name.toLowerCase()
    
    // 匹配中文相关的语言代码和名称
    return lang.includes('zh') || 
           lang.includes('chinese') ||
           name.includes('chinese') ||
           name.includes('中文') ||
           name.includes('普通话') ||
           name.includes('mandarin') ||
           name.includes('cantonese') ||
           name.includes('taiwan') ||
           name.includes('hong kong') ||
           name.includes('simplified') ||
           name.includes('traditional')
  })
  
  // 如果没有找到中文语音，显示警告
  if (availableVoices.value.length === 0) {
    ElMessage.warning('未找到中文语音，请检查系统语音设置')
    // 如果实在没有中文语音，至少显示一个默认语音
    if (allVoices.length > 0) {
      availableVoices.value = [allVoices[0]]
    }
  }
  
  // 如果没有选择语音，自动选择第一个中文语音
  if (!selectedVoice.value && availableVoices.value.length > 0) {
    selectedVoice.value = availableVoices.value[0].name
    speechManager.setVoice(selectedVoice.value)
  }
}

const startSpeech = () => {
  if (!currentChapterContent.value) {
    ElMessage.warning('没有可朗读的内容')
    return
  }
  
  const success = speechManager.speak(currentChapterContent.value)
  if (!success) {
    ElMessage.error('启动语音朗读失败')
  }
}

const pauseResumeSpeech = () => {
  if (isPaused.value) {
    speechManager.resume()
  } else {
    speechManager.pause()
  }
}

const stopSpeech = () => {
  speechManager.stop()
  // 立即重置UI状态
  isPlaying.value = false
  isPaused.value = false
  progressPercentage.value = 0
  
  // 短暂延迟后同步状态，确保完全停止
  setTimeout(() => {
    syncStatus()
  }, 300)
}

const handleVoiceChange = (voiceName) => {
  speechManager.setVoice(voiceName)
  settingsStore.setSpeechVoice(voiceName)
}

const handleRateChange = (rate) => {
  speechManager.setRate(rate)
  settingsStore.setSpeechRate(rate)
}

const handleVolumeChange = (vol) => {
  speechManager.setVolume(vol)
}

// 同步状态
const syncStatus = () => {
  const status = speechManager.getStatus()
  isPlaying.value = status.isPlaying
  isPaused.value = status.isPaused
}

// 语音事件处理
const handleSpeechStart = () => {
  isPlaying.value = true
  isPaused.value = false
  progressPercentage.value = 0
  ElMessage.success('开始朗读')
}

const handleSpeechEnd = async () => {
  isPlaying.value = false
  isPaused.value = false
  progressPercentage.value = 100
  
  // 只有在正常结束时才显示完成消息和自动下一章
  if (!speechManager.isStopping) {
    ElMessage.info('朗读完成')
    
    // 如果启用了自动下一章且有下一章
    if (autoNextChapter.value && hasNextChapter.value) {
      try {
        await epubStore.nextChapter()
        // 短暂延迟后开始朗读下一章
        setTimeout(() => {
          if (currentChapterContent.value) {
            startSpeech()
          }
        }, 1000)
      } catch (error) {
        ElMessage.error('切换到下一章失败')
      }
    }
  }
  
  // 确保状态同步
  setTimeout(() => {
    syncStatus()
  }, 100)
}

const handleSpeechPause = () => {
  isPaused.value = true
  ElMessage.info('朗读已暂停')
}

const handleSpeechResume = () => {
  isPaused.value = false
  ElMessage.info('继续朗读')
}

const handleSpeechError = (error) => {
  console.warn('语音合成错误:', error)
  
  if (error.type === 'fallback') {
    // 备用方案错误
    ElMessage({
      message: error.message,
      type: 'warning',
      duration: 5000
    })
    
    if (error.suggestions && error.suggestions.length > 0) {
      suggestions.value = error.suggestions
      
      // 显示详细的解决建议
      ElMessage({
        message: '请查看语音面板中的解决建议',
        type: 'info',
        duration: 3000
      })
    }
  } else {
    // 其他错误
    ElMessage.error('语音朗读出现错误，请重试')
  }
}

// 监听章节变化，停止当前朗读
watch(currentChapter, () => {
  if (isPlaying.value) {
    stopSpeech()
  }
  // 章节变化后同步状态
  setTimeout(() => {
    syncStatus()
  }, 100)
})

// 生命周期
onMounted(() => {
  initSpeech()
  
  // 监听语音列表变化
  if (window.speechSynthesis) {
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
  }
  
  // 初始状态同步
  setTimeout(() => {
    syncStatus()
  }, 500)
})

const reloadVoices = async () => {
  isReloading.value = true
  
  try {
    console.log('用户手动重新加载语音...')
    
    // 重置状态
    speechManager.fallbackMode = false
    speechManager.fallbackMessage = ''
    
    // 强制重新加载
    speechManager.forceReloadVoices()
    
    // 等待一段时间让语音加载
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 重新初始化
    initSpeech()
    
    // 再次检查状态
    const status = speechManager.getStatus()
    
    if (status.isSupported) {
      ElMessage.success('语音功能已恢复正常')
    } else {
      ElMessage.warning('仍然无法检测到语音引擎，请检查系统设置')
    }
    
  } catch (error) {
    console.error('重新加载语音失败:', error)
    ElMessage.error('重新加载失败，请刷新页面重试')
  } finally {
    isReloading.value = false
  }
}

// 激活华为语音功能
const activateHuaweiSpeech = async () => {
  isActivating.value = true
  
  try {
    console.log('手动激活华为设备语音功能...')
    
    // 创建一个用户手势触发的语音utterance
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance('语音功能正在激活')
      utterance.volume = 0.1
      utterance.rate = 2
      
      // 监听语音事件
      utterance.onstart = () => {
        console.log('华为语音引擎已激活')
      }
      
      utterance.onend = async () => {
        console.log('激活语音完成，重新检测语音列表...')
        
        // 等待一段时间让语音引擎完全激活
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 重新加载语音
        speechManager.forceReloadVoices()
        
        // 等待语音列表加载
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // 重新初始化
        initSpeech()
        
        // 检查是否成功
        const status = speechManager.getStatus()
        if (status.isSupported && status.voiceCount > 0) {
          ElMessage.success('华为设备语音功能已成功激活！')
          needsActivation.value = false
        } else {
          ElMessage.warning('语音激活可能需要更多时间，请稍后重试')
        }
      }
      
      utterance.onerror = (error) => {
        console.warn('华为语音激活出错:', error)
        ElMessage.warning('语音激活遇到问题，请检查设备语音设置')
      }
      
      // 播放激活语音
      window.speechSynthesis.speak(utterance)
      
      ElMessage.info('正在激活华为设备语音功能，请等待...')
      
    } else {
      ElMessage.error('设备不支持语音合成功能')
    }
    
  } catch (error) {
    console.error('激活华为语音失败:', error)
    ElMessage.error('语音激活失败，请检查设备设置')
  } finally {
    // 延迟重置激活状态
    setTimeout(() => {
      isActivating.value = false
    }, 3000)
  }
}
</script>

<style lang="scss" scoped>
.speech-control {
  padding: 16px;
  
  .dark-theme & {
    background-color: #1a1a1a;
    
    // Element Plus组件深色模式适配
    :deep(.el-alert) {
      background-color: #2d2d2d;
      border-color: #4c4d4f;
      color: #e0e0e0;
      
      &.el-alert--warning {
        background-color: #3d2b1f;
        border-color: #936d38;
        color: #e6c46a;
      }
      
      &.el-alert--info {
        background-color: #1f2e3d;
        border-color: #4a6583;
        color: #79bbff;
      }
    }
    
    :deep(.el-button) {
      &:not(.el-button--primary) {
        background-color: #2d2d2d;
        border-color: #4c4d4f;
        color: #e0e0e0;
        
        &:hover {
          background-color: #3a3a3a;
          border-color: #79bbff;
        }
        
        &:disabled {
          background-color: #1a1a1a;
          border-color: #2a2a2a;
          color: #666;
        }
      }
    }
    
    :deep(.el-card) {
      background-color: #2d2d2d;
      border-color: #4c4d4f;
      color: #e0e0e0;
      
      .el-card__header {
        background-color: #2a2a2a;
        border-bottom-color: #4c4d4f;
      }
    }
    
    :deep(.el-progress) {
      .el-progress__text {
        color: #e0e0e0;
      }
    }
  }
  
  .speech-panel {
    .control-buttons {
      margin-bottom: 16px;
      text-align: center;
    }
    
    .speech-settings {
      .el-form-item {
        margin-bottom: 12px;
        
        :deep(.el-form-item__label) {
          font-weight: 500;
          color: #303133;
          width: 80px;
          text-align: right;
          padding-right: 6px;
          font-size: 13px;
          
          .dark-theme & {
            color: #e0e0e0;
          }
        }
        
        :deep(.el-form-item__content) {
          margin-left: 90px;
        }
        
        // 深色模式下的Element Plus组件样式
        .dark-theme & {
          :deep(.el-select) {
            .el-input__wrapper {
              background-color: #2d2d2d;
              border-color: #4c4d4f;
              
              &:hover {
                border-color: #79bbff;
              }
              
              &.is-focus {
                border-color: #409eff;
              }
              
              .el-input__inner {
                color: #e0e0e0;
              }
            }
          }
          
          :deep(.el-slider) {
            .el-slider__runway {
              background-color: #4c4d4f;
            }
            
            .el-slider__bar {
              background-color: #409eff;
            }
            
            .el-slider__button {
              background-color: #409eff;
              border-color: #409eff;
            }
          }
          
          :deep(.el-checkbox) {
            .el-checkbox__input {
              .el-checkbox__inner {
                background-color: #2d2d2d;
                border-color: #4c4d4f;
                
                &:hover {
                  border-color: #79bbff;
                }
              }
              
              &.is-checked {
                .el-checkbox__inner {
                  background-color: #409eff;
                  border-color: #409eff;
                }
              }
            }
            
            .el-checkbox__label {
              color: #e0e0e0;
            }
          }
        }
      }
      
      .rate-control,
      .volume-control {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        
        .speech-slider {
          flex: 1;
          min-width: 150px;
          max-width: 250px;
          margin: 0 4px;
          
          :deep(.el-slider__runway) {
            height: 5px;
          }
          
          :deep(.el-slider__button) {
            width: 16px;
            height: 16px;
          }
        }
        
        .rate-value,
        .volume-value {
          min-width: 45px;
          text-align: center;
          font-size: 13px;
          color: #666;
          flex-shrink: 0;
          
          .dark-theme & {
            color: #999;
          }
        }
      }
    }
    
    .speech-status {
      margin-top: 20px;
      padding: 16px;
      background-color: #f8f9fa;
      border-radius: 6px;
      
      .dark-theme & {
        background-color: #2a2a2a;
      }
      
      .status-text {
        margin-top: 8px;
        text-align: center;
        font-size: 14px;
        color: #666;
        
        .dark-theme & {
          color: #999;
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .speech-control {
    padding: 12px;
    
    .speech-panel {
      .control-buttons {
        margin-bottom: 16px;
        
        .el-button-group {
          display: flex;
          flex-direction: column;
          width: 100%;
          gap: 8px;
          
          .el-button {
            margin: 0;
            min-height: 44px;
            font-size: 14px;
            border-radius: 6px;
            
            &:first-child {
              border-radius: 6px;
            }
            
            &:last-child {
              border-radius: 6px;
            }
          }
        }
      }
      
      .speech-settings {
        .el-form-item {
          margin-bottom: 20px;
          
          :deep(.el-form-item__label) {
            font-size: 14px;
            line-height: 1.4;
            margin-bottom: 8px;
          }
          
          :deep(.el-form-item__content) {
            line-height: 1.4;
          }
        }
        
        .el-select {
          width: 100%;
          
          :deep(.el-input__inner) {
            min-height: 44px;
            font-size: 14px;
          }
        }
        
        .rate-control,
        .volume-control {
          .speech-slider {
            min-width: 120px;
            
            :deep(.el-slider__runway) {
              height: 8px;
            }
            
            :deep(.el-slider__button) {
              width: 24px;
              height: 24px;
            }
          }
          
          .rate-value,
          .volume-value {
            min-width: 45px;
            font-size: 13px;
          }
        }
        
        .el-checkbox {
          :deep(.el-checkbox__label) {
            font-size: 14px;
            line-height: 1.4;
          }
          
          :deep(.el-checkbox__input) {
            .el-checkbox__inner {
              width: 18px;
              height: 18px;
            }
          }
        }
      }
      
      .speech-status {
        margin-top: 16px;
        padding: 12px;
        border-radius: 8px;
        
        :deep(.el-progress) {
          .el-progress__text {
            font-size: 12px;
          }
        }
        
        .status-text {
          margin-top: 6px;
          font-size: 13px;
          line-height: 1.4;
        }
      }
    }
  }
}

// 小屏幕优化
@media (max-width: 480px) {
  .speech-control {
    padding: 8px;
    
    .speech-panel {
      .control-buttons {
        .el-button-group {
          .el-button {
            min-height: 40px;
            font-size: 13px;
            padding: 8px 12px;
          }
        }
      }
      
      .speech-settings {
        .el-form-item {
          margin-bottom: 16px;
          
          :deep(.el-form-item__label) {
            font-size: 13px;
          }
        }
        
        .el-select {
          :deep(.el-input__inner) {
            min-height: 40px;
            font-size: 13px;
          }
        }
        
        .rate-control,
        .volume-control {
          .rate-value,
          .volume-value {
            min-width: 45px;
            font-size: 13px;
          }
        }
        
        .el-checkbox {
          :deep(.el-checkbox__label) {
            font-size: 13px;
          }
        }
      }
      
      .speech-status {
        padding: 10px;
        
        .status-text {
          font-size: 12px;
        }
      }
    }
  }
}

// 横屏模式优化（仅限移动设备）
@media (max-width: 768px) and (orientation: landscape) {
  .speech-control {
    .speech-panel {
      .control-buttons {
        .el-button-group {
          flex-direction: row;
          
          .el-button {
            flex: 1;
            min-height: 40px;
          }
        }
      }
      
      .speech-settings {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        
        .el-form-item {
          margin-bottom: 12px;
          
          :deep(.el-form-item__label) {
            width: auto;
            text-align: left;
            padding-right: 0;
          }
          
          :deep(.el-form-item__content) {
            margin-left: 0;
          }
        }
        
        .rate-control,
        .volume-control {
          .speech-slider {
            min-width: 100px;
            max-width: none;
          }
        }
      }
    }
  }
}

// 触摸设备优化
@media (hover: none) and (pointer: coarse) {
  .speech-control {
    .el-button:active {
      transform: scale(0.98);
      transition: transform 0.1s;
    }
    
    .el-slider {
      :deep(.el-slider__button) {
        width: 24px;
        height: 24px;
        
        &:active {
          transform: scale(1.2);
        }
      }
    }
  }
}

.reload-section {
  margin-top: 16px;
  text-align: center;
  
  .el-button {
    margin-bottom: 8px;
  }
  
  .reload-tip {
    margin: 0;
    font-size: 12px;
    color: #909399;
    line-height: 1.4;
  }
}

.mobile-suggestions {
  margin-top: 16px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid #409eff;
}

.mobile-suggestions h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #409eff;
}

.mobile-suggestions ul {
  margin: 0;
  padding-left: 20px;
}

.mobile-suggestions li {
  margin-bottom: 6px;
  font-size: 13px;
  line-height: 1.4;
  color: #606266;
}

.mobile-warning {
  margin-bottom: 16px;
}

.huawei-activation-tip {
  margin-bottom: 16px;
}

.activation-card {
  border: 2px solid #409eff;
  
  .dark-theme & {
    background-color: #2d2d2d;
    border-color: #409eff;
  }
}

.activation-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #409eff;
  
  .activation-icon {
    font-size: 18px;
  }
}

.activation-content {
  text-align: center;
  
  p {
    margin: 12px 0;
    color: #606266;
    
    .dark-theme & {
      color: #c0c4cc;
    }
  }
  
  .activation-button {
    margin: 16px 0;
    min-height: 44px;
    padding: 12px 24px;
    font-size: 16px;
    font-weight: 600;
  }
  
  .activation-note {
    font-size: 12px;
    color: #909399;
    line-height: 1.4;
    
    .dark-theme & {
      color: #909399;
    }
  }
}

/* 深色主题 */
.dark-theme .mobile-suggestions {
  background-color: #2d2d2d;
  border-left-color: #409eff;
}

.dark-theme .mobile-suggestions h4 {
  color: #79bbff;
}

.dark-theme .mobile-suggestions li {
  color: #c0c4cc;
}

// 桌面端优化
@media (min-width: 769px) {
  .speech-control {
    padding: 12px;
    
    &.dark-theme {
      background-color: #1a1a1a;
    }
    
    .speech-panel {
      .speech-settings {
        max-width: 450px;
        
        .el-form-item {
          margin-bottom: 10px;
          
          :deep(.el-form-item__label) {
            width: 80px;
            text-align: right;
            padding-right: 6px;
            font-size: 13px;
          }
          
          :deep(.el-form-item__content) {
            margin-left: 90px;
          }
        }
        
        .rate-control,
        .volume-control {
          max-width: 320px;
          
          .speech-slider {
            min-width: 180px;
            max-width: 230px;
          }
        }
        
        .el-select {
          max-width: 320px;
        }
        
        .el-checkbox {
          :deep(.el-checkbox__label) {
            font-size: 13px;
            line-height: 1.4;
          }
        }
      }
    }
  }
}
</style> 