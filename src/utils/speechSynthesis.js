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
    
    // 移动端兼容性
    this.isMobile = this.detectMobile()
    this.isIOS = this.detectIOS()
    this.isAndroid = this.detectAndroid()
    
    // 备用方案状态
    this.fallbackMode = false
    this.fallbackMessage = ''
    
    this.init()
  }
  
  /**
   * 检测移动设备
   */
  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768
  }
  
  /**
   * 检测iOS设备
   */
  detectIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
  }
  
  /**
   * 检测Android设备
   */
  detectAndroid() {
    return /Android/i.test(navigator.userAgent)
  }
  
  /**
   * 初始化语音合成
   */
  init() {
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis
      
      // 移动端特殊处理
      if (this.isMobile) {
        this.initMobileSupport()
      }
      
      // 立即尝试加载语音
      this.loadVoices()
      
      // 监听语音列表变化
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => {
          this.loadVoices()
        }
      }
      
      // 多次延迟加载语音列表（某些浏览器需要）
      setTimeout(() => {
        this.loadVoices()
      }, 100)
      
      setTimeout(() => {
        this.loadVoices()
      }, 500)
      
      setTimeout(() => {
        this.loadVoices()
      }, 1000)
      
      setTimeout(() => {
        this.loadVoices()
      }, 2000)
      
    } else {
      console.warn('浏览器不支持语音合成功能')
      this.fallbackMode = true
      this.fallbackMessage = '您的浏览器不支持语音合成功能'
    }
  }
  
  /**
   * 初始化移动端支持
   */
  initMobileSupport() {
    // iOS Safari 需要用户交互才能启用语音
    if (this.isIOS) {
      this.setupIOSSupport()
    }
    
    // Android Chrome 的特殊处理
    if (this.isAndroid) {
      this.setupAndroidSupport()
    }
  }
  
  /**
   * 设置iOS支持
   */
  setupIOSSupport() {
    // iOS需要在用户交互事件中初始化语音
    const initIOSSpeech = () => {
      if (this.synthesis) {
        // 创建一个静音的utterance来激活语音功能
        const utterance = new SpeechSynthesisUtterance('')
        utterance.volume = 0
        this.synthesis.speak(utterance)
      }
    }
    
    // 监听用户交互事件
    document.addEventListener('touchstart', initIOSSpeech, { once: true })
    document.addEventListener('click', initIOSSpeech, { once: true })
  }
  
  /**
   * 设置Android支持
   */
  setupAndroidSupport() {
    // Android Chrome 可能需要特殊的语音设置
    // 某些版本的Chrome可能不支持中文语音
    this.checkAndroidVoiceSupport()
  }
  
  /**
   * 检查Android语音支持
   */
  checkAndroidVoiceSupport() {
    setTimeout(() => {
      const voices = this.synthesis?.getVoices() || []
      const hasChineseVoice = voices.some(voice => 
        voice.lang.includes('zh') || voice.name.toLowerCase().includes('chinese')
      )
      
      if (!hasChineseVoice && this.isAndroid) {
        this.fallbackMessage = '您的设备可能没有安装中文语音包，建议在系统设置中下载中文TTS语音包'
      }
    }, 2000)
  }
  
  /**
   * 加载可用语音
   */
  loadVoices() {
    if (!this.synthesis) return
    
    try {
      const voices = this.synthesis.getVoices()
      
      // 如果语音列表为空，不要立即设置为fallback模式
      if (voices.length === 0) {
        console.log('语音列表为空，等待加载...')
        return
      }
      
      this.voices = voices
      console.log(`加载到 ${voices.length} 个语音:`, voices.map(v => v.name))
      
      // 移动端语音过滤和优化
      if (this.isMobile) {
        this.optimizeVoicesForMobile()
      }
      
      // 如果之前是fallback模式但现在有语音了，重置状态
      if (this.fallbackMode && this.voices.length > 0) {
        this.fallbackMode = false
        this.fallbackMessage = ''
        console.log('语音引擎已恢复正常')
      }
      
      // 优先选择中文语音
      const chineseVoice = this.voices.find(voice => 
        voice.lang.includes('zh') || voice.name.toLowerCase().includes('chinese')
      )
      
      if (chineseVoice) {
        this.selectedVoice = chineseVoice
        console.log('选择中文语音:', chineseVoice.name)
      } else if (this.voices.length > 0) {
        this.selectedVoice = this.voices[0]
        console.log('选择默认语音:', this.voices[0].name)
        
        // 如果没有中文语音，设置警告信息但不设为fallback模式
        if (this.isMobile) {
          this.fallbackMessage = '未找到中文语音，将使用默认语音。建议在系统设置中安装中文语音包。'
        }
      }
      
    } catch (error) {
      console.warn('加载语音列表失败:', error)
      // 不要因为一次失败就设置为fallback模式，可能下次会成功
    }
  }
  
  /**
   * 为移动端优化语音列表
   */
  optimizeVoicesForMobile() {
    // 过滤掉可能不工作的语音
    this.voices = this.voices.filter(voice => {
      // 排除一些已知在移动端不工作的语音
      const excludePatterns = ['Microsoft', 'SAPI', 'eSpeak']
      return !excludePatterns.some(pattern => voice.name.includes(pattern))
    })
    
    // 优先排序本地语音
    this.voices.sort((a, b) => {
      if (a.localService && !b.localService) return -1
      if (!a.localService && b.localService) return 1
      return 0
    })
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
    // 移动端语速限制更严格
    const minRate = this.isMobile ? 0.5 : 0.1
    const maxRate = this.isMobile ? 1.5 : 2
    this.rate = Math.max(minRate, Math.min(maxRate, rate))
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
    
    // 实时检查语音可用性
    if (!this.checkVoiceAvailability()) {
      console.log('语音不可用，尝试重新加载...')
      this.forceReloadVoices()
      
      // 给一点时间让语音加载
      setTimeout(() => {
        if (!this.checkVoiceAvailability()) {
          this.fallbackMode = true
          this.fallbackMessage = '没有可用的语音引擎，请检查系统语音设置'
          this.showFallbackMessage()
        }
      }, 500)
      
      return false
    }
    
    // 检查是否处于备用模式
    if (this.fallbackMode) {
      this.showFallbackMessage()
      return false
    }
    
    // 停止当前朗读
    this.stop()
    
    this.currentText = text
    this.currentPosition = 0
    this.isStopping = false
    
    // 移动端使用更小的分段
    const chunkSize = this.isMobile ? 100 : 200
    this.speakInChunks(text, chunkSize)
    
    return true
  }
  
  /**
   * 显示备用方案消息
   */
  showFallbackMessage() {
    if (this.onError) {
      this.onError({
        type: 'fallback',
        message: this.fallbackMessage,
        suggestions: this.getFallbackSuggestions()
      })
    }
  }
  
  /**
   * 获取备用方案建议
   */
  getFallbackSuggestions() {
    const suggestions = []
    
    if (this.isIOS) {
      suggestions.push('在iOS设备上，请确保在"设置 > 辅助功能 > 朗读内容"中启用了"朗读所选项"')
      suggestions.push('尝试在Safari浏览器中打开本应用')
    } else if (this.isAndroid) {
      suggestions.push('在Android设备上，请在"设置 > 语言和输入法 > 文字转语音输出"中安装中文语音包')
      suggestions.push('推荐安装Google文字转语音引擎')
      suggestions.push('尝试在Chrome浏览器中打开本应用')
    } else {
      suggestions.push('请确保浏览器支持Web Speech API')
      suggestions.push('尝试更新浏览器到最新版本')
    }
    
    suggestions.push('您也可以使用系统自带的朗读功能作为替代')
    
    return suggestions
  }
  
  /**
   * 分段朗读
   */
  speakInChunks(text, chunkSize) {
    this.chunks = this.splitTextIntoChunks(text, chunkSize)
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
    // 实时检查语音可用性
    const hasVoices = this.checkVoiceAvailability()
    const isSupported = !!this.synthesis && hasVoices
    
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      isSupported: isSupported,
      currentVoice: this.selectedVoice?.name || '',
      rate: this.rate,
      pitch: this.pitch,
      volume: this.volume,
      voiceCount: this.voices.length,
      fallbackMode: this.fallbackMode
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
  
  /**
   * 强制重新加载语音列表
   */
  forceReloadVoices() {
    console.log('强制重新加载语音列表...')
    this.fallbackMode = false
    this.fallbackMessage = ''
    this.loadVoices()
    
    // 如果立即加载失败，延迟重试
    setTimeout(() => {
      if (this.voices.length === 0) {
        this.loadVoices()
      }
    }, 1000)
  }
  
  /**
   * 检查语音可用性
   */
  checkVoiceAvailability() {
    if (!this.synthesis) {
      return false
    }
    
    const voices = this.synthesis.getVoices()
    return voices.length > 0
  }
}

// 创建全局实例
export const speechManager = new SpeechSynthesisManager() 