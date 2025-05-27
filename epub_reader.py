import sys
import os
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import threading
import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
import win32com.client
import pygame
import tempfile
import time

# 尝试导入gTTS库
try:
    from gtts import gTTS
    import io
    GTTS_AVAILABLE = True
except ImportError:
    GTTS_AVAILABLE = False
    print("gTTS库未安装，将只使用系统语音")

class LocalTTSThread(threading.Thread):
    def __init__(self, text, lang, slow, callback, parent):
        super().__init__()
        self.text = text
        self.lang = lang
        self.slow = slow
        self.callback = callback
        self.parent = parent
        self.is_running = True
        self.is_paused = False
        self.daemon = True
        
    def run(self):
        try:
            if self.is_running and GTTS_AVAILABLE:
                # 分段朗读
                sentences = self.split_text(self.text)
                for sentence in sentences:
                    if not self.is_running:
                        break
                    while self.is_paused and self.is_running:
                        time.sleep(0.1)
                    if self.is_running and sentence.strip():
                        # 生成音频文件
                        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp_file:
                            tmp_path = tmp_file.name
                        
                        # 生成语音
                        tts = gTTS(text=sentence, lang=self.lang, slow=self.slow)
                        tts.save(tmp_path)
                        
                        # 播放音频
                        if self.is_running:
                            self.play_audio(tmp_path)
                        
                        # 清理临时文件
                        try:
                            os.unlink(tmp_path)
                        except:
                            pass
                
                if self.is_running and self.callback:
                    self.callback()
        except Exception as e:
            print(f"本地TTS朗读出错: {str(e)}")
    
    def play_audio(self, file_path):
        try:
            pygame.mixer.init()
            pygame.mixer.music.load(file_path)
            pygame.mixer.music.play()
            
            # 等待播放完成
            while pygame.mixer.music.get_busy() and self.is_running:
                if self.is_paused:
                    pygame.mixer.music.pause()
                    while self.is_paused and self.is_running:
                        time.sleep(0.1)
                    if self.is_running:
                        pygame.mixer.music.unpause()
                time.sleep(0.1)
        except Exception as e:
            print(f"音频播放出错: {str(e)}")
    
    def split_text(self, text):
        import re
        sentences = re.split(r'[。！？\n]', text)
        return [s.strip() + '。' for s in sentences if s.strip()]
    
    def pause(self):
        self.is_paused = True
    
    def resume(self):
        self.is_paused = False
    
    def stop(self):
        self.is_running = False
        self.is_paused = False
        try:
            pygame.mixer.music.stop()
        except:
            pass

class TextToSpeechThread(threading.Thread):
    def __init__(self, text, voice_index, rate, callback, parent):
        super().__init__()
        self.text = text
        self.voice_index = voice_index
        self.rate = rate
        self.callback = callback
        self.parent = parent
        self.is_running = True
        self.is_paused = False
        self.daemon = True
        self.speaker = None
        
    def run(self):
        try:
            if self.is_running:
                self.speaker = win32com.client.Dispatch("SAPI.SpVoice")
                voices = self.speaker.GetVoices()
                if 0 <= self.voice_index < voices.Count:
                    self.speaker.Voice = voices.Item(self.voice_index)
                self.speaker.Rate = self.rate
                
                # 分段朗读，每句话检查一次状态
                sentences = self.split_text(self.text)
                for sentence in sentences:
                    if not self.is_running:
                        break
                    while self.is_paused and self.is_running:
                        threading.Event().wait(0.1)
                    if self.is_running and sentence.strip():
                        self.speaker.Speak(sentence, 1)  # 1 = SVSFlagsAsync 异步模式
                        # 等待当前句子说完
                        while self.speaker.Status.RunningState == 2 and self.is_running:  # 2 = SpeechRunState_Speaking
                            threading.Event().wait(0.1)
                
                if self.is_running and self.callback:
                    self.callback()
        except Exception as e:
            print(f"朗读出错: {str(e)}")
    
    def split_text(self, text):
        # 按句号、问号、感叹号分割文本
        import re
        sentences = re.split(r'[。！？\n]', text)
        return [s.strip() + '。' for s in sentences if s.strip()]
    
    def pause(self):
        self.is_paused = True
        if self.speaker:
            self.speaker.Pause()
    
    def resume(self):
        self.is_paused = False
        if self.speaker:
            self.speaker.Resume()
    
    def stop(self):
        self.is_running = False
        self.is_paused = False
        if self.speaker:
            try:
                self.speaker.Speak("", 3)  # 3 = SVSFPurgeBeforeSpeak 清除队列并停止
            except:
                pass

