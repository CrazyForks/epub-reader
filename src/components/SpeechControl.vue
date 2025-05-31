<template>
  <div class="speech-control">
    <div class="speech-status" v-if="!isSupported">
      <el-alert
        title="语音功能不可用"
        description="您的浏览器不支持语音合成功能"
        type="warning"
        :closable="false"
      />
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
              style="flex: 1"
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
              style="flex: 1"
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
  const status = speechManager.getStatus()
  isSupported.value = status.isSupported
  
  if (isSupported.value) {
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
  }
}

const loadVoices = () => {
  availableVoices.value = speechManager.getVoices()
  
  // 如果没有选择语音，自动选择第一个中文语音
  if (!selectedVoice.value && availableVoices.value.length > 0) {
    const chineseVoice = availableVoices.value.find(voice => 
      voice.lang.includes('zh') || voice.name.includes('Chinese')
    )
    if (chineseVoice) {
      selectedVoice.value = chineseVoice.name
      speechManager.setVoice(selectedVoice.value)
    }
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
  // 只有在非停止状态下才显示错误消息
  if (!error || error.error === 'interrupted' || error.error === 'canceled') {
    return
  }
  
  isPlaying.value = false
  isPaused.value = false
  progressPercentage.value = 0
  
  console.warn('语音朗读错误:', error)
  
  // 只对真正的错误显示消息
  if (error.error && error.error !== 'interrupted' && error.error !== 'canceled') {
    ElMessage.warning(`语音朗读遇到问题，已自动处理`)
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
</script>

<style lang="scss" scoped>
.speech-control {
  padding: 16px;
  
  .speech-panel {
    .control-buttons {
      margin-bottom: 20px;
      text-align: center;
    }
    
    .speech-settings {
      .el-form-item {
        margin-bottom: 16px;
        
        :deep(.el-form-item__label) {
          font-weight: 500;
          color: #303133;
          
          .dark-theme & {
            color: #e0e0e0;
          }
        }
      }
      
      .rate-control,
      .volume-control {
        display: flex;
        align-items: center;
        gap: 12px;
        
        .rate-value,
        .volume-value {
          min-width: 40px;
          text-align: right;
          font-size: 14px;
          color: #666;
          
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
            min-height: 44px; // 移动端触摸标准
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
        
        // 选择器优化
        .el-select {
          width: 100%;
          
          :deep(.el-input__inner) {
            min-height: 44px;
            font-size: 14px;
          }
        }
        
        // 滑块优化
        .rate-control,
        .volume-control {
          gap: 8px;
          
          .el-slider {
            flex: 1;
            margin: 0 8px;
            
            :deep(.el-slider__runway) {
              height: 6px;
            }
            
            :deep(.el-slider__button) {
              width: 20px;
              height: 20px;
            }
          }
          
          .rate-value,
          .volume-value {
            min-width: 50px;
            font-size: 14px;
            text-align: center;
          }
        }
        
        // 复选框优化
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

// 横屏模式优化
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
</style> 