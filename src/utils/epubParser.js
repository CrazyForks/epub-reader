import JSZip from 'jszip'

/**
 * 解析EPUB文件
 * @param {File} file - EPUB文件
 * @returns {Promise<Object>} 解析后的书籍数据
 */
export async function parseEpub(file) {
  try {
    const zip = await JSZip.loadAsync(file)
    
    // 读取META-INF/container.xml获取OPF文件路径
    const containerXml = await zip.file('META-INF/container.xml').async('text')
    const container = parseXml(containerXml)
    
    const rootfile = container.querySelector('rootfile')
    const opfPath = rootfile.getAttribute('full-path')
    const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1)
    
    // 读取OPF文件
    const opfXml = await zip.file(opfPath).async('text')
    const opf = parseXml(opfXml)
    
    // 提取书籍元数据
    const metadata = extractMetadata(opf)
    
    // 提取章节信息
    const manifest = extractManifest(opf, opfDir)
    const spine = extractSpine(opf)
    
    // 读取目录文件(NCX或NAV)
    const toc = await extractToc(zip, manifest, opfDir)
    
    // 按spine顺序组织章节
    const chapters = await organizeChapters(zip, spine, manifest, toc)
    
    return {
      title: metadata.title,
      author: metadata.author,
      language: metadata.language,
      publisher: metadata.publisher,
      description: metadata.description,
      chapters,
      toc
    }
  } catch (error) {
    throw new Error(`EPUB解析失败: ${error.message}`)
  }
}

/**
 * 解析XML字符串 - 使用浏览器原生DOMParser
 */
function parseXml(xmlString) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')
    
    // 检查解析错误
    const parseError = doc.querySelector('parsererror')
    if (parseError) {
      throw new Error(`XML解析错误: ${parseError.textContent}`)
    }
    
    return doc
  } catch (error) {
    throw new Error(`XML解析失败: ${error.message}`)
  }
}

/**
 * 提取书籍元数据
 */
function extractMetadata(opf) {
  try {
    const metadata = opf.querySelector('metadata')
    
    return {
      title: getMetadataValue(metadata, 'title') || '未知标题',
      author: getMetadataValue(metadata, 'creator') || '未知作者',
      language: getMetadataValue(metadata, 'language') || 'zh',
      publisher: getMetadataValue(metadata, 'publisher') || '',
      description: getMetadataValue(metadata, 'description') || ''
    }
  } catch (error) {
    console.warn('提取元数据失败:', error)
    return {
      title: '未知标题',
      author: '未知作者',
      language: 'zh',
      publisher: '',
      description: ''
    }
  }
}

/**
 * 获取元数据值
 */
function getMetadataValue(metadata, tagName) {
  try {
    // 尝试不同的命名空间前缀
    const selectors = [
      `dc\\:${tagName}`,
      tagName,
      `*[*|${tagName}]`
    ]
    
    for (const selector of selectors) {
      const element = metadata.querySelector(selector)
      if (element) {
        return element.textContent.trim()
      }
    }
    
    return null
  } catch (error) {
    console.warn(`获取元数据 ${tagName} 失败:`, error)
    return null
  }
}

/**
 * 提取manifest信息
 */
function extractManifest(opf, opfDir) {
  const manifest = {}
  try {
    const items = opf.querySelectorAll('manifest item')
    
    items.forEach(item => {
      const id = item.getAttribute('id')
      const href = item.getAttribute('href')
      const mediaType = item.getAttribute('media-type')
      
      if (id && href) {
        manifest[id] = {
          id,
          href: opfDir + href,
          mediaType: mediaType || 'unknown'
        }
      }
    })
  } catch (error) {
    console.warn('提取manifest失败:', error)
  }
  
  return manifest
}

/**
 * 提取spine信息
 */
function extractSpine(opf) {
  const spine = []
  try {
    const items = opf.querySelectorAll('spine itemref')
    
    items.forEach(item => {
      const idref = item.getAttribute('idref')
      if (idref) {
        spine.push(idref)
      }
    })
  } catch (error) {
    console.warn('提取spine失败:', error)
  }
  
  return spine
}

/**
 * 提取目录信息
 */
async function extractToc(zip, manifest, opfDir) {
  try {
    // 查找NCX文件
    const ncxItem = Object.values(manifest).find(item => 
      item.mediaType === 'application/x-dtbncx+xml'
    )
    
    if (ncxItem) {
      try {
        const ncxXml = await zip.file(ncxItem.href).async('text')
        const ncx = parseXml(ncxXml)
        return parseNcxToc(ncx)
      } catch (error) {
        console.warn('解析NCX文件失败:', error)
      }
    }
    
    // 查找NAV文件
    const navItem = Object.values(manifest).find(item => 
      item.mediaType === 'application/xhtml+xml' && 
      item.href.includes('nav')
    )
    
    if (navItem) {
      try {
        const navHtml = await zip.file(navItem.href).async('text')
        return parseNavToc(navHtml)
      } catch (error) {
        console.warn('解析NAV文件失败:', error)
      }
    }
    
    return []
  } catch (error) {
    console.warn('提取目录失败:', error)
    return []
  }
}

