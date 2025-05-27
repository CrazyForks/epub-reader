import sys
import os
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import threading
import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
import win32com.client

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
        
        # 语音选择
        ttk.Label(voice_frame, text="选择语音:").pack(anchor=tk.W)
        self.voice_combo = ttk.Combobox(voice_frame, values=self.voice_names, state="readonly")
        self.voice_combo.pack(fill=tk.X, pady=(0, 5))
        self.voice_combo.current(0)
        self.voice_combo.bind("<<ComboboxSelected>>", self.change_voice)
        
        # 语速控制
        ttk.Label(voice_frame, text="语速:").pack(anchor=tk.W)
        self.rate_var = tk.IntVar(value=0)
        self.rate_scale = ttk.Scale(voice_frame, from_=-10, to=10, variable=self.rate_var, 
                                   orient=tk.HORIZONTAL, command=self.change_rate)
        self.rate_scale.pack(fill=tk.X, pady=(0, 5))
        self.rate_label = ttk.Label(voice_frame, text="语速: 0")
        self.rate_label.pack(anchor=tk.W)
        
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