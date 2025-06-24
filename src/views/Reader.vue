<template>
  <div class="epub-reader" :class="{ 'dark-theme': isDarkTheme }">
    <!-- 顶部工具栏 -->
    <div class="toolbar" v-show="toolbarVisible">
      <div class="toolbar-left">
        <el-button @click="openFile" type="primary" :icon="FolderOpened">
          打开EPUB文件
        </el-button>
        <el-button 
          v-if="currentBook && isMobile" 
          @click="toggleSidebar" 
          :icon="sidebarVisible ? 'ArrowUp' : 'ArrowDown'"
          size="small"
        >
          {{ sidebarVisible ? '收起' : '展开' }}
        </el-button>
        <span v-if="currentBook" class="book-title">{{ currentBook.title }}</span>
      </div>
      
      <div class="toolbar-center">
        <el-button-group>
          <el-button @click="prevChapter" :disabled="!hasPrevChapter" :icon="ArrowLeft">
            上一章
          </el-button>
          <el-button @click="nextChapter" :disabled="!hasNextChapter" :icon="ArrowRight">
            下一章
          </el-button>
        </el-button-group>
        
        <span class="chapter-progress" v-if="currentBook">
          {{ currentChapterIndex + 1 }} / {{ totalChapters }}
        </span>
      </div>
      
      <div class="toolbar-right">
        <!-- 字体大小控制 -->
        <el-button-group>
          <el-button @click="decreaseFontSize" :icon="Minus">A-</el-button>
          <el-button disabled>{{ fontSize }}px</el-button>
          <el-button @click="increaseFontSize" :icon="Plus">A+</el-button>
        </el-button-group>
        
        <!-- 主题切换 -->
        <el-button @click="toggleTheme" :icon="isDarkTheme ? Sunny : Moon">
          {{ isDarkTheme ? '浅色' : '深色' }}
        </el-button>
        
        <!-- 搜索 -->
        <el-input
          v-model="searchKeyword"
          placeholder="搜索文本"
          style="width: 200px"
          @keyup.enter="searchText"
          :prefix-icon="Search"
        />
        
        <!-- 书签 -->
        <el-button @click="addBookmark" :icon="Star" v-if="currentBook">
          添加书签
        </el-button>
      </div>
    </div>
    
    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 遮罩层 -->
      <div 
        v-if="sidebarVisible && isMobile && currentBook" 
        class="sidebar-overlay"
        @click="toggleSidebar"
      ></div>
      
      <!-- 左侧面板 -->
      <div 
        class="sidebar" 
        v-if="currentBook && !sidebarCollapsed" 
        v-show="sidebarVisible"
        :style="{ width: !isMobile ? sidebarWidth + 'px' : '100%' }"
      >
        <div class="sidebar-header" v-if="isMobile">
          <h3>目录</h3>
          <el-button @click="toggleSidebar" size="small" :icon="ArrowUp">
            收起
          </el-button>
        </div>
        
        <el-tabs v-model="activeTab" type="border-card">
          <!-- 目录 -->
          <el-tab-pane label="目录" name="toc">
            <div class="toc-container">
              <div
                v-for="(chapter, index) in chapters"
                :key="chapter.id"
                class="toc-item"
                :class="{ active: index === currentChapterIndex }"
                @click="goToChapter(index); isMobile && toggleSidebar()"
              >
                <div class="chapter-info">
                  <span class="chapter-number">{{ index + 1 }}.</span>
                  <span class="chapter-title">{{ chapter.title }}</span>
                </div>
                <el-icon v-if="index === currentChapterIndex" class="current-indicator" color="#409eff">
                  <ArrowRight />
                </el-icon>
              </div>
            </div>
          </el-tab-pane>
          
          <!-- 书签 -->
          <el-tab-pane label="书签" name="bookmarks">
            <div class="bookmarks-container">
              <div
                v-for="bookmark in bookmarks"
                :key="bookmark.id"
                class="bookmark-item"
                @click="goToBookmark(bookmark); isMobile && toggleSidebar()"
              >
                <div class="bookmark-content">
                  <div class="bookmark-name">{{ bookmark.name }}</div>
                  <div class="bookmark-info">
                    {{ bookmark.chapterTitle }}
                  </div>
                </div>
                <el-button
                  size="small"
                  type="danger"
                  :icon="Delete"
                  @click.stop="removeBookmark(bookmark.id)"
                  class="bookmark-delete"
                />
              </div>
              <div v-if="bookmarks.length === 0" class="empty-bookmarks">
                <el-icon size="48" color="#c0c4cc">
                  <Star />
                </el-icon>
                <p>暂无书签</p>
                <p class="tip">点击上方“添加书签”按钮来保存当前位置</p>
              </div>
            </div>
          </el-tab-pane>
          
          <!-- 语音控制 -->
          <el-tab-pane label="语音" name="speech">
            <SpeechControl />
          </el-tab-pane>
        </el-tabs>
        
        <!-- 拖拽手柄 (仅PC端显示) -->
        <div 
          v-if="!isMobile" 
          class="resize-handle"
          @mousedown="startResize"
          :class="{ 'resizing': isResizing }"
        ></div>
      </div>
      
      <!-- 悬浮按钮 -->
      <div 
        v-if="(!allControlsVisible || sidebarCollapsed) && currentBook" 
        class="floating-button"
        @click="toggleAllControls"
      >
        <el-icon size="20">
          <Menu />
        </el-icon>
      </div>
      
      <!-- 阅读区域 -->
      <div class="reading-area" v-if="currentBook" :class="{ 'with-sidebar': sidebarVisible && isMobile, 'full-screen': !toolbarVisible }">
        <div class="chapter-header">
          <h2>{{ currentChapter?.title }}</h2>
        </div>
        
        <div
          class="chapter-content"
          ref="contentRef"
          :style="{ fontSize: fontSize + 'px' }"
          v-html="highlightedContent"
          @touchstart="handleTouchStart"
          @touchend="handleTouchEnd"
        ></div>
        
        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-overlay">
          <el-loading-spinner />
          <span>加载中...</span>
        </div>
      </div>
      
      <!-- 欢迎页面 -->
      <div v-else class="welcome-screen">
        <div class="welcome-content">
          <el-icon :size="80" color="#409eff">
            <Reading />
          </el-icon>
          <h1>EPUB阅读器</h1>
          <p>选择一个EPUB文件开始阅读</p>
          <p v-if="isMobile" class="mobile-tip">
            💡 移动端提示：左右滑动可以翻页，点击屏幕中央可以显示/隐藏控制栏
          </p>
          <el-button type="primary" @click="openFile" size="large">
            打开EPUB文件
          </el-button>
        </div>
      </div>
    </div>
    
    <!-- 文件选择器 -->
    <input
      ref="fileInput"
      type="file"
      accept=".epub"
      style="display: none"
      @change="handleFileSelect"
    />
    
    <!-- 添加书签对话框 -->
    <el-dialog v-model="showBookmarkDialog" title="添加书签" width="400px">
      <el-form>
        <el-form-item label="书签名称">
          <el-input v-model="bookmarkName" placeholder="请输入书签名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBookmarkDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmAddBookmark">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useEpubStore } from '@/stores/epub'
