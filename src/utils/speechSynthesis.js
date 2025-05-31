/**
 * 语音合成工具类
 */
export class SpeechSynthesisManager {
  constructor() {
    this.synthesis = null
    this.voices = []
    this.selectedVoice = null
    this.isPlaying = false
    this.isPaused = false
    this.currentUtterance = null
    this.currentText = ''
    this.currentPosition = 0
    this.rate = 1
    this.pitch = 1
    this.volume = 1
    
    // 事件回调
    this.onStart = null
    this.onEnd = null
    this.onPause = null
    this.onResume = null
    this.onError = null
    
    // 分段朗读相关
    this.chunks = []
    this.currentChunkIndex = 0
    this.isStopping = false
    
    this.init()
  }
  
  /**
   * 初始化语音合成
   */
  init() {
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis
      this.loadVoices()
      
      // 监听语音列表变化
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => {
          this.loadVoices()
        }
      }
    } else {
      console.warn('浏览器不支持语音合成功能')
    }
  }
  
  /**
   * 加载可用语音
   */
  loadVoices() {
    if (this.synthesis) {
      this.voices = this.synthesis.getVoices()
      
      // 优先选择中文语音
      const chineseVoice = this.voices.find(voice => 
        voice.lang.includes('zh') || voice.name.includes('Chinese')
      )
      
      if (chineseVoice) {
        this.selectedVoice = chineseVoice
      } else if (this.voices.length > 0) {
        this.selectedVoice = this.voices[0]
      }
    }
  }
  
  /**
   * 获取可用语音列表
   */
  getVoices() {
    return this.voices
  }
  
  /**
   * 设置语音
   */
  setVoice(voiceName) {
    const voice = this.voices.find(v => v.name === voiceName)
    if (voice) {
      this.selectedVoice = voice
    }
  }
  
  /**
   * 设置语音参数
   */
  setRate(rate) {
    this.rate = Math.max(0.1, Math.min(2, rate))
  }
  
  setPitch(pitch) {
    this.pitch = Math.max(0, Math.min(2, pitch))
  }
  
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume))
  }
  
  /**
   * 开始朗读
   */
  speak(text) {
    if (!this.synthesis || !text) {
      return false
    }
    
    // 停止当前朗读
    this.stop()
    
    this.currentText = text
    this.currentPosition = 0
    this.isStopping = false
    
    // 分段朗读，避免长文本导致的问题
    this.speakInChunks(text)
    
    return true
  }
  
  /**
   * 分段朗读
   */
  speakInChunks(text) {
    this.chunks = this.splitTextIntoChunks(text, 200) // 每段200字符
    this.currentChunkIndex = 0
    
    this.speakNextChunk()
  }
  
  /**
   * 朗读下一段
   */
  speakNextChunk() {
    // 如果正在停止，直接返回
    if (this.isStopping) {
      return
    }
    
    if (this.currentChunkIndex >= this.chunks.length) {
      this.isPlaying = false
      this.isPaused = false
      if (this.onEnd) this.onEnd()
      return
    }
    
    const chunk = this.chunks[this.currentChunkIndex]
    const utterance = new SpeechSynthesisUtterance(chunk)
    
    // 设置语音参数
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice
    }
    utterance.rate = this.rate
    utterance.pitch = this.pitch
    utterance.volume = this.volume
    
    // 设置事件监听
    utterance.onstart = () => {
      if (this.currentChunkIndex === 0 && !this.isStopping) {
        this.isPlaying = true
        this.isPaused = false
        if (this.onStart) this.onStart()
      }
    }
    
    utterance.onend = () => {
      if (!this.isStopping) {
        this.currentChunkIndex++
        if (!this.isPaused) {
          setTimeout(() => this.speakNextChunk(), 100) // 短暂延迟避免问题
        }
      }
    }
    
    utterance.onerror = (event) => {
      // 如果是因为停止操作导致的错误，不需要报告
      if (this.isStopping || event.error === 'interrupted' || event.error === 'canceled') {
        return
      }
      
      console.warn('语音合成错误:', event.error, event)
      
      // 尝试继续下一段
      if (!this.isStopping) {
        this.currentChunkIndex++
        setTimeout(() => this.speakNextChunk(), 500)
      }
      
      if (this.onError) this.onError(event)
    }
    
    this.currentUtterance = utterance
    
    try {
      this.synthesis.speak(utterance)
    } catch (error) {
      console.warn('语音合成启动失败:', error)
      if (this.onError) this.onError(error)
    }
  }
  
  /**
   * 将文本分割成小段
   */
  splitTextIntoChunks(text, maxLength) {
    const chunks = []
    const sentences = text.split(/[。！？；\.\!\?\;]/)
    
    let currentChunk = ''
    
    for (const sentence of sentences) {
      if (sentence.trim().length === 0) continue
      
      if (currentChunk.length + sentence.length > maxLength) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim())
          currentChunk = ''
        }
        
        // 如果单个句子太长，强制分割
        if (sentence.length > maxLength) {
          for (let i = 0; i < sentence.length; i += maxLength) {
            chunks.push(sentence.substring(i, i + maxLength))
          }
        } else {
          currentChunk = sentence
        }
      } else {
        currentChunk += sentence + '。'
      }
    }
    
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim())
    }
    
    return chunks.filter(chunk => chunk.length > 0)
  }
  
  /**
   * 暂停朗读
   */
  pause() {
    if (this.synthesis && this.isPlaying && !this.isPaused) {
      try {
        this.synthesis.pause()
        this.isPaused = true
        if (this.onPause) this.onPause()
      } catch (error) {
        console.warn('暂停语音失败:', error)
      }
    }
  }
  
  /**
   * 继续朗读
   */
  resume() {
    if (this.synthesis && this.isPlaying && this.isPaused) {
      try {
        this.synthesis.resume()
        this.isPaused = false
        if (this.onResume) this.onResume()
      } catch (error) {
        console.warn('恢复语音失败:', error)
        // 如果恢复失败，尝试重新开始当前段落
        this.speakNextChunk()
      }
    }
  }
  
  /**
   * 停止朗读
   */
  stop() {
    this.isStopping = true
    
    if (this.synthesis) {
      try {
        this.synthesis.cancel()
      } catch (error) {
        console.warn('停止语音失败:', error)
      }
    }
    
    // 立即重置状态
    this.isPlaying = false
    this.isPaused = false
    this.currentUtterance = null
    this.chunks = []
    this.currentChunkIndex = 0
    this.currentText = ''
    this.currentPosition = 0
    
    // 短暂延迟后重置停止标志，确保所有异步操作完成
    setTimeout(() => {
      this.isStopping = false
    }, 200)
    
    // 触发停止事件
    if (this.onEnd) {
      this.onEnd()
    }
  }
  
  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      isSupported: !!this.synthesis,
      currentVoice: this.selectedVoice?.name || '',
      rate: this.rate,
      pitch: this.pitch,
      volume: this.volume
    }
  }
  
  /**
   * 设置事件回调
   */
  setEventCallbacks(callbacks) {
    this.onStart = callbacks.onStart
    this.onEnd = callbacks.onEnd
    this.onPause = callbacks.onPause
    this.onResume = callbacks.onResume
    this.onError = callbacks.onError
  }
}

// 创建全局实例
export const speechManager = new SpeechSynthesisManager() 