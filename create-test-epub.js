const JSZip = require('jszip');
const fs = require('fs');

// 创建测试EPUB文件
async function createTestEpub() {
  const zip = new JSZip();
  
  // mimetype文件
  zip.file('mimetype', 'application/epub+zip');
  
  // META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.folder('META-INF').file('container.xml', containerXml);
  
  // OEBPS/content.opf
  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>测试EPUB电子书</dc:title>
    <dc:creator>AI助手</dc:creator>
    <dc:identifier id="bookid">test-epub-001</dc:identifier>
    <dc:language>zh-CN</dc:language>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter3" href="chapter3.xhtml" media-type="application/xhtml+xml"/>
    <item id="test-image" href="images/test-image.svg" media-type="image/svg+xml"/>
    <item id="diagram" href="images/diagram.svg" media-type="image/svg+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="chapter1"/>
    <itemref idref="chapter2"/>
    <itemref idref="chapter3"/>
  </spine>
</package>`;
  zip.folder('OEBPS').file('content.opf', contentOpf);
  
  // OEBPS/toc.ncx
  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="test-epub-001"/>
  </head>
  <docTitle>
    <text>测试EPUB电子书</text>
  </docTitle>
  <navMap>
    <navPoint id="chapter1" playOrder="1">
      <navLabel><text>第一章：欢迎使用EPUB阅读器</text></navLabel>
      <content src="chapter1.xhtml"/>
    </navPoint>
    <navPoint id="chapter2" playOrder="2">
      <navLabel><text>第二章：功能介绍</text></navLabel>
      <content src="chapter2.xhtml"/>
    </navPoint>
    <navPoint id="chapter3" playOrder="3">
      <navLabel><text>第三章：移动端测试</text></navLabel>
      <content src="chapter3.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`;
  zip.folder('OEBPS').file('toc.ncx', tocNcx);
  
  // 章节内容
  const chapter1 = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>第一章：欢迎使用EPUB阅读器</title>
</head>
<body>
  <h1>第一章：欢迎使用EPUB阅读器</h1>
  <p>欢迎使用这个基于Vue 3开发的EPUB阅读器！这是一个功能完整的电子书阅读应用。</p>
  
  <div style="text-align: center; margin: 2em 0;">
    <img src="images/test-image.svg" alt="EPUB阅读器测试图片" />
    <p><em>图1：EPUB阅读器测试图片</em></p>
  </div>
  
  <p>本阅读器支持以下功能：</p>
  <ul>
    <li>📚 EPUB文件解析和显示</li>
    <li>📖 章节导航和目录</li>
    <li>🔍 文本搜索和高亮</li>
    <li>🔖 书签系统</li>
    <li>🎨 字体大小调整</li>
    <li>🌙 浅色/深色主题切换</li>
    <li>🔊 语音朗读功能</li>
    <li>📱 移动端优化</li>
    <li>🖼️ 图片显示支持</li>
  </ul>
  <p>这个测试文件包含了多个章节，您可以使用左侧的目录进行导航，或者使用顶部的翻页按钮。</p>
  <p>在移动端，您还可以使用左右滑动手势来翻页！</p>
  
  <h2>图片显示测试</h2>
  <p>下面是另一个测试图片，展示了EPUB阅读器的图片显示能力：</p>
  
  <div style="text-align: center; margin: 2em 0;">
    <img src="images/diagram.svg" alt="渐变色图表示例" />
    <p><em>图2：渐变色图表示例</em></p>
  </div>
  
  <p>图片会自动适应屏幕宽度，在移动端也能正常显示。如果图片加载失败，会显示友好的占位符。</p>
</body>
</html>`;
  
  const chapter2 = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>第二章：功能介绍</title>
</head>
<body>
  <h1>第二章：功能介绍</h1>
  <h2>阅读功能</h2>
  <p>本阅读器提供了丰富的阅读功能，让您享受舒适的阅读体验。</p>
  
  <h3>字体调节</h3>
  <p>您可以使用工具栏上的A+和A-按钮来调整字体大小，支持8-24px的字体范围。</p>
  
  <h3>主题切换</h3>
  <p>支持浅色和深色两种主题模式，点击月亮/太阳图标即可切换。深色主题在夜间阅读时更加护眼。</p>
  
  <h3>搜索功能</h3>
  <p>在搜索框中输入关键词，按回车键即可在当前章节中搜索。搜索结果会以黄色高亮显示，并自动滚动到第一个匹配位置。</p>
  
  <h3>书签系统</h3>
  <p>您可以在任意位置添加书签，方便下次快速定位。书签支持自定义名称，并且会自动保存。</p>
  
  <h3>语音朗读</h3>
  <p>切换到"语音"标签页，可以使用TTS功能朗读文本。支持语音选择、语速调节等功能。</p>
  
  <p>试试搜索"阅读器"这个关键词，看看搜索功能的效果！</p>
</body>
</html>`;
  
  const chapter3 = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>第三章：移动端测试</title>
</head>
<body>
  <h1>第三章：移动端测试</h1>
  <p>恭喜您！如果您正在手机上阅读这段文字，说明移动端适配已经成功了！</p>
  
  <h2>移动端特性</h2>
  <p>本阅读器针对移动端进行了全面优化：</p>
  
  <h3>响应式布局</h3>
  <ul>
    <li>竖屏模式：侧边栏在上方，阅读区域在下方</li>
    <li>横屏模式：与桌面端类似的左右布局</li>
    <li>自适应不同屏幕尺寸</li>
  </ul>
  
  <h3>触摸优化</h3>
  <ul>
    <li>按钮和控件符合44px最小触摸标准</li>
    <li>触摸反馈动画</li>
    <li>优化的滑块和选择器</li>
  </ul>
  
  <h3>手势支持</h3>
  <ul>
    <li>左右滑动翻页（试试看！）</li>
    <li>触摸友好的交互设计</li>
    <li>防误触优化</li>
  </ul>
  
  <h3>移动端测试项目</h3>
  <p>请测试以下功能：</p>
  <ol>
    <li>✅ 左右滑动翻页</li>
    <li>✅ 点击目录切换章节</li>
    <li>✅ 调整字体大小</li>
    <li>✅ 切换主题模式</li>
    <li>✅ 搜索文本</li>
    <li>✅ 添加和管理书签</li>
    <li>✅ 语音朗读功能</li>
    <li>✅ 横屏/竖屏切换</li>
  </ol>
  
  <h2>兼容性信息</h2>
  <p>本阅读器支持以下移动端浏览器：</p>
  <ul>
    <li>iOS 10.0+ (iPhone 7及以上)</li>
    <li>Android 5.0+ (2014年后设备)</li>
    <li>Chrome Mobile, Safari Mobile, Firefox Mobile</li>
  </ul>
  
  <p>如果您在使用过程中遇到任何问题，请检查浏览器版本是否符合要求。</p>
  
  <h2>性能提示</h2>
  <p>为了获得最佳体验：</p>
  <ul>
    <li>建议使用WiFi网络</li>
    <li>确保浏览器为最新版本</li>
    <li>关闭不必要的后台应用</li>
  </ul>
  
  <p>感谢您的测试！希望您喜欢这个EPUB阅读器。</p>
</body>
</html>`;
  
  zip.folder('OEBPS').file('chapter1.xhtml', chapter1);
  zip.folder('OEBPS').file('chapter2.xhtml', chapter2);
  zip.folder('OEBPS').file('chapter3.xhtml', chapter3);
  
  // 添加一个测试图片（简单的SVG）
  const testImageSvg = `<svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="100" fill="#409eff"/>
    <text x="100" y="55" font-family="Arial" font-size="16" fill="white" text-anchor="middle">测试图片</text>
  </svg>`;
  zip.folder('OEBPS').file('images/test-image.svg', testImageSvg);
  
  // 添加另一个测试图片
  const testImageSvg2 = `<svg width="300" height="150" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#4ecdc4;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="300" height="150" fill="url(#grad1)"/>
    <circle cx="150" cy="75" r="30" fill="white" opacity="0.8"/>
    <text x="150" y="80" font-family="Arial" font-size="14" fill="#333" text-anchor="middle">EPUB图片</text>
  </svg>`;
  zip.folder('OEBPS').file('images/diagram.svg', testImageSvg2);
  
  // 生成EPUB文件
  const content = await zip.generateAsync({type: 'nodebuffer'});
  fs.writeFileSync('test-book.epub', content);
  console.log('测试EPUB文件已创建：test-book.epub');
}

createTestEpub().catch(console.error); 