import { useSettingsStore } from '@/stores/settings'
import SpeechControl from '@/components/SpeechControl.vue'
import {
  FolderOpened,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Plus,
  Minus,
  Moon,
  Sunny,
  Search,
  Star,
  Delete,
  Reading,
  Menu
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// 状态管理
const epubStore = useEpubStore()
const settingsStore = useSettingsStore()

// 响应式数据
const activeTab = ref('toc')
const searchKeyword = ref('')
const searchResults = ref([])
const showBookmarkDialog = ref(false)
const bookmarkName = ref('')
const fileInput = ref(null)
const contentRef = ref(null)
const sidebarVisible = ref(true) // 侧边栏显示状态
const sidebarCollapsed = ref(false) // 侧边栏是否已完全收起
const toolbarVisible = ref(true) // 工具栏显示状态
const allControlsVisible = ref(true) // 所有控制面板的显示状态

// 触摸手势相关
const touchStartX = ref(0)
const touchStartY = ref(0)
const touchEndX = ref(0)
const touchEndY = ref(0)

// 拖拽调整侧边栏宽度相关
const sidebarWidth = ref(300) // 默认宽度
const isResizing = ref(false)
const startX = ref(0)
const startWidth = ref(0)
const minSidebarWidth = 200 // 最小宽度
const maxSidebarWidth = 500 // 最大宽度

// 计算属性
const currentBook = computed(() => epubStore.currentBook)
const chapters = computed(() => epubStore.chapters)
const currentChapter = computed(() => epubStore.currentChapter)
const currentChapterIndex = computed(() => epubStore.currentChapterIndex)
const currentChapterContent = computed(() => epubStore.currentChapterContent)
const totalChapters = computed(() => epubStore.totalChapters)
const hasNextChapter = computed(() => epubStore.hasNextChapter)
const hasPrevChapter = computed(() => epubStore.hasPrevChapter)
const isLoading = computed(() => epubStore.isLoading)
const bookmarks = computed(() => epubStore.bookmarks)

const fontSize = computed(() => settingsStore.fontSize)
const isDarkTheme = computed(() => settingsStore.theme === 'dark')

// 高亮搜索结果的内容
const highlightedContent = computed(() => {
  // 使用格式化的HTML内容而不是纯文本
  let content = epubStore.currentChapterHtmlContent || currentChapterContent.value
  if (searchKeyword.value && searchResults.value.length > 0) {
    const keyword = searchKeyword.value
    const regex = new RegExp(`(${keyword})`, 'gi')
    content = content.replace(regex, '<span class="search-highlight">$1</span>')
  }
  return content
})

// 方法
const openFile = () => {
  fileInput.value?.click()
}

const handleFileSelect = async (event) => {
  const file = event.target.files[0]
  if (file) {
    try {
      await epubStore.loadEpubFile(file)
      ElMessage.success('EPUB文件加载成功')
    } catch (error) {
      ElMessage.error(`文件加载失败: ${error.message}`)
    }
  }
}

const nextChapter = async () => {
  await epubStore.nextChapter()
  scrollToTop()
}

const prevChapter = async () => {
  await epubStore.prevChapter()
  scrollToTop()
}

const goToChapter = async (index) => {
  await epubStore.goToChapter(index)
  scrollToTop()
}

const increaseFontSize = () => {
  settingsStore.increaseFontSize()
}

const decreaseFontSize = () => {
  settingsStore.decreaseFontSize()
}

const toggleTheme = () => {
  settingsStore.toggleTheme()
}

const searchText = () => {
  if (!searchKeyword.value) {
    searchResults.value = []
    return
  }
  
  searchResults.value = epubStore.searchInCurrentChapter(searchKeyword.value)
  
  if (searchResults.value.length > 0) {
    ElMessage.success(`找到 ${searchResults.value.length} 个匹配项`)
    // 滚动到第一个搜索结果
    nextTick(() => {
      const firstHighlight = contentRef.value?.querySelector('.search-highlight')
      if (firstHighlight) {
        firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })
  } else {
    ElMessage.info('未找到匹配的内容')
  }
}

const addBookmark = () => {
  bookmarkName.value = `书签 ${bookmarks.value.length + 1}`
  showBookmarkDialog.value = true
}

const confirmAddBookmark = () => {
  if (bookmarkName.value.trim()) {
    epubStore.addBookmark(bookmarkName.value.trim())
    showBookmarkDialog.value = false
    ElMessage.success('书签添加成功')
  }
}

const removeBookmark = (bookmarkId) => {
  epubStore.removeBookmark(bookmarkId)
  ElMessage.success('书签删除成功')
}

const goToBookmark = async (bookmark) => {
  await epubStore.goToBookmark(bookmark)
  scrollToTop()
}

// 滚动到页面顶部
const scrollToTop = () => {
  nextTick(() => {
    if (contentRef.value) {
      contentRef.value.scrollTop = 0
    }
  })
}

// 切换侧边栏显示
const toggleSidebar = () => {
  if (isMobile.value) {
    if (sidebarCollapsed.value) {
      // 从完全收起状态展开
      sidebarCollapsed.value = false
      sidebarVisible.value = true
    } else {
      // 收起到完全隐藏状态
      sidebarVisible.value = false
      sidebarCollapsed.value = true
    }
  } else {
    // 桌面端只切换显示/隐藏
    sidebarVisible.value = !sidebarVisible.value
  }
}

// 切换所有控制面板的显示
const toggleAllControls = () => {
  if (!allControlsVisible.value) {
    // 展开所有控制面板
    allControlsVisible.value = true
    toolbarVisible.value = true
    if (isMobile.value) {
      sidebarVisible.value = true
      sidebarCollapsed.value = false
    } else {
      sidebarVisible.value = true
    }
  } else {
    // 收起所有控制面板
    allControlsVisible.value = false
    toolbarVisible.value = false
    sidebarVisible.value = false
    if (isMobile.value) {
      sidebarCollapsed.value = true
    }
    // 如果有展开的子操作（如语音面板），也一起收起
    activeTab.value = 'toc'
  }
}

// 触摸开始
const handleTouchStart = (event) => {
  touchStartX.value = event.touches[0].clientX
  touchStartY.value = event.touches[0].clientY
}

// 触摸结束
const handleTouchEnd = (event) => {
  touchEndX.value = event.changedTouches[0].clientX
  touchEndY.value = event.changedTouches[0].clientY
  handleSwipe()
}

// 处理滑动手势
const handleSwipe = async () => {
  const deltaX = touchEndX.value - touchStartX.value
  const deltaY = touchEndY.value - touchStartY.value
  const minSwipeDistance = 50
  
  // 确保是水平滑动而不是垂直滑动
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
    if (deltaX > 0) {
      // 向右滑动 - 上一章
      await prevChapter()
    } else {
      // 向左滑动 - 下一章
      await nextChapter()
    }
  }
}

// 检测是否为移动设备
const isMobile = computed(() => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.innerWidth <= 768
})

