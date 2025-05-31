import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { parseEpub } from '@/utils/epubParser'

export const useEpubStore = defineStore('epub', () => {
  // 状态
  const currentBook = ref(null)
  const chapters = ref([])
  const currentChapterIndex = ref(0)
  const currentChapterContent = ref('')
  const isLoading = ref(false)
  const error = ref(null)
  const bookmarks = ref([])
  const readingProgress = ref({})

  // 计算属性
  const currentChapter = computed(() => {
    return chapters.value[currentChapterIndex.value] || null
  })

  const totalChapters = computed(() => chapters.value.length)

  const hasNextChapter = computed(() => {
    return currentChapterIndex.value < chapters.value.length - 1
  })

  const hasPrevChapter = computed(() => {
    return currentChapterIndex.value > 0
  })

  // 动作
  const loadEpubFile = async (file) => {
    isLoading.value = true
    error.value = null
    
    try {
      const bookData = await parseEpub(file)
      currentBook.value = bookData
      chapters.value = bookData.chapters
      currentChapterIndex.value = 0
      
      // 加载第一章内容
      if (chapters.value.length > 0) {
        await loadChapterContent(0)
      }
      
      // 加载阅读进度
      loadReadingProgress()
      
    } catch (err) {
      error.value = err.message
      console.error('加载EPUB文件失败:', err)
    } finally {
      isLoading.value = false
    }
  }

  const loadChapterContent = async (chapterIndex) => {
    if (chapterIndex < 0 || chapterIndex >= chapters.value.length) {
      return
    }
    
    isLoading.value = true
    try {
      const chapter = chapters.value[chapterIndex]
      currentChapterContent.value = chapter.content || ''
      currentChapterIndex.value = chapterIndex
      
      // 保存阅读进度
      saveReadingProgress()
      
    } catch (err) {
      error.value = err.message
      console.error('加载章节内容失败:', err)
    } finally {
      isLoading.value = false
    }
  }

  const nextChapter = async () => {
    if (hasNextChapter.value) {
      await loadChapterContent(currentChapterIndex.value + 1)
    }
  }

  const prevChapter = async () => {
    if (hasPrevChapter.value) {
      await loadChapterContent(currentChapterIndex.value - 1)
    }
  }

  const goToChapter = async (index) => {
    await loadChapterContent(index)
  }

  // 书签管理
  const addBookmark = (name, position = 0) => {
    if (!currentBook.value) return
    
    const bookmark = {
      id: Date.now(),
      name: name || `书签 ${bookmarks.value.length + 1}`,
      chapterIndex: currentChapterIndex.value,
      chapterTitle: currentChapter.value?.title || '',
      position,
      createdAt: new Date().toISOString()
    }
    
    bookmarks.value.push(bookmark)
    saveBookmarks()
  }

  const removeBookmark = (bookmarkId) => {
    const index = bookmarks.value.findIndex(b => b.id === bookmarkId)
    if (index > -1) {
      bookmarks.value.splice(index, 1)
      saveBookmarks()
    }
  }

  const goToBookmark = async (bookmark) => {
    await loadChapterContent(bookmark.chapterIndex)
    // 这里可以添加滚动到特定位置的逻辑
  }

  // 搜索功能
  const searchInCurrentChapter = (keyword) => {
    if (!keyword || !currentChapterContent.value) {
      return []
    }
    
    const content = currentChapterContent.value.toLowerCase()
    const searchTerm = keyword.toLowerCase()
    const results = []
    let index = 0
    
    while ((index = content.indexOf(searchTerm, index)) !== -1) {
      const start = Math.max(0, index - 50)
      const end = Math.min(content.length, index + searchTerm.length + 50)
      const context = currentChapterContent.value.substring(start, end)
      
      results.push({
        index,
        context,
        chapterIndex: currentChapterIndex.value,
        chapterTitle: currentChapter.value?.title || ''
      })
      
      index += searchTerm.length
    }
    
    return results
  }

  // 数据持久化
  const saveReadingProgress = () => {
    if (!currentBook.value) return
    
    const progress = {
      bookTitle: currentBook.value.title,
      chapterIndex: currentChapterIndex.value,
      lastReadAt: new Date().toISOString()
    }
    
    readingProgress.value[currentBook.value.title] = progress
    localStorage.setItem('epub-reader-progress', JSON.stringify(readingProgress.value))
  }

  const loadReadingProgress = () => {
    try {
      const saved = localStorage.getItem('epub-reader-progress')
      if (saved) {
        readingProgress.value = JSON.parse(saved)
        
        // 恢复当前书籍的阅读进度
        if (currentBook.value && readingProgress.value[currentBook.value.title]) {
          const progress = readingProgress.value[currentBook.value.title]
          currentChapterIndex.value = progress.chapterIndex || 0
          loadChapterContent(currentChapterIndex.value)
        }
      }
    } catch (error) {
      console.error('加载阅读进度失败:', error)
    }
  }

  const saveBookmarks = () => {
    if (!currentBook.value) return
    
    const bookmarkData = {
      [currentBook.value.title]: bookmarks.value
    }
    
    // 合并现有书签数据
    try {
      const existing = localStorage.getItem('epub-reader-bookmarks')
      if (existing) {
        const existingData = JSON.parse(existing)
        Object.assign(existingData, bookmarkData)
        localStorage.setItem('epub-reader-bookmarks', JSON.stringify(existingData))
      } else {
        localStorage.setItem('epub-reader-bookmarks', JSON.stringify(bookmarkData))
      }
    } catch (error) {
      console.error('保存书签失败:', error)
    }
  }

  const loadBookmarks = () => {
    if (!currentBook.value) return
    
    try {
      const saved = localStorage.getItem('epub-reader-bookmarks')
      if (saved) {
        const bookmarkData = JSON.parse(saved)
        bookmarks.value = bookmarkData[currentBook.value.title] || []
      }
    } catch (error) {
      console.error('加载书签失败:', error)
    }
  }

  // 清理数据
  const clearCurrentBook = () => {
    currentBook.value = null
    chapters.value = []
    currentChapterIndex.value = 0
    currentChapterContent.value = ''
    bookmarks.value = []
    error.value = null
  }

  return {
    // 状态
    currentBook,
    chapters,
    currentChapterIndex,
    currentChapterContent,
    isLoading,
    error,
    bookmarks,
    readingProgress,
    // 计算属性
    currentChapter,
    totalChapters,
    hasNextChapter,
    hasPrevChapter,
    // 动作
    loadEpubFile,
    loadChapterContent,
    nextChapter,
    prevChapter,
    goToChapter,
    addBookmark,
    removeBookmark,
    goToBookmark,
    searchInCurrentChapter,
    saveReadingProgress,
    loadReadingProgress,
    saveBookmarks,
    loadBookmarks,
    clearCurrentBook
  }
}) 