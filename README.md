# EPUB阅读器

一个简单的EPUB电子书阅读器，使用Python和PyQt6开发。

## 功能特点

- 打开和阅读EPUB格式的电子书
- 显示章节列表
- 支持章节导航
- 支持前后翻页
- 简洁的用户界面

## 安装要求

- Python 3.8或更高版本
- PyQt6
- ebooklib
- beautifulsoup4

## 安装步骤

1. 克隆或下载此仓库
2. 安装依赖：
```bash
pip install -r requirements.txt
```

## 使用方法

运行以下命令启动阅读器：
```bash
python epub_reader.py
```

1. 点击"打开EPUB文件"按钮选择要阅读的EPUB文件
2. 在左侧面板中选择要阅读的章节
3. 使用"上一页"和"下一页"按钮在章节间导航

## 注意事项

- 目前仅支持基本的EPUB阅读功能
- 确保EPUB文件格式正确且未损坏 