// 键盘快捷键
const handleKeydown = async (event) => {
  if (!currentBook.value) return
  
  switch (event.key) {
    case 'ArrowLeft':
      if (event.ctrlKey) {
        await prevChapter()
        event.preventDefault()
      }
      break
    case 'ArrowRight':
      if (event.ctrlKey) {
        await nextChapter()
        event.preventDefault()
      }
      break
    case '=':
    case '+':
      if (event.ctrlKey) {
        increaseFontSize()
        event.preventDefault()
      }
      break
    case '-':
      if (event.ctrlKey) {
        decreaseFontSize()
        event.preventDefault()
      }
      break
  }
}

// 生命周期
onMounted(() => {
  settingsStore.loadSettings()
  document.addEventListener('keydown', handleKeydown)
  
  // 移动端检测
  checkMobile()
  window.addEventListener('resize', checkMobile)
  
  // 移动端默认收起侧边栏
  if (isMobile.value) {
    sidebarVisible.value = false
    sidebarCollapsed.value = true
    // 移动端默认显示工具栏
    toolbarVisible.value = true
    allControlsVisible.value = true
  }
  
  // 从本地存储恢复侧边栏宽度
  const savedWidth = localStorage.getItem('sidebarWidth')
  if (savedWidth) {
    const width = parseInt(savedWidth)
    if (width >= minSidebarWidth && width <= maxSidebarWidth) {
      sidebarWidth.value = width
    }
  }
})

