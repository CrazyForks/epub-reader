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
    this.isHuawei = this.detectHuawei()
    this.isHuaweiBrowser = this.detectHuaweiBrowser()
    
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
   * 检测华为设备
   */
  detectHuawei() {
    const userAgent = navigator.userAgent.toLowerCase()
    return userAgent.includes('huawei') || 
           userAgent.includes('honor') || 
           userAgent.includes('hisilicon') ||
           userAgent.includes('harmonyos')
  }
  
  /**
   * 检测华为浏览器
   */
  detectHuaweiBrowser() {
    const userAgent = navigator.userAgent.toLowerCase()
    return userAgent.includes('huaweibrowser') ||
           userAgent.includes('hbrowser')
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
    
    // 华为设备的特殊处理
    if (this.isHuawei) {
      this.setupHuaweiSupport()
    }
    
    // 华为浏览器的特殊处理
    if (this.isHuaweiBrowser) {
      this.setupHuaweiBrowserSupport()
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
    
    // 添加用户手势激活机制
    this.setupUserGestureActivation()
  }
  
  /**
   * 设置华为设备支持
   */
  setupHuaweiSupport() {
    console.log('检测到华为设备，启用特殊兼容模式')
    
    // 华为设备通常需要更长的初始化时间
    this.setupDelayedInitialization()
    
    // 华为浏览器可能需要多次尝试才能获取语音列表
    this.setupMultipleVoiceLoadAttempts()
    
    // 用户手势激活
    this.setupUserGestureActivation()
    
    // 华为设备的语音引擎检查
    this.checkHuaweiVoiceSupport()
  }
  
  /**
   * 设置延迟初始化
   */
  setupDelayedInitialization() {
    // 华为设备可能需要更长时间来初始化语音引擎
    const delays = [500, 1000, 2000, 3000, 5000]
    
    delays.forEach(delay => {
      setTimeout(() => {
        if (this.voices.length === 0) {
          console.log(`华为设备延迟加载语音列表: ${delay}ms`)
          this.loadVoices()
        }
      }, delay)
    })
  }
  
  /**
   * 设置多次语音加载尝试
   */
  setupMultipleVoiceLoadAttempts() {
    let attempts = 0
    const maxAttempts = 10
    
    const attemptLoad = () => {
      attempts++
      if (attempts > maxAttempts) {
        console.warn('华为设备语音加载尝试次数已达上限')
        return
      }
      
      if (this.synthesis && this.voices.length === 0) {
        console.log(`华为设备语音加载尝试 ${attempts}/${maxAttempts}`)
        this.loadVoices()
        
        setTimeout(() => {
          if (this.voices.length === 0) {
            attemptLoad()
          }
        }, 1000)
      }
    }
    
    // 开始尝试
    setTimeout(attemptLoad, 2000)
  }
  
  /**
   * 设置用户手势激活
   */
  setupUserGestureActivation() {
    const activateSpeech = () => {
      if (this.synthesis && this.voices.length === 0) {
        console.log('用户手势激活语音功能')
        
        // 创建一个极短的静音utterance来激活语音引擎
        try {
          const utterance = new SpeechSynthesisUtterance(' ')
          utterance.volume = 0.01
          utterance.rate = 2
          utterance.pitch = 0.1
          
          utterance.onend = () => {
            // 激活后重新加载语音列表
            setTimeout(() => {
              this.loadVoices()
            }, 200)
          }
          
          utterance.onerror = () => {
            // 即使出错也尝试重新加载
            setTimeout(() => {
              this.loadVoices()
            }, 500)
          }
          
          this.synthesis.speak(utterance)
        } catch (error) {
          console.warn('用户手势激活失败:', error)
        }
      }
    }
    
    // 监听多种用户交互事件
    const events = ['touchstart', 'touchend', 'click', 'tap', 'mousedown']
    events.forEach(event => {
      document.addEventListener(event, activateSpeech, { once: true, passive: true })
    })
  }
  
  /**
   * 检查华为设备语音支持
   */
  checkHuaweiVoiceSupport() {
    setTimeout(() => {
      const voices = this.synthesis?.getVoices() || []
      
      if (voices.length === 0) {
        this.fallbackMessage = '华为设备语音引擎可能需要手动激活。请点击任意按钮后再尝试使用语音功能。'
        console.log('华为设备暂未检测到语音引擎')
        return
      }
      
      const hasChineseVoice = voices.some(voice => 
        voice.lang.includes('zh') || 
        voice.name.toLowerCase().includes('chinese') ||
        voice.name.includes('中文') ||
        voice.name.includes('普通话')
      )
      
      if (!hasChineseVoice) {
        this.fallbackMessage = '华为设备可能需要在设置中启用中文语音引擎。请前往 设置 > 智慧助手 > 智慧语音 > 语音合成 中检查语音设置。'
      } else {
        console.log('华为设备语音支持正常')
      }
    }, 3000)
  }
  
  /**
   * 设置华为浏览器支持
   */
  setupHuaweiBrowserSupport() {
    console.log('检测到华为浏览器，启用特殊兼容模式')
    
    // 华为浏览器可能需要特殊的API权限请求
    this.requestHuaweiBrowserPermissions()
    
    // 华为浏览器的语音初始化可能需要更多时间
    this.setupExtendedInitialization()
    
    // 华为浏览器可能需要特殊的语音设置
    this.setupHuaweiBrowserVoiceSettings()
  }
  
  /**
   * 请求华为浏览器权限
   */
  requestHuaweiBrowserPermissions() {
    // 华为浏览器可能需要明确的权限请求
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' }).then(result => {
        console.log('华为浏览器麦克风权限状态:', result.state)
      }).catch(error => {
        console.log('华为浏览器权限查询失败:', error)
      })
    }
  }
  
  /**
   * 设置扩展初始化
   */
  setupExtendedInitialization() {
    // 华为浏览器可能需要更长的初始化序列
    const extendedDelays = [1000, 3000, 5000, 8000, 10000]
    
    extendedDelays.forEach(delay => {
      setTimeout(() => {
        if (this.voices.length === 0) {
          console.log(`华为浏览器扩展初始化: ${delay}ms`)
          
          // 尝试重新检查语音API
          if (this.synthesis) {
            // 触发voiceschanged事件
            if (typeof this.synthesis.onvoiceschanged === 'function') {
              this.synthesis.onvoiceschanged()
            }
            
            // 强制重新加载
            this.loadVoices()
          }
        }
      }, delay)
    })
  }
  
  /**
   * 设置华为浏览器语音设置
   */
  setupHuaweiBrowserVoiceSettings() {
    // 华为浏览器可能有特殊的语音配置要求
    setTimeout(() => {
      if (this.synthesis) {
        // 尝试设置华为浏览器的特殊属性
        try {
          // 某些华为浏览器版本可能需要这些设置
          if ('getVoices' in this.synthesis) {
            this.synthesis.getVoices()
          }
          
          // 强制触发语音列表更新
          const event = new Event('voiceschanged')
          this.synthesis.dispatchEvent(event)
          
        } catch (error) {
          console.warn('华为浏览器语音设置失败:', error)
        }
      }
    }, 2000)
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
    if (!this.synthesis) {
      console.warn('语音合成API不可用')
      return
    }
    
    try {
      const voices = this.synthesis.getVoices()
      
      // 如果语音列表为空，记录但不立即设置为fallback模式
      if (voices.length === 0) {
        console.log('语音列表为空，等待加载...')
        
        // 华为设备特殊处理：尝试触发语音加载
        if (this.isHuawei) {
          this.triggerVoiceLoading()
        }
        return
      }
      
      // 过滤掉无效的语音
      const validVoices = voices.filter(voice => {
        return voice && voice.name && voice.lang
      })
      
      if (validVoices.length === 0) {
        console.warn('没有有效的语音可用')
        return
      }
      
      this.voices = validVoices
      console.log(`加载到 ${validVoices.length} 个有效语音:`, validVoices.map(v => `${v.name} (${v.lang})`))
      
      // 移动端语音过滤和优化
      if (this.isMobile) {
        this.optimizeVoicesForMobile()
      }
      
      // 华为设备特殊优化
      if (this.isHuawei) {
        this.optimizeVoicesForHuawei()
      }
      
      // 如果之前是fallback模式但现在有语音了，重置状态
      if (this.fallbackMode && this.voices.length > 0) {
        this.fallbackMode = false
        this.fallbackMessage = ''
        console.log('语音引擎已恢复正常')
      }
      
      // 智能选择语音
      this.selectBestVoice()
      
    } catch (error) {
      console.warn('加载语音列表失败:', error)
      
      // 华为设备的特殊错误处理
      if (this.isHuawei) {
        setTimeout(() => {
          console.log('华为设备延迟重试加载语音...')
          this.loadVoices()
        }, 2000)
      }
    }
  }
  
  /**
   * 触发语音加载（华为设备专用）
   */
  triggerVoiceLoading() {
    try {
      // 创建一个极短的utterance来触发语音引擎
      const utterance = new SpeechSynthesisUtterance('')
      utterance.volume = 0
      utterance.rate = 10
      
      utterance.onend = () => {
        setTimeout(() => {
          const voices = this.synthesis?.getVoices() || []
          if (voices.length > 0) {
            console.log('华为设备语音触发成功')
            this.loadVoices()
          }
        }, 100)
      }
      
      utterance.onerror = () => {
        // 忽略触发错误
      }
      
      this.synthesis.speak(utterance)
    } catch (error) {
      console.warn('华为设备语音触发失败:', error)
    }
  }
  
  /**
   * 华为设备语音优化
   */
  optimizeVoicesForHuawei() {
    // 优先保留华为自带的语音引擎
    this.voices.sort((a, b) => {
      const aIsHuawei = a.name.toLowerCase().includes('huawei') || 
                       a.name.toLowerCase().includes('hisilicon')
      const bIsHuawei = b.name.toLowerCase().includes('huawei') || 
                       b.name.toLowerCase().includes('hisilicon')
      
      if (aIsHuawei && !bIsHuawei) return -1
      if (!aIsHuawei && bIsHuawei) return 1
      
      // 其次优先本地语音
      if (a.localService && !b.localService) return -1
      if (!a.localService && b.localService) return 1
      
      return 0
    })
    
    console.log('华为设备语音优化完成')
  }
  
  /**
   * 智能选择最佳语音
   */
  selectBestVoice() {
    if (this.voices.length === 0) return
    
    // 定义中文语音的匹配模式
    const chinesePatterns = [
      /zh/i,
      /chinese/i,
      /中文/,
      /普通话/,
      /mandarin/i,
      /cantonese/i,
      /taiwan/i,
      /simplified/i,
      /traditional/i
    ]
    
    // 查找最佳中文语音
    const chineseVoices = this.voices.filter(voice => {
      return chinesePatterns.some(pattern => 
        pattern.test(voice.lang) || pattern.test(voice.name)
      )
    })
    
    if (chineseVoices.length > 0) {
      // 优先选择本地语音
      const localChineseVoice = chineseVoices.find(voice => voice.localService)
      if (localChineseVoice) {
        this.selectedVoice = localChineseVoice
        console.log('选择本地中文语音:', localChineseVoice.name)
      } else {
        this.selectedVoice = chineseVoices[0]
        console.log('选择中文语音:', chineseVoices[0].name)
      }
    } else if (this.voices.length > 0) {
      // 没有中文语音，选择默认语音
      const localVoice = this.voices.find(voice => voice.localService)
      if (localVoice) {
        this.selectedVoice = localVoice
        console.log('选择本地默认语音:', localVoice.name)
      } else {
        this.selectedVoice = this.voices[0]
        console.log('选择默认语音:', this.voices[0].name)
      }
      
      // 设置警告信息
      if (this.isMobile) {
        if (this.isHuawei) {
          this.fallbackMessage = '未找到中文语音。请在"设置 > 智慧助手 > 智慧语音 > 语音合成"中安装中文语音包。'
        } else {
          this.fallbackMessage = '未找到中文语音，将使用默认语音。建议在系统设置中安装中文语音包。'
        }
      }
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
      
      // 华为设备需要更长的等待时间
      const waitTime = this.isHuawei ? 2000 : 500
      
      this.forceReloadVoices()
      
      // 给一点时间让语音加载
      setTimeout(() => {
        if (!this.checkVoiceAvailability()) {
          this.fallbackMode = true
          
          if (this.isHuawei) {
            this.fallbackMessage = '华为设备的语音引擎可能需要手动激活。请尝试点击页面任意位置，然后重新检测语音功能。'
          } else {
            this.fallbackMessage = '没有可用的语音引擎，请检查系统语音设置'
          }
          
          this.showFallbackMessage()
        }
      }, waitTime)
      
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
    } else if (this.isHuawei) {
      suggestions.push('华为设备请在"设置 > 智慧助手 > 智慧语音 > 语音合成"中启用语音引擎')
      suggestions.push('确保已安装华为语音引擎或Google文字转语音引擎')
      suggestions.push('尝试在华为浏览器或Chrome浏览器中打开本应用')
      suggestions.push('如果仍无法使用，请尝试点击页面任意位置后再试')
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
    this.voices = [] // 清空现有语音列表
    
    // 立即尝试加载
    this.loadVoices()
    
    // 华为设备使用更激进的重试策略
    if (this.isHuawei) {
      this.setupAggressiveRetry()
    } else {
      // 普通设备的延迟重试
      setTimeout(() => {
        if (this.voices.length === 0) {
          this.loadVoices()
        }
      }, 1000)
    }
  }
  
  /**
   * 设置激进的重试策略（用于华为设备）
   */
  setupAggressiveRetry() {
    const retryDelays = [200, 500, 1000, 2000, 3000, 5000]
    let retryCount = 0
    
    const retry = () => {
      if (retryCount >= retryDelays.length) {
        console.warn('华为设备语音加载重试已达上限')
        return
      }
      
      if (this.voices.length === 0) {
        console.log(`华为设备语音重试 ${retryCount + 1}/${retryDelays.length}`)
        this.loadVoices()
        
        retryCount++
        if (retryCount < retryDelays.length) {
          setTimeout(retry, retryDelays[retryCount])
        }
      }
    }
    
    // 开始重试序列
    setTimeout(retry, retryDelays[0])
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