class EpubReader:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("EPUB阅读器")
        self.root.geometry("1200x800")
        
        # 初始化变量
        self.current_book = None
        self.current_chapter = 0
        self.chapters = []
        self.is_reading = False
        self.is_paused = False
        self.tts_thread = None
        self.current_voice_index = 0
        self.current_rate = 0
        self.use_local_tts = False
        self.current_lang = 'zh'
        self.current_slow = False
        
        # 获取可用语音
        try:
            speaker = win32com.client.Dispatch("SAPI.SpVoice")
            self.voices = speaker.GetVoices()
            self.voice_names = []
            for i in range(self.voices.Count):
                voice = self.voices.Item(i)
                self.voice_names.append(voice.GetDescription())
        except:
            self.voice_names = ["默认语音"]
        
        # 定义可用的语言和音色
        self.tts_languages = {
            '中文': 'zh',
            '英文': 'en',
            '日文': 'ja',
            '韩文': 'ko',
            '法文': 'fr',
            '德文': 'de',
            '西班牙文': 'es',
            '意大利文': 'it',
            '俄文': 'ru',
            '阿拉伯文': 'ar'
        }
        
        self.create_widgets()
        
    def create_widgets(self):
        # 创建主框架
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # 左侧面板
        left_frame = ttk.Frame(main_frame)
        left_frame.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 10))
        
        # 打开文件按钮
        self.open_button = ttk.Button(left_frame, text="打开EPUB文件", command=self.open_file)
        self.open_button.pack(fill=tk.X, pady=(0, 10))
        
        # 语音控制框架
        voice_frame = ttk.LabelFrame(left_frame, text="语音控制")
        voice_frame.pack(fill=tk.X, pady=(0, 10))
        
        # TTS引擎选择
        ttk.Label(voice_frame, text="TTS引擎:").pack(anchor=tk.W)
        self.engine_var = tk.StringVar(value="系统语音")
        engine_frame = ttk.Frame(voice_frame)
        engine_frame.pack(fill=tk.X, pady=(0, 5))
        
        self.system_radio = ttk.Radiobutton(engine_frame, text="系统语音", variable=self.engine_var, 
                                          value="系统语音", command=self.change_engine)
        self.system_radio.pack(side=tk.LEFT)
        
        if GTTS_AVAILABLE:
            self.local_radio = ttk.Radiobutton(engine_frame, text="在线语音", variable=self.engine_var, 
                                             value="在线语音", command=self.change_engine)
            self.local_radio.pack(side=tk.LEFT, padx=(10, 0))
        
        # 系统语音选择
        self.system_frame = ttk.Frame(voice_frame)
        self.system_frame.pack(fill=tk.X, pady=(0, 5))
        
        ttk.Label(self.system_frame, text="选择语音:").pack(anchor=tk.W)
        self.voice_combo = ttk.Combobox(self.system_frame, values=self.voice_names, state="readonly")
        self.voice_combo.pack(fill=tk.X, pady=(0, 5))
        self.voice_combo.current(0)
        self.voice_combo.bind("<<ComboboxSelected>>", self.change_voice)
        
        # 语速控制
        ttk.Label(self.system_frame, text="语速:").pack(anchor=tk.W)
        self.rate_var = tk.IntVar(value=0)
        self.rate_scale = ttk.Scale(self.system_frame, from_=-10, to=10, variable=self.rate_var, 
                                   orient=tk.HORIZONTAL, command=self.change_rate)
        self.rate_scale.pack(fill=tk.X, pady=(0, 5))
        self.rate_label = ttk.Label(self.system_frame, text="语速: 0")
        self.rate_label.pack(anchor=tk.W)
        
        # 在线语音选择
        if GTTS_AVAILABLE:
            self.local_frame = ttk.Frame(voice_frame)
            
            ttk.Label(self.local_frame, text="选择语言:").pack(anchor=tk.W)
            self.lang_combo = ttk.Combobox(self.local_frame, values=list(self.tts_languages.keys()), state="readonly")
            self.lang_combo.pack(fill=tk.X, pady=(0, 5))
            self.lang_combo.current(0)  # 默认选择中文
            self.lang_combo.bind("<<ComboboxSelected>>", self.change_language)
            
            # 语速选择
            ttk.Label(self.local_frame, text="语速:").pack(anchor=tk.W)
            self.slow_var = tk.BooleanVar()
            self.slow_check = ttk.Checkbutton(self.local_frame, text="慢速朗读", variable=self.slow_var, 
                                            command=self.change_slow)
            self.slow_check.pack(anchor=tk.W, pady=(0, 5))
            
            # 音色说明
            info_text = "在线语音支持多种语言，音质更自然\n需要网络连接"
            self.info_label = ttk.Label(self.local_frame, text=info_text, font=("微软雅黑", 8))
            self.info_label.pack(anchor=tk.W, pady=(5, 0))
        
        # 朗读控制按钮
        button_frame = ttk.Frame(voice_frame)
        button_frame.pack(fill=tk.X, pady=(5, 0))
        
        self.read_button = ttk.Button(button_frame, text="朗读", command=self.toggle_reading)
        self.read_button.pack(side=tk.LEFT, padx=(0, 5))
        
        self.stop_button = ttk.Button(button_frame, text="停止", command=self.stop_reading, state=tk.DISABLED)
        self.stop_button.pack(side=tk.LEFT)
        
        # 章节列表
        ttk.Label(left_frame, text="章节列表:").pack(anchor=tk.W, pady=(10, 0))
        self.chapter_listbox = tk.Listbox(left_frame, width=30)
        self.chapter_listbox.pack(fill=tk.BOTH, expand=True, pady=(5, 0))
        self.chapter_listbox.bind("<<ListboxSelect>>", self.load_chapter)
        
        # 右侧面板
        right_frame = ttk.Frame(main_frame)
        right_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        
        # 导航按钮
        nav_frame = ttk.Frame(right_frame)
        nav_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.prev_button = ttk.Button(nav_frame, text="上一页", command=self.prev_page)
        self.prev_button.pack(side=tk.LEFT, padx=(0, 5))
        
        self.next_button = ttk.Button(nav_frame, text="下一页", command=self.next_page)
        self.next_button.pack(side=tk.LEFT)
        
        # 阅读区域
        self.content_text = scrolledtext.ScrolledText(right_frame, wrap=tk.WORD, font=("微软雅黑", 12))
        self.content_text.pack(fill=tk.BOTH, expand=True)
        
        # 初始化界面状态
        self.change_engine()
    
    def change_engine(self):
        self.use_local_tts = (self.engine_var.get() == "在线语音")
        
        if self.use_local_tts and GTTS_AVAILABLE:
            self.system_frame.pack_forget()
            self.local_frame.pack(fill=tk.X, pady=(0, 5))
        else:
            if GTTS_AVAILABLE:
                self.local_frame.pack_forget()
            self.system_frame.pack(fill=tk.X, pady=(0, 5))
    
    def change_language(self, event=None):
        lang_name = self.lang_combo.get()
        self.current_lang = self.tts_languages.get(lang_name, 'zh')
    
    def change_slow(self):
        self.current_slow = self.slow_var.get()
    
    def change_voice(self, event=None):
        self.current_voice_index = self.voice_combo.current()
    
    def change_rate(self, value):
        self.current_rate = int(float(value))
        self.rate_label.config(text=f"语速: {self.current_rate}")
    
    def toggle_reading(self):
        if not self.is_reading:
            # 开始朗读
            self.is_reading = True
            self.is_paused = False
            self.read_button.config(text="暂停")
            self.stop_button.config(state=tk.NORMAL)
            self.start_reading()
        elif not self.is_paused:
            # 暂停朗读
            self.is_paused = True
            self.read_button.config(text="继续")
            if self.tts_thread and self.tts_thread.is_alive():
                self.tts_thread.pause()
        else:
            # 继续朗读
            self.is_paused = False
            self.read_button.config(text="暂停")
            if self.tts_thread and self.tts_thread.is_alive():
                self.tts_thread.resume()
    
    def stop_reading(self):
        self.is_reading = False
        self.is_paused = False
        self.read_button.config(text="朗读")
        self.stop_button.config(state=tk.DISABLED)
        if self.tts_thread and self.tts_thread.is_alive():
            self.tts_thread.stop()
    
    def start_reading(self):
        if self.is_reading:
            text = self.content_text.get(1.0, tk.END).strip()
            if self.tts_thread and self.tts_thread.is_alive():
                self.tts_thread.stop()
            
            if self.use_local_tts and GTTS_AVAILABLE:
                self.tts_thread = LocalTTSThread(text, self.current_lang, self.current_slow,
                                               self.on_reading_finished, self)
            else:
                self.tts_thread = TextToSpeechThread(text, self.current_voice_index, 
                                                   self.current_rate, self.on_reading_finished, self)
            self.tts_thread.start()
    
    def on_reading_finished(self):
        if self.is_reading and not self.is_paused:
            self.root.after(100, self.next_page)
            self.root.after(200, self.start_reading)
    
    def open_file(self):
        file_name = filedialog.askopenfilename(
            title="打开EPUB文件",
            filetypes=[("EPUB files", "*.epub"), ("All files", "*.*")]
        )
        if file_name:
            self.load_book(file_name)
    
    def load_book(self, file_path):
        try:
            self.current_book = epub.read_epub(file_path)
            self.chapters = list(self.current_book.get_items_of_type(ebooklib.ITEM_DOCUMENT))
            
            # 更新章节列表
            self.chapter_listbox.delete(0, tk.END)
            for i, chapter in enumerate(self.chapters):
                soup = BeautifulSoup(chapter.get_content(), 'html.parser')
                title = soup.find('title')
                if title:
                    self.chapter_listbox.insert(tk.END, f"第{i+1}章: {title.text}")
                else:
                    self.chapter_listbox.insert(tk.END, f"第{i+1}章")
            
            # 加载第一章
            if self.chapters:
                self.current_chapter = 0
                self.load_chapter_content(0)
                self.chapter_listbox.selection_set(0)
        except Exception as e:
            messagebox.showerror("错误", f"打开文件时出错：{str(e)}")
    
    def load_chapter(self, event=None):
        selection = self.chapter_listbox.curselection()
        if selection:
            index = selection[0]
            self.current_chapter = index
            self.load_chapter_content(index)
    
    def load_chapter_content(self, index):
        if 0 <= index < len(self.chapters):
            content = self.chapters[index].get_content()
            soup = BeautifulSoup(content, 'html.parser')
            # 提取纯文本
            text = soup.get_text()
            self.content_text.delete(1.0, tk.END)
            self.content_text.insert(1.0, text)
    
    def prev_page(self):
        if self.current_chapter > 0:
            self.current_chapter -= 1
            self.load_chapter_content(self.current_chapter)
            self.chapter_listbox.selection_clear(0, tk.END)
            self.chapter_listbox.selection_set(self.current_chapter)
            self.chapter_listbox.see(self.current_chapter)
    
    def next_page(self):
        if self.current_chapter < len(self.chapters) - 1:
            self.current_chapter += 1
            self.load_chapter_content(self.current_chapter)
            self.chapter_listbox.selection_clear(0, tk.END)
            self.chapter_listbox.selection_set(self.current_chapter)
            self.chapter_listbox.see(self.current_chapter)
    
    def run(self):
        self.root.mainloop()

if __name__ == '__main__':
    app = EpubReader()
    app.run() 