// 监听章节变化，加载书签
watch(currentBook, (newBook) => {
  if (newBook) {
    epubStore.loadBookmarks()
  }
}, { immediate: true })

// 移动端检测
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

// 拖拽调整侧边栏宽度的方法
const startResize = (event) => {
  if (isMobile.value) return // 移动端不支持拖拽
  
  isResizing.value = true
  startX.value = event.clientX
  startWidth.value = sidebarWidth.value
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const handleResize = (event) => {
  if (!isResizing.value) return
  
  const deltaX = event.clientX - startX.value
  const newWidth = startWidth.value + deltaX
  
  // 限制宽度范围
  if (newWidth >= minSidebarWidth && newWidth <= maxSidebarWidth) {
    sidebarWidth.value = newWidth
  }
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  
  // 保存宽度到本地存储
  localStorage.setItem('sidebarWidth', sidebarWidth.value.toString())
}
</script>

<style lang="scss" scoped>
// 拖拽调整侧边栏宽度的样式
.resizing-active {
  user-select: none;
  cursor: col-resize !important;
  
  * {
    cursor: col-resize !important;
  }
}

.epub-reader {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  
  &.dark-theme {
    background-color: #1a1a1a;
    color: #e0e0e0;
  }
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e4e7ed;
  background-color: #f8f9fa;
  
  .dark-theme & {
    border-bottom-color: #3a3a3a;
    background-color: #2a2a2a;
  }
  
  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 16px;
    
    .book-title {
      font-weight: 500;
      color: #409eff;
    }
    
    // 深色模式下的按钮样式
    .dark-theme & {
      :deep(.el-button) {
        &:not(.el-button--primary) {
          background-color: #2d2d2d;
          border-color: #4c4d4f;
          color: #e0e0e0;
          
          &:hover {
            background-color: #3a3a3a;
            border-color: #79bbff;
          }
        }
      }
    }
  }
  
  .toolbar-center {
    display: flex;
    align-items: center;
    gap: 16px;
    
    .chapter-progress {
      font-size: 14px;
      color: #666;
      
      .dark-theme & {
        color: #999;
      }
    }
    
    // 深色模式下的按钮样式
    .dark-theme & {
      :deep(.el-button) {
        &:not(.el-button--primary):not(:disabled) {
          background-color: #2d2d2d;
          border-color: #4c4d4f;
          color: #e0e0e0;
          
          &:hover {
            background-color: #3a3a3a;
            border-color: #79bbff;
          }
        }
        
        &:disabled {
          background-color: #1a1a1a;
          border-color: #2a2a2a;
          color: #666;
        }
      }
    }
  }
  
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
    
    // 深色模式下的按钮样式
    .dark-theme & {
      :deep(.el-button) {
        &:not(.el-button--primary) {
          background-color: #2d2d2d;
          border-color: #4c4d4f;
          color: #e0e0e0;
          
          &:hover {
            background-color: #3a3a3a;
            border-color: #79bbff;
          }
        }
      }
      
      :deep(.el-input) {
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
            
            &::placeholder {
              color: #999;
            }
          }
        }
      }
    }
  }
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

