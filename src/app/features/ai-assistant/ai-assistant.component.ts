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
// ⚠️ عدّل المسار ده لو اسم/مكان الملف مختلف عندك
import { FlockService } from '../../core/services/flock.service';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

const uid = () => Math.random().toString(36).slice(2);
const GUEST_QUESTION_LIMIT = 3;
const GUEST_COUNT_KEY = 'spa_guest_questions';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  loading?: boolean;
  streaming?: boolean;
  sources?: any[];
  imagePreview?: string;
  suggestions?: string[];
  copied?: boolean;
  shared?: boolean;
  queryId?: string;
  feedback?: 'up' | 'down';
  confidence?: 'high' | 'medium' | 'low';
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
  // ⚠️ مهم: من غير ده، عنصر <app-ai-assistant> نفسه بيفضل من غير ارتفاع
  // حقيقي (browsers بتعامل مع custom elements كـ inline افتراضياً)، والـ
  // h-full جوا التمبلت بتحسب نسبة من أب مالوش ارتفاع محدد — النتيجة إن
  // الصفحة كلها بتكبر مع المحتوى بدل ما الشات الداخلي بس يعمل scroll
  host: { class: 'flex-1 flex flex-col overflow-hidden min-h-0' },
  imports: [CommonModule, FormsModule, TranslateModule, RouterLink],
  template: `
  <div class="flex flex-col h-full min-h-0">

    <!-- Header -->
    <div class="border-b border-gray-200 px-4 py-3 mb-3 flex items-center gap-3">
      <div class="flex-1 min-w-0">
        <h1 class="text-base font-semibold text-gray-900">مساعد الدواجن</h1>
        <div class="flex items-center gap-1.5 mt-0.5">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
          <p class="text-gray-400 text-xs flex-shrink-0">متصل</p>
        </div>
      </div>
      <div *ngIf="isPro()" class="text-amber-700 bg-amber-50 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0">Pro</div>
    </div>

    <!-- Flock Selector — اختياري بالكامل، المستخدم هو اللي بيقرر لو عايز
         إجابات مبنية على قطيع معين ولا إجابة عامة -->
    <div *ngIf="allFlocks().length > 0" class="mb-3">
      <select
        class="w-full text-sm font-bold rounded-xl px-3 py-2 bg-white border-2 border-gray-200 text-gray-700"
        [ngModel]="activeFlockId()"
        (ngModelChange)="onFlockSelected($event)">
        <option [ngValue]="null">💬 سؤال عام (من غير قطيع محدد)</option>
        <option *ngFor="let f of allFlocks()" [ngValue]="f.id">🐔 {{ f.name }}</option>
      </select>
    </div>

    <!-- Proactive Alerts Banner -->
    <div *ngIf="alerts().length" class="mb-3 space-y-1.5">
      <div *ngFor="let a of alerts()"
           class="rounded-2xl px-4 py-2.5 flex items-start gap-2 border text-sm"
           [class.bg-red-50]="a.priority === 'high'"
           [class.border-red-200]="a.priority === 'high'"
           [class.text-red-800]="a.priority === 'high'"
           [class.bg-amber-50]="a.priority !== 'high'"
           [class.border-amber-200]="a.priority !== 'high'"
           [class.text-amber-800]="a.priority !== 'high'">
        <span class="flex-1">
          <span class="font-bold block">{{ a.title }}</span>
          <span class="text-xs opacity-90">{{ a.message }}</span>
        </span>
        <button (click)="dismissAlert(a.id)" class="text-xs opacity-60 hover:opacity-100 flex-shrink-0">✕</button>
      </div>
    </div>

    <!-- Chat Window -->
    <div class="flex-1 flex flex-col overflow-hidden">

      <!-- Suggestions -->
      <div *ngIf="messages().length <= 1" class="p-3 border-b border-gray-50 bg-green-50/50">
        <p class="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">اسأل مثلاً:</p>
        <div class="flex flex-wrap gap-1.5">
          <button *ngFor="let s of suggestions"
                  (click)="send(s)"
                  class="text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-gray-200
                         text-gray-600 hover:bg-gray-50 hover:border-gray-300
                         transition-colors cursor-pointer">
            {{ s }}
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div #msgContainer class="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col" (click)="onContentClick($event)">
        <div class="flex-1"></div>
        <div class="flex flex-col gap-3">
        <div *ngFor="let msg of messages()"
             class="flex gap-2"
             [class.flex-row-reverse]="msg.role === 'user'">

          <!-- Bubble -->
          <div [class]="msg.role === 'user' ? 'max-w-[80%]' : 'max-w-[85%]'">
            <div [class]="msg.role === 'user'
                    ? 'rounded-2xl rounded-br-md px-4 py-3 bg-gray-100 text-gray-900'
                    : 'px-1 py-1'">

              <!-- Image preview -->
              <img *ngIf="msg.imagePreview" [src]="msg.imagePreview"
                   class="rounded-xl mb-2 max-h-40 object-cover w-full"/>

              <!-- Typing indicator -->
              <div *ngIf="msg.loading && !msg.content" class="flex gap-1 items-center h-5 px-1">
                <span class="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style="animation-delay:0ms"></span>
                <span class="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style="animation-delay:150ms"></span>
                <span class="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style="animation-delay:300ms"></span>
              </div>

              <!-- Status message (searching...) -->
              <p *ngIf="msg.loading && msg.content && msg.streaming"
                 class="text-xs text-gray-400 italic flex items-center gap-1">
                <span class="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse"></span>
                {{ msg.content }}
              </p>

              <!-- Content -->
              <div *ngIf="!msg.loading || (msg.content && !msg.streaming)"
                   class="text-sm leading-relaxed"
                   [class.text-gray-800]="msg.role === 'assistant'"
                   [innerHTML]="renderMarkdown(msg.content, msg.streaming)">
              </div>

              <!-- Cursor while streaming -->
              <span *ngIf="msg.streaming && msg.content && !msg.loading"
                    class="inline-block w-0.5 h-4 bg-gray-400 animate-pulse ml-0.5 align-middle"></span>

              <!-- Timestamp -->
              <p class="text-xs mt-1.5 text-gray-400 text-end">
                {{ msg.timestamp | date:'HH:mm' }}
              </p>
            </div>

            <!-- Confidence badge (لو المعلومة المرجعية ضعيفة أو متوسطة) -->
            <div *ngIf="msg.confidence === 'low' && !msg.streaming"
                 class="mt-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1 inline-flex items-center gap-1">
              ⚠️ معلومات محدودة — استشر طبيب بيطري للتأكد
            </div>
            <div *ngIf="msg.confidence === 'medium' && !msg.streaming"
                 class="mt-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1 inline-flex items-center gap-1">
              دقة متوسطة
            </div>

            <!-- Sources -->
            <div *ngIf="msg.sources?.length && !msg.streaming" class="mt-1.5 flex flex-wrap gap-1">
              <span *ngFor="let s of msg.sources?.slice(0,3)"
                    class="text-xs bg-gray-50 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full">
                {{ s.title }}
              </span>
            </div>

            <!-- Feedback / Copy / Share -->
            <div *ngIf="msg.role === 'assistant' && !msg.loading && !msg.streaming && msg.content"
                 class="flex items-center gap-1.5 mt-1.5">
              <button (click)="sendFeedback(msg, true)"
                      class="text-xs w-7 h-7 rounded-lg flex items-center justify-center transition"
                      [class.text-emerald-600]="msg.feedback === 'up'"
                      [class.bg-emerald-50]="msg.feedback === 'up'"
                      [class.text-gray-300]="msg.feedback !== 'up'"
                      [class.hover:bg-gray-100]="msg.feedback !== 'up'">👍</button>
              <button (click)="sendFeedback(msg, false)"
                      class="text-xs w-7 h-7 rounded-lg flex items-center justify-center transition"
                      [class.text-red-500]="msg.feedback === 'down'"
                      [class.bg-red-50]="msg.feedback === 'down'"
                      [class.text-gray-300]="msg.feedback !== 'down'"
                      [class.hover:bg-gray-100]="msg.feedback !== 'down'">👎</button>
              <span class="w-px h-3 bg-gray-200 mx-0.5"></span>
              <button (click)="copyText(msg)"
                      class="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition"
                      [class.text-gray-400]="!msg.copied"
                      [class.hover:bg-gray-100]="!msg.copied"
                      [class.bg-emerald-50]="msg.copied"
                      [class.text-emerald-600]="msg.copied">
                {{ msg.copied ? '✅ اتنسخ' : '📋 نسخ' }}
              </button>
              <button (click)="shareText(msg)"
                      class="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition"
                      [class.text-gray-400]="!msg.shared"
                      [class.hover:bg-gray-100]="!msg.shared"
                      [class.bg-blue-50]="msg.shared"
                      [class.text-blue-600]="msg.shared">
                {{ msg.shared ? '✅ اتشير' : '🔗 مشاركة' }}
              </button>
              <button (click)="speakText(msg)"
                      class="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition"
                      [class.text-gray-400]="speakingMessageId() !== msg.id"
                      [class.hover:bg-gray-100]="speakingMessageId() !== msg.id"
                      [class.bg-purple-50]="speakingMessageId() === msg.id"
                      [class.text-purple-600]="speakingMessageId() === msg.id"
                      [class.opacity-40]="!isPro()"
                      [title]="isPro() ? 'استماع للرد' : 'الرد الصوتي متاح لـ Pro فقط'">
                {{ speakingMessageId() === msg.id ? '⏹️ إيقاف' : '🔊 استماع' }}
              </button>
            </div>

            <!-- Smart follow-up suggestions -->
            <div *ngIf="msg.suggestions?.length && !msg.streaming" class="mt-2 flex flex-wrap gap-1.5">
              <button *ngFor="let s of msg.suggestions"
                      (click)="send(s)"
                      class="text-xs font-medium px-2.5 py-1 rounded-full bg-white border border-gray-200
                             text-gray-600 hover:bg-gray-50 hover:border-gray-300
                             transition-colors">
                {{ s }}
              </button>
            </div>
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
          <p class="text-xs text-amber-600">اكتب سؤالك أو أرسل مباشرة</p>
        </div>
        <button (click)="removeImage()" class="text-red-400 text-lg font-bold">✕</button>
      </div>

      <!-- Input -->
      <div class="border-t border-gray-100 p-3 bg-transparent">
        <div class="flex items-end gap-1 bg-gray-50 border border-gray-200 rounded-[1.75rem] px-2 py-1.5
                    focus-within:border-gray-300 focus-within:bg-white transition-colors"
             style="transform: translateZ(0);">

          <!-- Image button (Pro only) -->
          <div class="relative flex-shrink-0">
            <button class="w-9 h-9 rounded-full flex items-center justify-center text-base text-gray-500 hover:bg-gray-200/70 transition"
                    [class.bg-amber-100]="selectedImagePreview()"
                    [class.opacity-40]="!isPro()"
                    [title]="isPro() ? 'رفع صورة للتحليل' : 'متاح لـ Pro فقط'">
              📷
              <input *ngIf="isPro()" type="file" accept="image/*"
                     class="absolute inset-0 opacity-0 cursor-pointer"
                     (change)="onImageSelected($event)"/>
            </button>
          </div>

          <!-- Voice input button (Pro only) -->
          <div class="relative flex-shrink-0">
            <button (click)="toggleVoiceInput()"
                    type="button"
                    class="w-9 h-9 rounded-full flex items-center justify-center text-base text-gray-500 hover:bg-gray-200/70 transition"
                    [class.bg-red-100]="isRecording()"
                    [class.text-red-500]="isRecording()"
                    [class.animate-pulse]="isRecording()"
                    [class.opacity-40]="!isPro()"
                    [title]="isPro() ? (isRecording() ? 'إيقاف التسجيل' : 'تسجيل صوتي') : 'التسجيل الصوتي متاح لـ Pro فقط'">
              {{ isRecording() ? '⏹️' : '🎤' }}
            </button>
          </div>

          <textarea #inputEl
            [(ngModel)]="input"
            [placeholder]="isRecording() ? '🎙️ بيسمعك دلوقتي... اتكلم' : (selectedImagePreview() ? 'اكتب سؤالك عن الصورة...' : 'اسأل عن الدواجن، الأمراض، التغذية...')"
            (keydown.enter)="onEnter($event)"
            [disabled]="loading()"
            rows="1"
            dir="rtl"
            class="flex-1 bg-transparent border-0 px-2 py-2 text-sm text-gray-900 placeholder:text-gray-400 resize-none max-h-28 focus:outline-none focus:ring-0"
            style="min-height:36px; transform: translateZ(0); -webkit-transform: translateZ(0); backface-visibility: hidden;">
          </textarea>

          <button class="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white transition"
                  style="background:#2A2A28"
                  [class.opacity-40]="(!input.trim() && !selectedImagePreview()) || loading()"
                  [disabled]="(!input.trim() && !selectedImagePreview()) || loading()"
                  (click)="send()">
            <span *ngIf="!loading()">↑</span>
            <span *ngIf="loading()" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          </button>
        </div>
      </div>
    </div>
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
        <div class="flex items-center gap-2 text-sm">✅ <span>التسجيل الصوتي 🎤</span></div>
        <div class="flex items-center gap-2 text-sm">✅ <span>الرد الصوتي 🔊</span></div>
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
  private flockService = inject(FlockService);

  @ViewChild('msgContainer') private cont!: ElementRef<HTMLDivElement>;

  input = '';
  loading = signal(false);
  messages = signal<Message[]>([]);
  showUpgradeModal = signal(false);
  isPro = signal(false);
  selectedImage = signal<string | null>(null);
  selectedImagePreview = signal<string | null>(null);
  activeFlockId = signal<string | null>(null);
  activeFlockName = signal<string | null>(null);
  isRecording = signal(false);
  speakingMessageId = signal<string | null>(null);
  alerts = signal<{ id: string; type: string; priority: string; title: string; message: string; due_date?: string }[]>([]);
  private recognition: any = null;
  private arabicVoice: SpeechSynthesisVoice | null = null;
  private voicesLoaded = false;
  private needsScroll = false;
  private conversationHistory: {role: string, content: string}[] = [];

  suggestions = SUGGESTIONS_AR;

  private headers() {
    const token = localStorage.getItem('spa_token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  ngOnInit() {
    const isGuest = !localStorage.getItem('spa_token');
    if (isGuest) {
      // الزائر من غير حساب: من غير أي طلبات محتاجة تسجيل دخول (كانت هتفشل بـ 401)
      this.loadArabicVoice();
      const used = Number(localStorage.getItem(GUEST_COUNT_KEY) || '0');
      const remaining = Math.max(0, GUEST_QUESTION_LIMIT - used);
      this.messages.set([{
        id: uid(), role: 'assistant', timestamp: new Date(),
        content: `مرحباً! .  🐔\n\nأنت بتستخدم النظام كزائر — عندك **${remaining} سؤال مجاني** متبقي. سجّل حساب مجاني في أي وقت عشان تسأل من غير حدود وتستخدم كل الميزات.`,
      }]);
      return;
    }
    this.checkPro();
    this.loadActiveFlock();
    this.loadHistory();
    this.loadAlerts();
    this.loadArabicVoice();
  }

  /** يدوّر على أفضل صوت عربي متاح في المتصفح، بمرونة أكتر من مجرد فحص lang يبدأ بـ ar */
  private loadArabicVoice() {
    if (!('speechSynthesis' in window)) return;
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;

      // 1) دور على تطابق دقيق لـ ar-EG أو ar-SA الأول (أفضل جودة عادة)
      const preferredLocales = ['ar-eg', 'ar-sa', 'ar-ae', 'ar-xa'];
      let found = voices.find(v => preferredLocales.includes(v.lang?.toLowerCase()));

      // 2) أي صوت الـ lang بتاعه يبدأ بـ ar
      if (!found) found = voices.find(v => v.lang?.toLowerCase().startsWith('ar'));

      // 3) أي صوت اسمه فيه "Arabic" أو "عربي" حتى لو الـ lang tag مكتوب غلط
      if (!found) found = voices.find(v => /arabic|عربي/i.test(v.name));

      this.arabicVoice = found || null;
      this.voicesLoaded = true;
    };
    pick();
    window.speechSynthesis.onvoiceschanged = pick;
  }

  /** يجيب التنبيهات الاستباقية غير المحلولة (تحصين قريب / نفوق مرتفع...) */
  loadAlerts() {
    this.http.get<any[]>(`${environment.apiUrl}/ai/alerts`, { headers: this.headers() }).subscribe({
      next: (list) => this.alerts.set(list || []),
      error: () => { /* تجاهل بهدوء لو مفيش تنبيهات أو حصل خطأ بسيط */ }
    });
  }

  dismissAlert(id: string) {
    this.alerts.update(list => list.filter(a => a.id !== id));
    this.http.patch(`${environment.apiUrl}/ai/alerts/${id}/resolve`, {}, { headers: this.headers() }).subscribe({
      error: () => { /* حتى لو فشل الطلب، خليه مخفي في الواجهة */ }
    });
  }

  /** بيتنادى لما المستخدم يختار قطيع من القايمة، أو "سؤال عام" (null) */
  onFlockSelected(flockId: string | null) {
    this.activeFlockId.set(flockId);
    const flock = this.allFlocks().find(f => f.id === flockId);
    this.activeFlockName.set(flock?.name ?? null);
  }

  /** كل قطعان المستخدم — بيظهروا في selector يختار منه المستخدم صراحة، مفيش اختيار تلقائي */
  allFlocks = signal<{ id: string; name: string }[]>([]);

  loadActiveFlock() {
    this.flockService.getFlocks().subscribe({
      next: (flocks: any[]) => {
        this.allFlocks.set((flocks || []).filter(f => !f.status || f.status === 'active'));
        // ⚠️ من غير أي اختيار تلقائي — activeFlockId بيفضل null لحد ما
        // المستخدم يختار بنفسه من الـ selector، فالإجابات تبقى عامة افتراضياً
      },
      error: () => { /* مفيش قطعان لسه أو حصل خطأ — نكمل من غير سياق قطيع */ }
    });
  }

  /** يجيب آخر محادثة سابقة للمستخدم ويعرضها زي ما هي، بدل ما يبدأ من الصفر كل مرة */
  loadHistory() {
    this.http.get<any[]>(`${environment.apiUrl}/ai/history`, { headers: this.headers() }).subscribe({
      next: (logs) => {
        if (logs && logs.length) {
          const restored: Message[] = [];
          for (const log of logs) {
            const createdAt = log.created_at ? new Date(log.created_at) : new Date();
            restored.push({
              id: uid(), role: 'user', timestamp: createdAt,
              content: log.question,
            });
            if (log.answer) {
              restored.push({
                id: uid(), role: 'assistant', timestamp: createdAt,
                content: log.answer, sources: log.sources || [],
              });
              this.conversationHistory.push({ role: 'user', content: log.question });
              this.conversationHistory.push({ role: 'assistant', content: log.answer });
            }
          }
          this.messages.set(restored);
          this.conversationHistory = this.conversationHistory.slice(-10);
          this.needsScroll = true;
        } else {
          this.showWelcomeMessage();
        }
      },
      error: () => this.showWelcomeMessage()
    });
  }

  private showWelcomeMessage() {
    this.messages.set([{
      id: uid(), role: 'assistant', timestamp: new Date(),
      content: 'أهلاً، أنا مساعدك في تربية الدواجن.\n\nممكن أساعدك في الأمراض والعلاج، التغذية، التحصينات والجرعات، وإدارة المزرعة بشكل عام. اسأل عن أي حاجة.',
    }]);
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

  /**
   * بيضغط الصورة قبل ما يبعتها لـ Vision AI — صورة من موبايل حديث ممكن
   * تكون 5-10 ميجا، وده تكلفة API زيادة من غير أي فايدة حقيقية في الدقة
   * (Gemini مش محتاج دقة عالية أوي عشان يحلل طائر أو عنبر). بنقلل أطول ضلع
   * لـ 1024px ونحول لـ JPEG بجودة 80% — ده بيقلل الحجم لعشر الحجم الأصلي
   * غالباً من غير ما يأثر على جودة التحليل.
   */
  private compressImage(file: File, maxDimension = 1024, quality = 0.8): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = () => {
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject('canvas context failed'); return; }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async onImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const compressed = await this.compressImage(file);
      this.selectedImage.set(compressed);
      this.selectedImagePreview.set(compressed);
    } catch {
      // فشل الضغط لأي سبب (متصفح قديم مثلاً) — نرجع للصورة الأصلية بدل ما نمنع الرفع خالص
      const reader = new FileReader();
      reader.onload = () => {
        this.selectedImage.set(reader.result as string);
        this.selectedImagePreview.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.selectedImage.set(null);
    this.selectedImagePreview.set(null);
  }

  /** الرد الصوتي — ميزة Pro فقط، بتستخدم Web Speech Synthesis API */
  speakText(msg: Message) {
    if (!this.isPro()) {
      this.showUpgradeModal.set(true);
      return;
    }

    // لو بيسمّع نفس الرسالة دلوقتي، وقف
    if (this.speakingMessageId() === msg.id) {
      this.stopSpeaking();
      return;
    }

    // لو بيسمّع رسالة تانية، وقفها الأول
    this.stopSpeaking();

    const plain = this.stripMarkdown(msg.content);

    // جوه تطبيق الموبايل (Capacitor) — استخدم محرك النطق الحقيقي بتاع النظام
    if (Capacitor.isNativePlatform()) {
      this.speakingMessageId.set(msg.id);
      TextToSpeech.speak({
        text: plain,
        lang: 'ar-EG',
        rate: 1.0,
        category: 'ambient',
      }).then(() => {
        this.speakingMessageId.set(null);
      }).catch(() => {
        this.speakingMessageId.set(null);
        this.messages.update(m => [...m, {
          id: uid(), role: 'assistant', timestamp: new Date(),
          content: '⚠️ تعذر تشغيل الرد الصوتي على الجهاز ده.',
        }]);
      });
      return;
    }

    // في المتصفح العادي (مش تطبيق) — استخدم Web Speech API زي ما هو
    if (!('speechSynthesis' in window)) {
      this.messages.update(m => [...m, {
        id: uid(), role: 'assistant', timestamp: new Date(),
        content: '⚠️ متصفحك الحالي مش بيدعم الرد الصوتي. جرب Google Chrome.',
      }]);
      return;
    }

    window.speechSynthesis.cancel();

    // لو مفيش صوت عربي متثبت على الجهاز خالص، أفضل نوقف ونوضح للمربي بدل ما نقرا بلكنة غلط
    if (this.voicesLoaded && !this.arabicVoice) {
      this.messages.update(m => [...m, {
        id: uid(), role: 'assistant', timestamp: new Date(),
        content:
          '⚠️ جهازك مفيش عليه صوت عربي متثبت، فالقراءة الصوتية هتطلع بلكنة غلط.\n\n' +
          'على **Android**: هتلاقي صوت عربي جاهز غالباً من غير أي تثبيت.\n' +
          'على **Windows**: من Settings ← Time & Language ← Speech ← Manage voices ← ضيف صوت عربي.\n' +
          'على **iPhone**: من Settings ← Accessibility ← Spoken Content ← Voices ← ضيف Arabic.',
      }]);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(plain);
    utterance.lang = 'ar-EG';
    if (this.arabicVoice) utterance.voice = this.arabicVoice;
    utterance.rate = 1;

    utterance.onstart = () => this.speakingMessageId.set(msg.id);
    utterance.onend = () => this.speakingMessageId.set(null);
    utterance.onerror = () => this.speakingMessageId.set(null);

    window.speechSynthesis.speak(utterance);
  }

  private stopSpeaking() {
    if (Capacitor.isNativePlatform()) {
      TextToSpeech.stop().catch(() => {});
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.speakingMessageId.set(null);
  }

  /** التسجيل الصوتي — ميزة Pro فقط */
  async toggleVoiceInput() {
    if (!this.isPro()) {
      this.showUpgradeModal.set(true);
      return;
    }

    if (Capacitor.isNativePlatform()) {
      await this.toggleNativeVoiceInput();
      return;
    }

    // لو بيسجل دلوقتي، وقف التسجيل
    if (this.isRecording()) {
      this.recognition?.stop();
      return;
    }

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      this.messages.update(m => [...m, {
        id: uid(), role: 'assistant', timestamp: new Date(),
        content: '⚠️ متصفحك الحالي مش بيدعم التسجيل الصوتي. جرب Google Chrome على الموبايل أو الكمبيوتر.',
      }]);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    this.recognition = recognition;
    recognition.lang = 'ar-EG';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => this.isRecording.set(true);
    recognition.onerror = () => this.isRecording.set(false);
    recognition.onend = () => this.isRecording.set(false);
    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      this.input = transcript;
    };

    recognition.start();
  }

  /** التسجيل الصوتي جوه تطبيق الموبايل — بيستخدم SpeechRecognizer الأصلي بتاع أندرويد (مش Web Speech API) */
  private async toggleNativeVoiceInput() {
    if (this.isRecording()) {
      try { await SpeechRecognition.stop(); } catch {}
      this.isRecording.set(false);
      return;
    }

    try {
      const { available } = await SpeechRecognition.available();
      if (!available) {
        this.messages.update(m => [...m, {
          id: uid(), role: 'assistant', timestamp: new Date(),
          content: '⚠️ التسجيل الصوتي مش متاح على الجهاز ده.',
        }]);
        return;
      }

      const permission = await SpeechRecognition.requestPermissions();
      if (permission.speechRecognition !== 'granted') {
        this.messages.update(m => [...m, {
          id: uid(), role: 'assistant', timestamp: new Date(),
          content: '⚠️ لازم توافق على إذن المايك عشان تقدر تستخدم التسجيل الصوتي. تقدر تفعّله من إعدادات الموبايل ← التطبيقات ← سبا ← الأذونات.',
        }]);
        return;
      }

      await SpeechRecognition.removeAllListeners();
      SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
        if (data?.matches?.length) {
          this.input = data.matches[0];
        }
      });

      this.isRecording.set(true);
      await SpeechRecognition.start({
        language: 'ar-EG',
        partialResults: true,
        popup: false,
      });
    } catch (e) {
      console.error('Native speech recognition error:', e);
    } finally {
      this.isRecording.set(false);
      try { await SpeechRecognition.removeAllListeners(); } catch {}
    }
  }

  async send(text?: string) {
    const q = (text ?? this.input).trim();
    const hasImage = !!this.selectedImagePreview();
    if (!q && !hasImage) return;
    if (this.loading()) return;

    // زائر من غير حساب — اسمحله بـ 3 أسئلة مجانية بس، وبعدين اطلب منه يسجل
    const isGuest = !localStorage.getItem('spa_token');
    if (isGuest) {
      const used = Number(localStorage.getItem(GUEST_COUNT_KEY) || '0');
      if (used >= GUEST_QUESTION_LIMIT) {
        this.messages.update(m => [...m, {
          id: uid(), role: 'user', timestamp: new Date(), content: q || 'حلل هذه الصورة',
        }, {
          id: uid(), role: 'assistant', timestamp: new Date(),
          content: '🔒 استخدمت الأسئلة المجانية الثلاثة كلها. **سجّل حسابك مجاناً** عشان تكمل تسأل من غير حدود، وتقدر كمان تسجل بيانات قطيعك وتستخدم كل الميزات.',
        }]);
        this.needsScroll = true;
        return;
      }
      localStorage.setItem(GUEST_COUNT_KEY, String(used + 1));
    }

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
      const streamHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) streamHeaders['Authorization'] = `Bearer ${token}`; // من غير توكن خالص للزائر، مش "Bearer null"

      const response = await fetch(`${environment.apiUrl}/ai/stream`, {
        method: 'POST',
        headers: streamHeaders,
        body: JSON.stringify({
          question: q,
          language: 'ar',
          flock_id: this.activeFlockId(),
          conversation_history: this.conversationHistory.slice(-6),
          image_base64: imageToSend || null
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
                ? { ...x, content: fullAnswer, loading: false, streaming: false, sources, queryId: data.query_id }
                : x));
              this.conversationHistory.push({ role: 'assistant', content: fullAnswer });
              // لو الباك إند حدد قطيع (مثلاً أول رسالة قبل ما نجيب القطعان)، حدّث الهيدر بيه
              if (data.flock?.id && data.flock.id !== this.activeFlockId()) {
                this.activeFlockId.set(data.flock.id);
                this.activeFlockName.set(data.flock.name);
              }
              // حافظ على آخر 10 رسائل فقط
              if (this.conversationHistory.length > 10) {
                this.conversationHistory = this.conversationHistory.slice(-10);
              }
            }

            else if (data.type === 'confidence') {
              const level = data.content?.level;
              if (level) {
                this.messages.update(m => m.map(x => x.id === assistantId
                  ? { ...x, confidence: level }
                  : x));
              }
            }

            else if (data.type === 'alert') {
              const incoming: any[] = data.content || [];
              this.alerts.update(list => {
                const existingIds = new Set(list.map(a => a.id));
                const fresh = incoming.filter(a => !existingIds.has(a.id));
                return [...list, ...fresh];
              });
            }

            else if (data.type === 'suggestions') {
              this.messages.update(m => m.map(x => x.id === assistantId
                ? { ...x, suggestions: data.content }
                : x));
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

  sendFeedback(msg: Message, helpful: boolean) {
    if (!msg.queryId) return;
    const newState: 'up' | 'down' = helpful ? 'up' : 'down';
    if (msg.feedback === newState) return; // اتقيّم بنفس الطريقة قبل كده
    this.messages.update(m => m.map(x => x.id === msg.id ? { ...x, feedback: newState } : x));
    this.http.post(`${environment.apiUrl}/ai/feedback`,
      { query_id: msg.queryId, helpful },
      { headers: this.headers() }
    ).subscribe({
      error: () => { /* التقييم بصري بس، مش لازم نرجّعه لو الطلب فشل */ }
    });
  }

  copyText(msg: Message) {
    const plain = this.stripMarkdown(msg.content);
    navigator.clipboard.writeText(plain).then(() => {
      this.messages.update(m => m.map(x => x.id === msg.id ? { ...x, copied: true } : x));
      setTimeout(() => {
        this.messages.update(m => m.map(x => x.id === msg.id ? { ...x, copied: false } : x));
      }, 1800);
    });
  }

  async shareText(msg: Message) {
    const plain = this.stripMarkdown(msg.content);
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({ text: plain, title: 'مساعد الدواجن الذكي' });
        this.messages.update(m => m.map(x => x.id === msg.id ? { ...x, shared: true } : x));
        setTimeout(() => {
          this.messages.update(m => m.map(x => x.id === msg.id ? { ...x, shared: false } : x));
        }, 1800);
      } catch { /* المستخدم لغى المشاركة */ }
    } else {
      // Fallback: انسخ النص لو المتصفح مش بيدعم Web Share API
      this.copyText(msg);
    }
  }

  private stripMarkdown(text: string): string {
    return text
      .replace(/```[\s\S]*?```/g, (block) => block.replace(/```(\w*)\n?/, '').replace(/```$/, ''))
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/^#{1,3} /gm, '');
  }

  /** يتعامل مع الضغط على زرار "نسخ" الخاص بالـ code blocks جوه الرد */
  onContentClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const btn = target.closest('.copy-code-btn') as HTMLElement | null;
    if (!btn) return;
    const data = btn.getAttribute('data-copy');
    if (!data) return;
    navigator.clipboard.writeText(decodeURIComponent(data)).then(() => {
      const original = btn.innerHTML;
      btn.innerHTML = '✅ اتنسخ';
      setTimeout(() => { btn.innerHTML = original; }, 1500);
    });
  }

  /**
   * بتتعامل مع علامات Markdown اللي لسه ماخلصتش وصلت (** غير مقفولة، ``` غير
   * مقفولة) وقت الـ streaming — عشان الشكل مايتغيرش فجأة (يقفز من نص خام
   * لتنسيق) لما العلامة المقابلة توصل. من غيرها، Gemini بيبعت النص حرف
   * بحرف، والـ regex محتاج العلامة مقفولة عشان يحوّلها لتنسيق، فيظهر ** أو
   * ``` كنص خام لثانية وبعدين "يقفز" للشكل المنسّق فجأة.
   */
  private sanitizeStreamingMarkdown(text: string): string {
    // ** غير زوجي (فاتحة من غير قافلة) — نشيل آخر ** لحد ما القافلة توصل
    const boldCount = (text.match(/\*\*/g) || []).length;
    if (boldCount % 2 !== 0) {
      const lastIdx = text.lastIndexOf('**');
      text = text.slice(0, lastIdx) + text.slice(lastIdx + 2);
    }

    // ``` غير زوجية (code block لسه مفتوح) — نقفلها مؤقتاً عشان الكارت
    // يظهر ويكبر تدريجياً بدل ما يفضل نص خام لحد ما يوصل الإغلاق الحقيقي
    const fenceCount = (text.match(/```/g) || []).length;
    if (fenceCount % 2 !== 0) {
      text = text + '\n```';
    }

    return text;
  }

  renderMarkdown(text: string, isStreaming = false): SafeHtml {
    if (!text) return this.sanitizer.bypassSecurityTrustHtml('');
    if (isStreaming) text = this.sanitizeStreamingMarkdown(text);

    // 1) استخرج code blocks الأول عشان مفيش تنسيق تاني يأثر عليها
    const codeBlocks: string[] = [];
    let working = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, lang: string, code: string) => {
      const trimmed = code.replace(/\n$/, '');
      const escaped = trimmed
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const encoded = encodeURIComponent(trimmed);
      const label = lang ? lang.toUpperCase() : 'جرعة';
      const idx = codeBlocks.length;
      codeBlocks.push(
        `<div class="my-2 rounded-xl overflow-hidden border border-gray-700 bg-gray-900" dir="ltr">
          <div class="flex items-center justify-between px-3 py-1.5 bg-gray-800">
            <span class="text-xs font-bold text-gray-400 tracking-wide">${label}</span>
            <button class="copy-code-btn text-xs font-bold text-gray-300 hover:text-white" data-copy="${encoded}">📋 نسخ</button>
          </div>
          <pre class="p-3 overflow-x-auto text-xs leading-relaxed text-green-300"><code>${escaped}</code></pre>
        </div>`
      );
      return `%%CODEBLOCK_${idx}%%`;
    });

    // 2) حوّل جداول Markdown لجداول HTML
    working = this.renderTables(working);

    // 3) باقي تنسيقات الـ Markdown
    working = working
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

    // 4) رجّع الـ code blocks مكانها
    working = working.replace(/%%CODEBLOCK_(\d+)%%/g, (_m, idx: string) => codeBlocks[+idx]);

    return this.sanitizer.bypassSecurityTrustHtml(working);
  }

  /** يحوّل جدول Markdown (| عمود | عمود |) لجدول HTML منسّق */
  private renderTables(text: string): string {
    const lines = text.split('\n');
    const out: string[] = [];
    let i = 0;
    const isRowLine = (l: string) => /^\s*\|.*\|\s*$/.test(l);
    const isSepLine = (l: string) => isRowLine(l) && /^[\s|:-]+$/.test(l) && l.includes('-');
    const splitCells = (l: string) =>
      l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());

    while (i < lines.length) {
      if (isRowLine(lines[i]) && i + 1 < lines.length && isSepLine(lines[i + 1])) {
        const headerCells = splitCells(lines[i]);
        let j = i + 2;
        const rows: string[][] = [];
        while (j < lines.length && isRowLine(lines[j])) {
          rows.push(splitCells(lines[j]));
          j++;
        }
        let html = '<div class="my-2 overflow-x-auto rounded-xl border border-gray-200"><table class="w-full text-xs border-collapse">';
        html += '<thead><tr class="bg-green-50">' +
          headerCells.map(c => `<th class="px-2 py-1.5 font-bold text-green-800 border-b border-gray-200 text-start">${c}</th>`).join('') +
          '</tr></thead>';
        html += '<tbody>' + rows.map((r, ri) =>
          `<tr class="${ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">` +
          r.map(c => `<td class="px-2 py-1.5 border-b border-gray-100">${c}</td>`).join('') +
          '</tr>').join('') + '</tbody>';
        html += '</table></div>';
        out.push(html);
        i = j;
      } else {
        out.push(lines[i]);
        i++;
      }
    }
    return out.join('\n');
  }

  private scrollBottom() {
    try { this.cont.nativeElement.scrollTop = this.cont.nativeElement.scrollHeight; } catch {}
  }
}