/**
 * 解析NCX目录
 */
function parseNcxToc(ncx) {
  const toc = []
  try {
    const navPoints = ncx.querySelectorAll('navMap > navPoint')
    
    navPoints.forEach(point => {
      try {
        toc.push(parseNavPoint(point))
      } catch (error) {
        console.warn('解析导航点失败:', error)
      }
    })
  } catch (error) {
    console.warn('解析NCX目录失败:', error)
  }
  
  return toc
}

/**
 * 解析导航点
 */
function parseNavPoint(navPoint) {
  try {
    const id = navPoint.getAttribute('id')
    const playOrder = parseInt(navPoint.getAttribute('playOrder')) || 0
    
    const labelElement = navPoint.querySelector('navLabel text')
    const label = labelElement ? labelElement.textContent.trim() : '未知章节'
    
    const contentElement = navPoint.querySelector('content')
    const src = contentElement ? contentElement.getAttribute('src') : ''
    
    const item = {
      id: id || 'unknown',
      playOrder,
      label,
      src,
      children: []
    }
    
    // 处理子导航点
    const childNavPoints = navPoint.querySelectorAll(':scope > navPoint')
    childNavPoints.forEach(child => {
      try {
        item.children.push(parseNavPoint(child))
      } catch (error) {
        console.warn('解析子导航点失败:', error)
      }
    })
    
    return item
  } catch (error) {
    console.warn('解析导航点失败:', error)
    return {
      id: 'unknown',
      playOrder: 0,
      label: '未知章节',
      src: '',
      children: []
    }
  }
}

/**
 * 解析NAV目录
 */
function parseNavToc(navHtml) {
  const toc = []
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(navHtml, 'text/html')
    const navElement = doc.querySelector('nav[epub\\:type="toc"]') || doc.querySelector('nav')
    
    if (navElement) {
      const links = navElement.querySelectorAll('a')
      links.forEach((link, index) => {
        try {
          toc.push({
            id: `nav-${index}`,
            playOrder: index + 1,
            label: link.textContent.trim() || `章节 ${index + 1}`,
            src: link.getAttribute('href') || '',
            children: []
          })
        } catch (error) {
          console.warn('解析NAV链接失败:', error)
        }
      })
    }
  } catch (error) {
    console.warn('解析NAV目录失败:', error)
  }
  
  return toc
}

/**
 * 组织章节内容
 */
async function organizeChapters(zip, spine, manifest, toc) {
  const chapters = []
  
  for (let i = 0; i < spine.length; i++) {
    try {
      const itemId = spine[i]
      const item = manifest[itemId]
      
      if (item && item.mediaType === 'application/xhtml+xml') {
        try {
          const htmlContent = await zip.file(item.href).async('text')
          const textContent = extractTextFromHtml(htmlContent)
          
          // 从目录中查找对应的标题
          const tocItem = findTocItem(toc, item.href)
          const title = tocItem ? tocItem.label : `第${i + 1}章`
          
          chapters.push({
            id: itemId,
            title,
            href: item.href,
            content: textContent,
            htmlContent,
            order: i
          })
        } catch (error) {
          console.warn(`读取章节失败: ${item.href}`, error)
          // 添加一个占位章节
          chapters.push({
            id: itemId,
            title: `第${i + 1}章 (加载失败)`,
            href: item.href,
            content: '章节内容加载失败',
            htmlContent: '<p>章节内容加载失败</p>',
            order: i
          })
        }
      }
    } catch (error) {
      console.warn(`处理章节 ${i} 失败:`, error)
    }
  }
  
  return chapters
}

/**
 * 从HTML中提取文本内容
 */
function extractTextFromHtml(html) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    
    // 移除script和style标签
    const scripts = doc.querySelectorAll('script, style')
    scripts.forEach(el => el.remove())
    
    // 获取body内容，如果没有body则获取整个文档
    const body = doc.body || doc.documentElement
    
    // 提取文本并清理格式
    let text = body.textContent || body.innerText || ''
    
    // 清理多余的空白字符
    text = text.replace(/\s+/g, ' ').trim()
    
    return text || '内容为空'
  } catch (error) {
    console.warn('HTML文本提取失败:', error)
    // 简单的HTML标签移除
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() || '内容解析失败'
  }
}

/**
 * 在目录中查找对应的项目
 */
function findTocItem(toc, href) {
  try {
    const filename = href.split('/').pop()
    
    for (const item of toc) {
      if (item.src && item.src.includes(filename)) {
        return item
      }
      if (item.children && item.children.length > 0) {
        const found = findTocItem(item.children, href)
        if (found) return found
      }
    }
  } catch (error) {
    console.warn('查找目录项失败:', error)
  }
  
  return null
} 