// 悬浮按钮样式
.floating-button {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 56px;
  height: 56px;
  background-color: #409eff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
  cursor: pointer;
  z-index: 1001; // 确保在全屏阅读时也能显示
  transition: all 0.3s ease;
  color: white;
  
  &:hover {
    background-color: #337ecc;
    transform: scale(1.1);
    box-shadow: 0 6px 16px rgba(64, 158, 255, 0.6);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  .dark-theme & {
    background-color: #79bbff;
    
    &:hover {
      background-color: #a0cfff;
    }
  }
}

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 4;
  backdrop-filter: blur(2px);
}

.sidebar {
  width: 300px;
  border-right: 1px solid #e4e7ed;
  position: relative; // 为拖拽手柄定位
  background-color: #fff;
  
  .dark-theme & {
    border-right-color: #3a3a3a;
    background-color: #1a1a1a;
  }
  
  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #e4e7ed;
    background-color: #f8f9fa;
    
    .dark-theme & {
      border-bottom-color: #3a3a3a;
      background-color: #2a2a2a;
    }
    
    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: #303133;
      
      .dark-theme & {
        color: #e0e0e0;
      }
    }
  }
  
  // Element Plus 标签页深色模式样式
  .dark-theme & {
    :deep(.el-tabs--border-card) {
      background-color: #1a1a1a;
      border-color: #3a3a3a;
      
      .el-tabs__header {
        background-color: #2a2a2a;
        border-bottom-color: #3a3a3a;
      }
      
      .el-tabs__nav {
        border-color: #3a3a3a;
      }
      
      .el-tabs__item {
        background-color: #2a2a2a;
        border-color: #3a3a3a;
        color: #e0e0e0;
        
        &:hover {
          background-color: #3a3a3a;
          color: #79bbff;
        }
        
        &.is-active {
          background-color: #1a1a1a;
          color: #409eff;
          border-bottom-color: #1a1a1a;
        }
      }
      
      .el-tabs__content {
        background-color: #1a1a1a;
        color: #e0e0e0;
      }
    }
  }
  
  // 拖拽手柄样式
  .resize-handle {
    position: absolute;
    top: 0;
    right: -3px;
    width: 6px;
    height: 100%;
    cursor: col-resize;
    background-color: transparent;
    z-index: 10;
    
    &:hover {
      background-color: #409eff;
      opacity: 0.6;
    }
    
    &.resizing {
      background-color: #409eff;
      opacity: 0.8;
    }
    
    // 添加一个可视化的拖拽指示器
    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 2px;
      height: 30px;
      background-color: #ddd;
      border-radius: 1px;
      transition: background-color 0.3s;
    }
    
    &:hover::after,
    &.resizing::after {
      background-color: #409eff;
    }
    
    .dark-theme & {
      &::after {
        background-color: #666;
      }
      
      &:hover::after,
      &.resizing::after {
        background-color: #79bbff;
      }
    }
  }
}

.toc-container {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.toc-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.3s ease;
  border-radius: 6px;
  margin-bottom: 4px;
  
  &:hover {
    background-color: #f5f7fa;
    transform: translateX(4px);
  }
  
  &.active {
    background-color: #409eff;
    color: white;
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
    
    &:hover {
      background-color: #337ecc;
    }
  }
  
  .dark-theme & {
    border-bottom-color: #3a3a3a;
    
    &:hover {
      background-color: #3a3a3a;
    }
    
    &.active {
      background-color: #79bbff;
    }
  }
  
  .chapter-info {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    
    .chapter-number {
      margin-right: 8px;
      font-weight: 500;
      min-width: 30px;
      font-size: 12px;
      opacity: 0.8;
    }
    
    .chapter-title {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 1.4;
    }
  }
  
  .current-indicator {
    margin-left: 8px;
    opacity: 0.8;
  }
}

