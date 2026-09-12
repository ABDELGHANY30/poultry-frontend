import {
  Component, OnInit, AfterViewChecked, inject, signal, computed,
  ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

const uid = () => Math.random().toString(36).slice(2);

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  loading?: boolean;
  streaming?: boolean;
  sources?: any[];
  imagePreview?: string;
}

const SUGGESTIONS_AR = [
  'ما هو برنامج تطعيم الفروج؟',
  'أعراض نيوكاسل وكيف أعالجه؟',
  'جرعة الأموكسيسيلين للفروج؟',
  'الحرارة المثالية أسبوع أول؟',
  'كيف أحسب FCR؟',
  'برنامج فيتامينات التسمين؟',
];

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, RouterLink],
  template: `
  <div class="flex flex-col h-[calc(100vh-180px)] lg:h-[calc(100vh-120px)]">

    <!-- Header -->
    <div class="rounded-3xl text-white px-5 py-4 mb-3 flex items-center gap-3"
         style="background:linear-gradient(135deg,#0f2d1a 0%,#2d9e5f 100%)">
      <div class="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl flex-shrink-0">🤖</div>
      <div class="flex-1">
        <h1 class="text-base font-black">د. حسام — مساعد الدواجن الذكي</h1>
        <div class="flex items-center gap-1.5 mt-0.5">
          <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          <p class="text-white/70 text-xs">متصل • خبير دواجن مصري</p>
        </div>
      </div>
      <div *ngIf="isPro()" class="bg-amber-400 text-amber-900 text-[10px] font-black px-2 py-1 rounded-xl">⭐ PRO</div>
    </div>

    <!-- Chat Window -->
    <div class="flex-1 bg-white rounded-3xl border border-gray-100 flex flex-col overflow-hidden shadow-sm">

      <!-- Suggestions -->
      <div *ngIf="messages().length <= 1" class="p-3 border-b border-gray-50 bg-green-50/50">
        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">اسأل مثلاً:</p>
        <div class="flex flex-wrap gap-1.5">
          <button *ngFor="let s of suggestions"
                  (click)="send(s)"
                  class="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-green-200
                         text-green-700 hover:bg-green-600 hover:text-white hover:border-green-600
                         transition-all cursor-pointer shadow-sm">
            {{ s }}
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div #msgContainer class="flex-1 overflow-y-auto p-3 space-y-3">
        <div *ngFor="let msg of messages()"
             class="flex gap-2"
             [class.flex-row-reverse]="msg.role === 'user'">

          <!-- Avatar -->
          <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-0.5"
               [class.bg-green-100]="msg.role === 'assistant'"
               [class.bg-gray-100]="msg.role === 'user'">
            {{ msg.role === 'assistant' ? '🤖' : '👨‍🌾' }}
          </div>

          <!-- Bubble -->
          <div class="max-w-[80%]">
            <div class="rounded-2xl px-4 py-3"
                 [class.bg-green-600]="msg.role === 'user'"
                 [class.text-white]="msg.role === 'user'"
                 [class.rounded-br-sm]="msg.role === 'user'"
                 [class.bg-gray-50]="msg.role === 'assistant'"
                 [class.border]="msg.role === 'assistant'"
                 [class.border-gray-100]="msg.role === 'assistant'"
                 [class.rounded-bl-sm]="msg.role === 'assistant'">

              <!-- Image preview -->
              <img *ngIf="msg.imagePreview" [src]="msg.imagePreview"
                   class="rounded-xl mb-2 max-h-40 object-cover w-full"/>

              <!-- Typing indicator -->
              <div *ngIf="msg.loading && !msg.content" class="flex gap-1 items-center h-5 px-1">
                <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay:0ms"></span>
                <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay:150ms"></span>
                <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay:300ms"></span>
              </div>

              <!-- Status message (searching...) -->
              <p *ngIf="msg.loading && msg.content && msg.streaming"
                 class="text-xs text-gray-400 italic flex items-center gap-1">
                <span class="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                {{ msg.content }}
              </p>

              <!-- Content -->
              <div *ngIf="!msg.loading || (msg.content && !msg.streaming)"
                   class="text-sm leading-relaxed"
                   [innerHTML]="renderMarkdown(msg.content)">
              </div>

              <!-- Cursor while streaming -->
              <span *ngIf="msg.streaming && msg.content && !msg.loading"
                    class="inline-block w-0.5 h-4 bg-green-500 animate-pulse ml-0.5 align-middle"></span>

              <!-- Timestamp -->
              <p class="text-[10px] mt-1.5 opacity-40 text-end">
                {{ msg.timestamp | date:'HH:mm' }}
              </p>
            </div>

            <!-- Sources -->
            <div *ngIf="msg.sources?.length && !msg.streaming" class="mt-1.5 flex flex-wrap gap-1">
              <span *ngFor="let s of msg.sources?.slice(0,3)"
                    class="text-[10px] bg-green-50 text-green-600 border border-green-100 px-2 py-0.5 rounded-full">
                📚 {{ s.title }}
              </span>
            </div>

            <!-- Feedback -->
            <div *ngIf="msg.role === 'assistant' && !msg.loading && !msg.streaming && msg.content"
                 class="flex gap-2 mt-1 opacity-0 hover:opacity-100 transition-opacity"
                 [class.opacity-100]="true">
              <button class="text-xs text-gray-300 hover:text-green-500 transition">👍</button>
              <button class="text-xs text-gray-300 hover:text-red-400 transition">👎</button>
              <button (click)="copyText(msg.content)"
                      class="text-xs text-gray-300 hover:text-blue-400 transition">📋</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Image Preview -->
      <div *ngIf="selectedImagePreview()"
           class="px-3 py-2 border-t border-gray-50 bg-amber-50 flex items-center gap-2">
        <img [src]="selectedImagePreview()!" class="h-12 w-12 rounded-xl object-cover border-2 border-amber-200"/>
        <div class="flex-1">
          <p class="text-xs font-bold text-amber-800">صورة جاهزة للتحليل</p>
          <p class="text-[10px] text-amber-600">اكتب سؤالك أو أرسل مباشرة</p>
        </div>
        <button (click)="removeImage()" class="text-red-400 text-lg font-bold">✕</button>
      </div>

      <!-- Input -->
      <div class="border-t border-gray-100 p-3 flex gap-2 bg-white">

        <!-- Image button (Pro only) -->
        <div class="relative flex-shrink-0 self-end">
          <button class="w-10 h-10 rounded-xl border flex items-center justify-center text-base transition"
                  [class.border-amber-300]="selectedImagePreview()"
                  [class.bg-amber-50]="selectedImagePreview()"
                  [class.border-gray-200]="!selectedImagePreview()"
                  [class.opacity-40]="!isPro()"
                  [title]="isPro() ? 'رفع صورة للتحليل' : 'متاح لـ Pro فقط'">
            📷
            <input *ngIf="isPro()" type="file" accept="image/*"
                   class="absolute inset-0 opacity-0 cursor-pointer"
                   (change)="onImageSelected($event)"/>
          </button>
        </div>

        <textarea #inputEl
          [(ngModel)]="input"
          [placeholder]="selectedImagePreview() ? 'اكتب سؤالك عن الصورة...' : 'اسأل عن الدواجن، الأمراض، التغذية...'"
          (keydown.enter)="onEnter($event)"
          [disabled]="loading()"
          rows="1"
          dir="rtl"
          class="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm resize-none max-h-28 focus:outline-none focus:border-green-300"
          style="min-height:40px">
        </textarea>

        <button class="w-10 h-10 rounded-xl flex-shrink-0 self-end flex items-center justify-center text-white transition"
                style="background:#2d9e5f"
                [class.opacity-40]="(!input.trim() && !selectedImagePreview()) || loading()"
                [disabled]="(!input.trim() && !selectedImagePreview()) || loading()"
                (click)="send()">
          <span *ngIf="!loading()">↑</span>
          <span *ngIf="loading()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        </button>
      </div>
    </div>

    // <p class="text-center text-[10px] text-gray-300 mt-1.5">
    //   ⚠️ الإجابات للاسترشاد فقط — استشر طبيباً بيطرياً للحالات الحرجة
    // </p>
  </div>

  <!-- Upgrade Modal -->
  <div *ngIf="showUpgradeModal()"
       class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
      <div class="text-center mb-4">
        <div class="text-5xl mb-2">🚀</div>
        <h2 class="text-xl font-bold">ترقية إلى Pro</h2>
        <p class="text-gray-500 text-sm mt-1">استنفدت حد الأسئلة اليومي</p>
      </div>
      <div class="space-y-2 mb-5">
        <div class="flex items-center gap-2 text-sm">✅ <span>أسئلة غير محدودة</span></div>
        <div class="flex items-center gap-2 text-sm">✅ <span>تحليل صور الطيور 📷</span></div>
        <div class="flex items-center gap-2 text-sm">✅ <span>تقارير متقدمة</span></div>
      </div>
      <a routerLink="/subscription" (click)="showUpgradeModal.set(false)"
         class="block w-full bg-green-600 text-white py-3 rounded-2xl font-bold text-center">
        اشترك الآن — 150 جنيه/شهر
      </a>
      <button class="w-full text-gray-400 text-sm py-2 mt-2" (click)="showUpgradeModal.set(false)">
        ليس الآن
      </button>
    </div>
  </div>
  `,
})
export class AiAssistantComponent implements OnInit, AfterViewChecked {
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);

  @ViewChild('msgContainer') private cont!: ElementRef<HTMLDivElement>;

  input = '';
  loading = signal(false);
  messages = signal<Message[]>([]);
  showUpgradeModal = signal(false);
  isPro = signal(false);
  selectedImage = signal<string | null>(null);
  selectedImagePreview = signal<string | null>(null);
  private needsScroll = false;
  private conversationHistory: {role: string, content: string}[] = [];

  suggestions = SUGGESTIONS_AR;

  private headers() {
    const token = localStorage.getItem('spa_token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  ngOnInit() {
    this.messages.set([{
      id: uid(), role: 'assistant', timestamp: new Date(),
      content: 'مرحباً! أنا د. حسام، مساعدك المتخصص في تربية الدواجن 🐔\n\nيمكنني مساعدتك في:\n• **الأمراض والعلاج** 🦠\n• **التغذية والفيتامينات** 🌾\n• **التحصينات والجرعات** 💉\n• **إدارة المزرعة** 🏗️\n\nاسأل بحرية!',
    }]);
    this.checkPro();
  }

  checkPro() {
    this.http.get<any>(`${environment.apiUrl}/reports/summary`, { headers: this.headers() }).subscribe({
      next: res => this.isPro.set(res.is_pro),
      error: () => {}
    });
  }

  ngAfterViewChecked() {
    if (this.needsScroll) { this.scrollBottom(); this.needsScroll = false; }
  }

  onEnter(e: any) { if (!e.shiftKey) { e.preventDefault(); this.send(); } }

  onImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.selectedImage.set(reader.result as string);
      this.selectedImagePreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  removeImage() {
    this.selectedImage.set(null);
    this.selectedImagePreview.set(null);
  }

  async send(text?: string) {
    const q = (text ?? this.input).trim();
    const hasImage = !!this.selectedImagePreview();
    if (!q && !hasImage) return;
    if (this.loading()) return;

    this.input = '';
    const imageToSend = this.selectedImage();
    this.removeImage();

    // أضف رسالة المستخدم
    const userMsg: Message = {
      id: uid(), role: 'user', timestamp: new Date(),
      content: q || 'حلل هذه الصورة',
      imagePreview: hasImage ? this.selectedImagePreview() || undefined : undefined
    };
    this.messages.update(m => [...m, userMsg]);

    // أضف placeholder للمساعد
    const assistantId = uid();
    this.messages.update(m => [...m, {
      id: assistantId, role: 'assistant', timestamp: new Date(),
      content: '', loading: true, streaming: false
    }]);

    this.loading.set(true);
    this.needsScroll = true;

    // احفظ في الـ history
    this.conversationHistory.push({ role: 'user', content: q });

    try {
      // استخدم الـ streaming endpoint
      const token = localStorage.getItem('spa_token');
      const response = await fetch(`${environment.apiUrl}/ai/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: q,
          language: 'ar',
          flock_id: null,
          conversation_history: this.conversationHistory.slice(-6)
        })
      });

      if (!response.ok) {
        const err = await response.json();
        if (response.status === 429) {
          this.showUpgradeModal.set(true);
          this.messages.update(m => m.map(x => x.id === assistantId
            ? { ...x, content: '🔒 استنفدت حد الأسئلة اليومي. قم بالترقية للحصول على أسئلة غير محدودة.', loading: false, streaming: false }
            : x));
          this.loading.set(false);
          return;
        }
        throw new Error(err.detail || 'Server error');
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullAnswer = '';
      let sources: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'status') {
              // إظهار رسالة الحالة
              this.messages.update(m => m.map(x => x.id === assistantId
                ? { ...x, content: data.content, loading: true, streaming: true }
                : x));
            }

            else if (data.type === 'token') {
              // إضافة الـ token
              fullAnswer += data.content;
              this.messages.update(m => m.map(x => x.id === assistantId
                ? { ...x, content: fullAnswer, loading: false, streaming: true }
                : x));
              this.needsScroll = true;
            }

            else if (data.type === 'done') {
              sources = data.sources || [];
              this.messages.update(m => m.map(x => x.id === assistantId
                ? { ...x, content: fullAnswer, loading: false, streaming: false, sources }
                : x));
              this.conversationHistory.push({ role: 'assistant', content: fullAnswer });
              // حافظ على آخر 10 رسائل فقط
              if (this.conversationHistory.length > 10) {
                this.conversationHistory = this.conversationHistory.slice(-10);
              }
            }

            else if (data.type === 'error') {
              this.messages.update(m => m.map(x => x.id === assistantId
                ? { ...x, content: `❌ ${data.content}`, loading: false, streaming: false }
                : x));
            }
          } catch (e) { /* ignore parse errors */ }
        }
      }

    } catch (error: any) {
      this.messages.update(m => m.map(x => x.id === assistantId
        ? { ...x, content: `❌ حدث خطأ في الاتصال: ${error.message}`, loading: false, streaming: false }
        : x));
    } finally {
      this.loading.set(false);
      this.needsScroll = true;
    }
  }

  copyText(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      // يمكن إضافة toast هنا
    });
  }

  renderMarkdown(text: string): SafeHtml {
    if (!text) return this.sanitizer.bypassSecurityTrustHtml('');
    const html = text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^### (.+)$/gm, '<p class="font-bold text-sm mt-3 mb-1 text-green-700">$1</p>')
      .replace(/^## (.+)$/gm, '<p class="font-black text-base mt-4 mb-2">$1</p>')
      .replace(/^# (.+)$/gm, '<p class="font-black text-lg mt-4 mb-2">$1</p>')
      .replace(/^- (.+)$/gm, '<div class="flex gap-2 text-sm my-0.5"><span class="text-green-500 flex-shrink-0">•</span><span>$1</span></div>')
      .replace(/^✅ (.+)$/gm, '<div class="flex gap-2 text-sm my-0.5"><span class="flex-shrink-0">✅</span><span>$1</span></div>')
      .replace(/^❌ (.+)$/gm, '<div class="flex gap-2 text-sm my-0.5"><span class="flex-shrink-0">❌</span><span>$1</span></div>')
      .replace(/^⚠️ (.+)$/gm, '<div class="flex gap-2 text-sm my-0.5 text-amber-700"><span class="flex-shrink-0">⚠️</span><span>$1</span></div>')
      .replace(/^\d+\. (.+)$/gm, '<div class="flex gap-2 text-sm my-1"><span class="text-green-600 font-bold flex-shrink-0">•</span><span>$1</span></div>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private scrollBottom() {
    try { this.cont.nativeElement.scrollTop = this.cont.nativeElement.scrollHeight; } catch {}
  }
}