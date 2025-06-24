# EPUB阅读器

一个基于Vue 3开发的功能完整的EPUB电子书阅读器，支持桌面端和移动端，提供优秀的阅读体验。

![EPUB阅读器截图](https://via.placeholder.com/800x400/409eff/ffffff?text=EPUB%E9%98%85%E8%AF%BB%E5%99%A8)

## ✨ 主要特性

### 📚 核心功能
- **EPUB文件支持**: 完整支持EPUB 2.0和3.0格式
- **章节导航**: 左侧目录树，支持快速跳转
- **智能书签**: 添加、管理和快速跳转书签
- **全文搜索**: 在当前章节中搜索关键词，支持高亮显示
- **阅读进度**: 自动保存和恢复阅读位置
- **图片显示**: 支持EPUB中的图片显示，自适应屏幕尺寸

### 🎨 界面体验
- **主题切换**: 浅色/深色主题，护眼阅读
- **字体调节**: 8-24px字体大小调整
- **响应式设计**: 完美适配桌面端、平板和手机
- **现代UI**: 基于Element Plus的美观界面
- **格式保留**: 保留原书的标题、段落、列表等格式
- **图片优化**: 图片自动缩放，加载失败时显示友好占位符

### 🔊 语音功能
- **TTS朗读**: 支持多种语音和语速调节
- **智能断句**: 自然的语音朗读体验
- **后台播放**: 不阻塞界面操作

### 📱 移动端优化
- **触摸手势**: 左右滑动翻页
- **侧边栏收起**: 移动端可收起侧边栏，最大化阅读空间
- **触摸友好**: 44px最小触摸区域，符合移动端标准
- **动态视口**: 自适应移动端浏览器地址栏

## 🚀 快速开始

### 环境要求
- Node.js 16.0+
- npm 7.0+

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/your-username/epub-reader.git
cd epub-reader
```

2. **安装依赖**
```bash
npm install
```

3. **启动开发服务器**
```bash
npm run dev
```

4. **访问应用**
- 本地访问: http://localhost:3000
- 局域网访问: http://your-ip:3000

### 生产构建
```bash
npm run build
```

## 📖 使用指南

### 基本操作

1. **打开EPUB文件**
   - 点击"打开EPUB文件"按钮
   - 选择本地的.epub文件

2. **阅读导航**
   - 使用左侧目录切换章节
   - 点击"上一章/下一章"按钮
   - 键盘快捷键: Ctrl+← / Ctrl+→

3. **个性化设置**
   - 字体大小: 点击A+/A-按钮或使用Ctrl+=/Ctrl+-
   - 主题切换: 点击月亮/太阳图标
   - 搜索文本: 在搜索框输入关键词

### 移动端使用

1. **手势操作**
   - 左右滑动: 翻页
   - 点击"展开/收起": 控制侧边栏显示

2. **优化体验**
   - 竖屏: 侧边栏在上方，阅读区域在下方
   - 横屏: 类似桌面端的左右布局
   - 自动适配不同屏幕尺寸

### 高级功能

1. **书签管理**
   - 添加书签: 点击"添加书签"按钮
   - 跳转书签: 双击书签项
   - 删除书签: 点击书签旁的删除按钮

2. **语音朗读**
   - 切换到"语音"标签页
   - 选择语音和调节语速
   - 支持播放/暂停/停止控制

3. **搜索功能**
   - 在搜索框输入关键词
   - 按回车键开始搜索
   - 自动滚动到第一个匹配位置

## 🛠️ 技术栈

### 前端框架
- **Vue 3**: 现代化的前端框架
- **Vite**: 快速的构建工具
- **Element Plus**: UI组件库
- **Pinia**: 状态管理

### 核心库
- **JSZip**: EPUB文件解析
- **xml2js**: XML内容解析
- **Web Speech API**: 语音合成

### 样式
- **SCSS**: CSS预处理器
- **响应式设计**: 移动端优先

## 🌐 浏览器兼容性

### 桌面端
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

### 移动端
- **iOS**: iOS 10.0+ (iPhone 7及以上设备)
- **Android**: Android 5.0+ (2014年后的设备)
- **移动端浏览器**: Chrome Mobile, Safari Mobile, Firefox Mobile, Edge Mobile

### 兼容性说明
- Vue 3不支持IE11，因此本项目也不支持IE浏览器
- 不兼容的设备主要是6-8年前的老旧设备，影响用户占比约3-4%
- 语音功能依赖浏览器的Web Speech API，部分浏览器可能不支持

## 📱 移动端特性

### 响应式设计
- 自适应手机、平板、桌面等不同屏幕尺寸
- 针对移动端优化的触摸友好界面
- 支持横屏和竖屏模式

### 移动端手势
- **左右滑动翻页**: 在阅读区域左右滑动可以切换章节
- **触摸优化**: 按钮和控件符合移动端触摸标准(44px最小触摸区域)
- **动态视口**: 自动适应移动端浏览器地址栏的显示/隐藏

### 移动端布局
- **竖屏模式**: 侧边栏在上方，阅读区域在下方，可收起侧边栏
- **横屏模式**: 左右布局，与桌面端类似
- **小屏优化**: 针对iPhone SE等小屏设备的特别优化

## ⌨️ 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl + ← | 上一章 |
| Ctrl + → | 下一章 |
| Ctrl + = | 增大字体 |
| Ctrl + - | 减小字体 |

## 📁 项目结构

```
epub-reader/
├── public/                 # 静态资源
├── src/
│   ├── components/         # 组件
│   │   └── SpeechControl.vue
│   ├── stores/            # 状态管理
│   │   ├── epub.js        # EPUB文件管理
│   │   └── settings.js    # 设置管理
│   ├── utils/             # 工具函数
│   │   ├── epubParser.js  # EPUB解析
│   │   └── speechSynthesis.js
│   ├── views/             # 页面
│   │   └── Reader.vue     # 主阅读器
│   ├── router/            # 路由
│   ├── styles/            # 样式
│   └── main.js           # 入口文件
├── package.json
├── vite.config.js
└── README.md
```

## 🔧 开发指南

### 本地开发

1. **启动开发服务器**
```bash
npm run dev
```

2. **局域网测试**
- 服务器会自动绑定到 0.0.0.0:3000
- 手机访问: http://your-computer-ip:3000

3. **热重载**
- 修改代码后自动刷新
- 支持样式和组件的热更新

### 构建部署

1. **生产构建**
```bash
npm run build
```

2. **预览构建结果**
```bash
npm run preview
```

3. **部署**
- 将 `dist` 目录部署到任何静态文件服务器
- 支持 Nginx, Apache, GitHub Pages 等

## 🐛 故障排除

### 常见问题

1. **EPUB文件无法打开**
   - 确保文件格式正确(.epub)
   - 检查文件是否损坏
   - 尝试重新下载文件

2. **语音功能不工作**
   - 检查浏览器是否支持Web Speech API
   - 确保系统有可用的语音引擎
   - 在Chrome中需要HTTPS或localhost

3. **移动端显示异常**
   - 清除浏览器缓存
   - 确保浏览器版本符合要求
   - 检查网络连接

### 性能优化

1. **大文件处理**
   - 项目支持大型EPUB文件
   - 使用流式解析，避免内存溢出

2. **移动端优化**
   - 启用硬件加速
   - 优化触摸响应
   - 减少重绘和回流

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Vue.js](https://vuejs.org/) - 渐进式JavaScript框架
- [Element Plus](https://element-plus.org/) - Vue 3组件库
- [JSZip](https://stuk.github.io/jszip/) - JavaScript ZIP库
- [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js) - XML解析器

## 📞 联系方式

如果您有任何问题或建议，请通过以下方式联系：

- 提交 [Issue](https://github.com/your-username/epub-reader/issues)
- 发送邮件: your-email@example.com

---

⭐ 如果这个项目对您有帮助，请给它一个星标！ 