.bookmarks-container {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.bookmark-item {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  border-radius: 6px;
  margin-bottom: 4px;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: #f5f7fa;
    transform: translateX(4px);
    
    .bookmark-delete {
      opacity: 1;
    }
  }
  
  .dark-theme & {
    border-bottom-color: #3a3a3a;
    
    &:hover {
      background-color: #3a3a3a;
    }
  }
  
  .bookmark-content {
    flex: 1;
    min-width: 0;
    
    .bookmark-name {
      font-weight: 500;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #303133;
      
      .dark-theme & {
        color: #e0e0e0;
      }
    }
    
    .bookmark-info {
      font-size: 12px;
      color: #666;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      
      .dark-theme & {
        color: #999;
      }
    }
  }
  
  .bookmark-delete {
    opacity: 0;
    transition: opacity 0.3s;
    flex-shrink: 0;
    margin-left: 8px;
  }
}

.empty-bookmarks {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #999;
  
  p {
    margin: 8px 0 0 0;
    font-size: 14px;
    
    &.tip {
      font-size: 12px;
      color: #c0c4cc;
      margin-top: 12px;
      text-align: center;
      line-height: 1.4;
    }
  }
  
  .dark-theme & {
    color: #666;
    
    p.tip {
      color: #666;
    }
  }
}

.reading-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  
  // 全屏模式（工具栏隐藏时）
  &.full-screen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2;
    background-color: inherit;
  }
  
  .chapter-header {
    padding: 20px 40px;
    border-bottom: 1px solid #e4e7ed;
    
    .dark-theme & {
      border-bottom-color: #3a3a3a;
    }
    
    h2 {
      margin: 0;
      color: #303133;
      
      .dark-theme & {
        color: #e0e0e0;
      }
    }
  }
  
  .chapter-content {
    flex: 1;
    padding: 40px;
    overflow-y: auto;
    line-height: 1.8;
    
    // HTML格式化内容样式
    h1, h2, h3, h4, h5, h6 {
      margin: 2em 0 1em 0;
      font-weight: bold;
      line-height: 1.3;
      color: #303133;
      
      .dark-theme & {
        color: #e0e0e0;
      }
    }
    
    h1 { font-size: 2em; }
    h2 { font-size: 1.8em; }
    h3 { font-size: 1.6em; }
    h4 { font-size: 1.4em; }
    h5 { font-size: 1.2em; }
    h6 { font-size: 1.1em; }
    
    p {
      margin: 1em 0;
      text-indent: 2em; // 中文段落首行缩进
      text-align: justify; // 两端对齐
    }
    
    ul, ol {
      margin: 1em 0;
      padding-left: 2em;
      
      li {
        margin: 0.5em 0;
        line-height: 1.6;
      }
    }
    
    blockquote {
      margin: 1.5em 0;
      padding: 1em 1.5em;
      border-left: 4px solid #409eff;
      background-color: rgba(64, 158, 255, 0.1);
      font-style: italic;
      border-radius: 0 4px 4px 0;
      
      .dark-theme & {
        background-color: rgba(64, 158, 255, 0.2);
        border-left-color: #79bbff;
      }
    }
    
    strong, b {
      font-weight: bold;
      color: #303133;
      
      .dark-theme & {
        color: #e0e0e0;
      }
    }
    
    em, i {
      font-style: italic;
    }
    
    // 链接样式
    a {
      color: #409eff;
      text-decoration: none;
      transition: color 0.3s;
      
      &:hover {
        color: #79bbff;
        text-decoration: underline;
      }
      
      .dark-theme & {
        color: #79bbff;
        
        &:hover {
          color: #a0cfff;
        }
      }
    }
    
    // 桌面端图片样式
    img {
      max-width: 60%; // 桌面端图片适中大小
      height: auto;
      display: block;
      margin: 1.5em auto;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      
      &:hover {
        transform: scale(1.02);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      }
      
      .dark-theme & {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        
        &:hover {
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
        }
      }
    }
    
    .image-placeholder {
      display: block;
      margin: 1.5em auto;
      padding: 2em;
      background-color: #f8f9fa;
      border: 2px dashed #dee2e6;
      border-radius: 8px;
      text-align: center;
      max-width: 400px;
      transition: border-color 0.3s ease;
      
      &:hover {
        border-color: #409eff;
      }
      
      .dark-theme & {
        background-color: #2a2a2a;
        border-color: #4a4a4a;
        
        &:hover {
          border-color: #79bbff;
        }
      }
      
      .image-placeholder-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.8em;
        
        .image-icon {
          font-size: 2.5em;
          opacity: 0.6;
          color: #6c757d;
          
          .dark-theme & {
            color: #999;
          }
        }
        
        .image-text {
          color: #6c757d;
          font-size: 0.9em;
          
          .dark-theme & {
            color: #999;
          }
        }
      }
    }
    
    :deep(.search-highlight) {
      background-color: #ffff00;
      color: #000;
      padding: 2px 4px;
      border-radius: 2px;
    }
  }
  
  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.8);
    
    .dark-theme & {
      background-color: rgba(26, 26, 26, 0.8);
    }
    
    span {
      margin-top: 16px;
      color: #666;
    }
  }
}

