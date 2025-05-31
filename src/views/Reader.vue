<template>
  <div class="epub-reader" :class="{ 'dark-theme': isDarkTheme }">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-button @click="openFile" type="primary" :icon="FolderOpened">
          打开EPUB文件
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
      <!-- 左侧面板 -->
      <div class="sidebar" v-if="currentBook">
        <el-tabs v-model="activeTab" type="border-card">
          <!-- 目录 -->
          <el-tab-pane label="目录" name="toc">
            <div class="toc-container">
              <div
                v-for="(chapter, index) in chapters"
                :key="chapter.id"
                class="toc-item"
                :class="{ active: index === currentChapterIndex }"
                @click="goToChapter(index)"
              >
                <span class="chapter-number">{{ index + 1 }}.</span>
                <span class="chapter-title">{{ chapter.title }}</span>
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
                @dblclick="goToBookmark(bookmark)"
              >
                <div class="bookmark-name">{{ bookmark.name }}</div>
                <div class="bookmark-info">
                  {{ bookmark.chapterTitle }}
                </div>
                <el-button
                  size="small"
                  type="danger"
                  :icon="Delete"
                  @click.stop="removeBookmark(bookmark.id)"
                />
              </div>
              <div v-if="bookmarks.length === 0" class="empty-bookmarks">
                暂无书签
              </div>
            </div>
          </el-tab-pane>
          
          <!-- 语音控制 -->
          <el-tab-pane label="语音" name="speech">
            <SpeechControl />
          </el-tab-pane>
        </el-tabs>
      </div>
      
      <!-- 阅读区域 -->
      <div class="reading-area" v-if="currentBook">
        <div class="chapter-header">
          <h2>{{ currentChapter?.title }}</h2>
        </div>
        
        <div
          class="chapter-content"
          :style="{ fontSize: fontSize + 'px' }"
          v-html="highlightedContent"
          ref="contentRef"
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
          <el-icon size="64" color="#409eff"><Reading /></el-icon>
          <h1>EPUB阅读器</h1>
          <p>点击"打开EPUB文件"开始阅读</p>
          <el-button @click="openFile" type="primary" size="large">
            选择文件
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
  Plus,
  Minus,
  Moon,
  Sunny,
  Search,
  Star,
  Delete,
  Reading
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
  let content = currentChapterContent.value
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

const nextChapter = () => {
  epubStore.nextChapter()
}

const prevChapter = () => {
  epubStore.prevChapter()
}

const goToChapter = (index) => {
  epubStore.goToChapter(index)
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

const goToBookmark = (bookmark) => {
  epubStore.goToBookmark(bookmark)
}

// 键盘快捷键
const handleKeydown = (event) => {
  if (!currentBook.value) return
  
  switch (event.key) {
    case 'ArrowLeft':
      if (event.ctrlKey) {
        prevChapter()
        event.preventDefault()
      }
      break
    case 'ArrowRight':
      if (event.ctrlKey) {
        nextChapter()
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
})

// 监听章节变化，加载书签
watch(currentBook, (newBook) => {
  if (newBook) {
    epubStore.loadBookmarks()
  }
}, { immediate: true })
</script>

<style lang="scss" scoped>
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
  }
  
  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 300px;
  border-right: 1px solid #e4e7ed;
  
  .dark-theme & {
    border-right-color: #3a3a3a;
  }
  
  .toc-container {
    max-height: calc(100vh - 200px);
    overflow-y: auto;
  }
  
  .toc-item {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    border-bottom: 1px solid #f0f0f0;
    
    &:hover {
      background-color: #f5f7fa;
    }
    
    &.active {
      background-color: #409eff;
      color: white;
    }
    
    .dark-theme & {
      border-bottom-color: #3a3a3a;
      
      &:hover {
        background-color: #3a3a3a;
      }
    }
    
    .chapter-number {
      margin-right: 8px;
      font-weight: 500;
      min-width: 30px;
    }
    
    .chapter-title {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
  
  .bookmarks-container {
    max-height: calc(100vh - 200px);
    overflow-y: auto;
  }
  
  .bookmark-item {
    display: flex;
    flex-direction: column;
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    position: relative;
    
    &:hover {
      background-color: #f5f7fa;
      
      .el-button {
        opacity: 1;
      }
    }
    
    .dark-theme & {
      border-bottom-color: #3a3a3a;
      
      &:hover {
        background-color: #3a3a3a;
      }
    }
    
    .bookmark-name {
      font-weight: 500;
      margin-bottom: 4px;
    }
    
    .bookmark-info {
      font-size: 12px;
      color: #666;
      
      .dark-theme & {
        color: #999;
      }
    }
    
    .el-button {
      position: absolute;
      top: 8px;
      right: 8px;
      opacity: 0;
      transition: opacity 0.3s;
    }
  }
  
  .empty-bookmarks {
    text-align: center;
    color: #999;
    padding: 40px 20px;
  }
}

.reading-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  
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
  }
}

// 响应式设计
@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    gap: 12px;
    
    .toolbar-left,
    .toolbar-center,
    .toolbar-right {
      width: 100%;
      justify-content: center;
    }
  }
  
  .sidebar {
    width: 250px;
  }
  
  .chapter-content {
    padding: 20px;
  }
}
</style> 