.welcome-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .welcome-content {
    text-align: center;
    
    h1 {
      margin: 20px 0;
      color: #303133;
      
      .dark-theme & {
        color: #e0e0e0;
      }
    }
    
    p {
      margin-bottom: 30px;
      color: #666;
      
      .dark-theme & {
        color: #999;
      }
    }
    
    .mobile-tip {
      font-size: 14px;
      color: #409eff;
      background-color: #f0f9ff;
      padding: 12px 16px;
      border-radius: 8px;
      border-left: 4px solid #409eff;
      margin: 16px 0;
      
      .dark-theme & {
        background-color: #1a2332;
        color: #79bbff;
        border-left-color: #79bbff;
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .epub-reader {
    height: 100vh;
    height: 100dvh; // 动态视口高度，避免移动端地址栏影响
  }
  
  .toolbar {
    flex-direction: column;
    gap: 8px;
    padding: 8px 12px;
    position: relative;
    z-index: 10;
    min-height: 120px; // 设置最小高度
    
    .toolbar-left,
    .toolbar-center,
    .toolbar-right {
      width: 100%;
      justify-content: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .toolbar-center {
      order: 3; // 将进度信息放到最后
    }
    
    .book-title {
      font-size: 14px;
      text-align: center;
    }
    
    .chapter-progress {
      font-size: 12px;
    }
    
    // 移动端按钮优化
    .el-button {
      min-height: 44px; // 符合移动端触摸标准
      padding: 8px 12px;
      font-size: 14px;
    }
    
    // 搜索框优化
    .el-input {
      max-width: 200px;
    }
  }
  
  .main-content {
    flex-direction: column;
    position: relative;
  }
  
  .sidebar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    max-height: 60vh;
    border-right: none;
    border-bottom: 1px solid #e4e7ed;
    background-color: #fff;
    z-index: 5;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-radius: 0 0 12px 12px;
    
    .dark-theme & {
      border-bottom-color: #3a3a3a;
      background-color: #1a1a1a;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
    
    .sidebar-header {
      border-radius: 0;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    
    // 移动端标签页优化
    .el-tabs__header {
      margin: 0;
      
      .el-tabs__nav {
        display: flex;
        justify-content: space-around;
      }
      
      .el-tabs__item {
        padding: 12px 8px;
        font-size: 14px;
        min-width: 0;
        flex: 1;
        text-align: center;
      }
    }
    
    .el-tabs__content {
      padding: 12px;
      max-height: calc(60vh - 140px);
      overflow-y: auto;
      
      // 优化滚动条样式
      &::-webkit-scrollbar {
        width: 4px;
      }
      
      &::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 2px;
      }
      
      &::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 2px;
        
        &:hover {
          background: #a8a8a8;
        }
      }
      
      .dark-theme & {
        &::-webkit-scrollbar-track {
          background: #2a2a2a;
        }
        
        &::-webkit-scrollbar-thumb {
          background: #4a4a4a;
          
          &:hover {
            background: #6a6a6a;
          }
        }
      }
    }
    
    // 目录项优化
    .toc-item {
      padding: 16px 12px;
      font-size: 14px;
      min-height: 48px;
      margin-bottom: 2px;
      
      .chapter-info {
        .chapter-number {
          margin-right: 6px;
          min-width: 24px;
          font-size: 12px;
        }
        
        .chapter-title {
          line-height: 1.4;
          font-size: 14px;
        }
      }
      
      .current-indicator {
        margin-left: 4px;
      }
    }
    
    // 书签项优化
    .bookmark-item {
      padding: 16px 12px;
      min-height: 48px;
      margin-bottom: 2px;
      
      .bookmark-content {
        .bookmark-name {
          font-size: 14px;
          line-height: 1.4;
        }
        
        .bookmark-info {
          font-size: 12px;
          margin-top: 4px;
        }
      }
      
      .bookmark-delete {
        opacity: 1;
        position: static;
        margin-left: 8px;
        min-width: 32px;
        height: 32px;
      }
    }
  }
  
  .reading-area {
    transition: all 0.3s ease;
    
    // 当侧边栏显示时，为阅读区域添加上边距
    &.with-sidebar {
      margin-top: 60vh;
      height: calc(40vh - 120px); // 减去工具栏高度
      overflow: hidden;
    }
    
    // 当侧边栏收起时，占满剩余空间
    &:not(.with-sidebar) {
      height: calc(100vh - 120px); // 减去工具栏高度
    }
    
    // 全屏模式（工具栏隐藏时）
    &.full-screen {
      height: 100vh;
      height: 100dvh; // 动态视口高度
    }
    
    .chapter-header {
      padding: 12px 16px;
      
      h2 {
        font-size: 18px;
        line-height: 1.4;
      }
    }
    
    .chapter-content {
      padding: 16px;
      font-size: 16px;
      line-height: 1.6;
      
      // 移动端文本优化
      word-wrap: break-word;
      word-break: break-word;
      -webkit-hyphens: auto;
      hyphens: auto;
      
      // HTML格式化内容样式
      h1, h2, h3, h4, h5, h6 {
        margin: 1.5em 0 0.5em 0;
        font-weight: bold;
        line-height: 1.3;
      }
      
      h1 { font-size: 1.8em; }
      h2 { font-size: 1.6em; }
      h3 { font-size: 1.4em; }
      h4 { font-size: 1.2em; }
      h5 { font-size: 1.1em; }
      h6 { font-size: 1em; }
      
      p {
        margin: 0.8em 0;
        text-indent: 2em; // 中文段落首行缩进
      }
      
      ul, ol {
        margin: 1em 0;
        padding-left: 2em;
        
        li {
          margin: 0.3em 0;
        }
      }
      
      blockquote {
        margin: 1em 0;
        padding: 0.5em 1em;
        border-left: 3px solid #ddd;
        background-color: rgba(0, 0, 0, 0.05);
        font-style: italic;
      }
      
      strong, b {
        font-weight: bold;
      }
      
      em, i {
        font-style: italic;
      }
      
      // 移动端图片优化
      img {
        max-width: 80%; // 移动端图片稍大一些
        height: auto;
        display: block;
        margin: 1em auto;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      
      .image-placeholder {
        max-width: 250px; // 移动端占位符更小
        padding: 1.5em;
        
        .image-placeholder-content {
          .image-icon {
            font-size: 1.5em;
          }
          
          .image-text {
            font-size: 0.8em;
          }
        }
      }
      
      // 搜索高亮样式
      .search-highlight {
        background-color: yellow;
        color: black;
        padding: 0 2px;
        border-radius: 2px;
      }
    }
  }
  
  .welcome-screen {
    padding: 20px;
    
    .welcome-content {
      h1 {
        font-size: 24px;
        margin: 16px 0;
      }
      
      p {
        font-size: 14px;
        line-height: 1.5;
        margin-bottom: 20px;
      }
      
      .el-button {
        min-height: 44px;
        padding: 12px 24px;
        font-size: 16px;
      }
    }
  }
  
  // Dialog深色模式样式
  .dark-theme :deep(.el-dialog) {
    background-color: #2d2d2d;
    border: 1px solid #4c4d4f;
    
    .el-dialog__header {
      background-color: #2a2a2a;
      border-bottom: 1px solid #4c4d4f;
      
      .el-dialog__title {
        color: #e0e0e0;
      }
      
      .el-dialog__headerbtn {
        .el-dialog__close {
          color: #e0e0e0;
          
          &:hover {
            color: #79bbff;
          }
        }
      }
    }
    
    .el-dialog__body {
      background-color: #2d2d2d;
      color: #e0e0e0;
    }
    
    .el-dialog__footer {
      background-color: #2a2a2a;
      border-top: 1px solid #4c4d4f;
    }
  }
  
  .dark-theme :deep(.el-form) {
    .el-form-item__label {
      color: #e0e0e0;
    }
  }
}
</style> 