import { Component, OnInit, OnDestroy, Output, EventEmitter, Input, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="splash-container" [class.dark]="isDark" role="status" aria-label="mazar3.ko">

      <svg class="hill" viewBox="0 0 1280 300" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,120 C300,40 900,180 1280,90 L1280,300 L0,300 Z" class="hill-fill"/>
      </svg>

      <svg class="plants left" viewBox="0 0 200 200" aria-hidden="true">
        <path d="M20,180 Q10,120 40,90 Q30,130 50,150 Q35,110 60,80 Q55,125 75,140 Q60,100 85,70"
              fill="none" class="plant-stroke" stroke-width="6" stroke-linecap="round"/>
      </svg>

      <svg class="sparkle" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20,0 L24,16 L40,20 L24,24 L20,40 L16,24 L0,20 L16,16 Z" class="plant-fill"/>
      </svg>

      <div class="center-content">

        <!-- شعار الحظيرة: الحيوانات بتطير ليها وتدخل من الباب -->
        <svg #mark class="mark" [class.bump]="barnBump" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="29" class="mark-bg"/>
          <path d="M13 52V29l19-15 19 15v23z" class="mark-fg"/>
          <rect x="24" y="35" width="16" height="17" class="mark-bg"/>
          <path d="M24 35l16 17M40 35L24 52" class="mark-line" stroke-width="2" fill="none"/>
        </svg>

        <div class="logo">
          <span class="word">Mazar<span class="three">3</span>.</span>
          <span #koSlot class="ko-slot">
            <span class="flip-el"
                  [class.pop]="animState === 'pop'"
                  [class.fly]="animState === 'fly'"
                  [class.gone]="animState === 'gone'"
                  [style.--dx]="dx + 'px'"
                  [style.--dy]="dy + 'px'">{{ displayValue }}</span>
          </span>
        </div>

        <div class="progress-bar-wrapper" role="progressbar"
             aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="progress | number:'1.0-0'">
          <div class="progress-bar" [style.width.%]="progress"></div>
        </div>
      </div>

    </div>`
  ,
  styles: [`
    /* خط Baloo 2 بيتحمل من index.html (مفيش @import هنا عشان ميتحسبش في budget الـ component) */
    .splash-container {
      /* الوضع العادي */
      --bg: #FFF6E0;
      --ink: #0F3D2E;
      --accent: #F2A900;
      --pill-bg: #0F3D2E;
      --pill-ink: #FFF6E0;
      --hill: #F5E2AE;
      --plant: #E9C98E;
      --track: rgba(15, 61, 46, 0.14);
      --bar: #F2A900;
      --mark-bg: #0F3D2E;
      --mark-fg: #FFC93C;
      --shadow: rgba(15, 61, 46, 0.4);

      position: fixed;
      inset: 0;
      direction: ltr;
      unicode-bidi: isolate;
      isolation: isolate;
      color-scheme: light;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--bg) !important;
      opacity: 1 !important;
      overflow: hidden;
      z-index: 99999;
    }

    /* الوضع الدارك */
    .splash-container.dark {
      --bg: #0F3D2E;
      --ink: #FFF6E0;
      --accent: #FFC93C;
      --pill-bg: #FFC93C;
      --pill-ink: #0F3D2E;
      --hill: #16503C;
      --plant: #1F6B50;
      --track: rgba(255, 246, 224, 0.16);
      --bar: #FFC93C;
      --mark-bg: #FFC93C;
      --mark-fg: #0F3D2E;
      --shadow: rgba(0, 0, 0, 0.5);
      color-scheme: dark;
    }

    .center-content {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .hill { position: absolute; bottom: 0; left: 0; width: 100%; height: 28%; z-index: 1; }
    .hill-fill { fill: var(--hill); }
    .plants.left { position: absolute; bottom: 6%; left: 3%; width: 80px; opacity: 0.9; z-index: 1; }
    .plant-stroke { stroke: var(--plant); }
    .plant-fill { fill: var(--plant); }
    .sparkle { position: absolute; bottom: 10%; right: 8%; width: 18px; opacity: 0.8; z-index: 1; }

    .mark {
      width: clamp(72px, 22vw, 104px);
      height: auto;
      margin-bottom: 18px;
      transform-origin: 50% 90%;
    }
    .mark-bg { fill: var(--mark-bg); }
    .mark-fg { fill: var(--mark-fg); }
    .mark-line { stroke: var(--mark-fg); }

    /* الحظيرة بتنتفض لما حيوان يدخلها */
    .mark.bump { animation: barnBump 0.35s ease; }
    @keyframes barnBump {
      0%   { transform: scale(1, 1); }
      40%  { transform: scale(1.1, 0.92); }
      70%  { transform: scale(0.97, 1.04); }
      100% { transform: scale(1, 1); }
    }

    .logo {
      display: flex;
      align-items: center;
      direction: ltr;
      font-size: clamp(34px, 10vw, 56px);
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1;
      color: var(--ink);
      font-family: 'Baloo 2', 'Nunito', 'Segoe UI', system-ui, sans-serif;
    }
    .word { text-shadow: 0 4px 0 var(--shadow), 0 10px 18px var(--shadow); }
    .three { color: var(--accent); }

    .ko-slot {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.9em;
      padding: 0.14em 0.42em;
      margin-left: 0.14em;
      border-radius: 999px;
      background: var(--pill-bg);
      color: var(--pill-ink);
      box-shadow: 0 6px 14px var(--shadow);
      font-size: 0.68em;
      letter-spacing: 0;
    }

    .flip-el {
      display: inline-block;
      position: relative;
      z-index: 5;
      will-change: transform;
    }
    .flip-el.pop  { animation: popIn 0.28s ease both; }
    .flip-el.fly  { animation: flyToBarn 0.7s cubic-bezier(0.45, 0, 0.75, 0.6) forwards; }
    .flip-el.gone { opacity: 0; }

    @keyframes popIn {
      0%   { transform: scale(0.3); opacity: 0; }
      70%  { transform: scale(1.15); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    /* الحيوان بيطلع في قوس لحد باب الحظيرة ويصغر ويختفي جواها */
    @keyframes flyToBarn {
      0%   { transform: translate(0, 0) scale(1); opacity: 1; }
      45%  { transform: translate(calc(var(--dx) * 0.45), calc(var(--dy) * 0.45 - 28px)) scale(0.9); opacity: 1; }
      100% { transform: translate(var(--dx), var(--dy)) scale(0.2); opacity: 0; }
    }

    .progress-bar-wrapper {
      width: 200px;
      max-width: 55vw;
      height: 8px;
      background: var(--track);
      border-radius: 10px;
      margin-top: 26px;
      overflow: hidden;
    }
    .progress-bar {
      height: 100%;
      background: var(--bar);
      transition: width 0.15s linear;
      border-radius: 10px;
    }

    @media (prefers-reduced-motion: reduce) {
      .flip-el.pop, .flip-el.fly { animation: none; }
      .mark.bump { animation: none; }
    }
 ` ]
})
export class SplashComponent implements OnInit, OnDestroy {
  @Output() finished = new EventEmitter<void>();
  /** لما يبقى true (التطبيق جاهز: أول صفحة اتحملت) الشريط يكمّل 100% والـ splash يقفل */
  @Input() ready = false;
  /** 'auto' يتبع وضع الموبايل أو كلاس الدارك في التطبيق، أو اجبره على 'light' / 'dark' */
  @Input() theme: 'auto' | 'light' | 'dark' = 'auto';

  @ViewChild('koSlot') koSlot?: ElementRef<HTMLElement>;
  @ViewChild('mark') markEl?: ElementRef<SVGElement>;

  progress = 0;
  isDark = false;

  // ko بيفضل ثابت، والحيوانات بتتبعت للحظيرة واحد ورا التاني
  private animals = ['🐓', '🦃', '🐇', '🦆'];
  displayValue = 'ko';
  animState: 'idle' | 'pop' | 'fly' | 'gone' = 'idle';
  barnBump = false;
  dx = 0; // مسافة الطيران لحد باب الحظيرة
  dy = 0;

  private progressTimer: any;
  private timeouts: any[] = [];
  private stopped = false;
  private closing = false;   // التحميل خلص، منتظرين الحيوان اللي في الطريق يدخل الحظيرة
  private finishing = false; // بدأنا نقفل فعلاً

  ngOnInit() {
    this.isDark = this.detectDark();

    // شريط التقدم: يوصل بسرعة لحد 90%، وبعدها يمشي ببطء جداً وهو مستني التطبيق يجهز
    // (الحيوانات فضلت تتبعت للحظيرة طول ما بيستنى)، ولما ready=true يكمّل 100% ويقفل.
    this.progressTimer = setInterval(() => {
      if (this.progress < 90) {
        this.progress += 2;
        return;
      }
      if (!this.ready) {
        this.progress = Math.min(97, this.progress + 0.15);
        return;
      }
      this.progress = Math.min(100, this.progress + 3);
      if (this.progress >= 100) {
        clearInterval(this.progressTimer);
        this.closing = true;
        // لو مفيش حيوان في الطريق نقفل بسرعة، وغير كده نستنى الحيوان يدخل الحظيرة الأول
        if (this.displayValue === 'ko') this.finish(500);
      }
    }, 40);

    // أول حاجة ko ثابت (زي ما هو في index.html)، وبعدها الحيوانات تبدأ
    this.later(900, () => this.sendAnimal(0));
  }

  ngOnDestroy() {
    clearInterval(this.progressTimer);
    this.stopAnimation();
  }

  /** حيوان يظهر في الكبسولة، يستنى شوية، يطير للحظيرة، وبعدين اللي بعده */
  private sendAnimal(i: number) {
    if (this.stopped) return;
    if (i >= this.animals.length) {
      this.showKo();
      return;
    }

    this.displayValue = this.animals[i];
    this.animState = 'pop';

    this.later(650, () => {
      this.measure();
      this.animState = 'fly';
      this.later(560, () => this.bumpBarn());
      this.later(700, () => {
        this.animState = 'gone';
        this.later(120, () => {
          if (this.closing) {
            this.finish(600); // الحيوان دخل الحظيرة، نرجّع ko ونقفل
          } else {
            this.sendAnimal(i + 1);
          }
        });
      });
    });
  }

  /** قفل الـ splash: يلغي أي دورة جاية، يظهر ko، ويستنى شوية وبعدين يبعت finished */
  private finish(holdMs: number) {
    if (this.finishing) return;
    this.finishing = true;
    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts = [];
    if (this.displayValue !== 'ko') {
      this.displayValue = 'ko';
      this.animState = 'pop';
    }
    this.later(holdMs, () => {
      this.stopped = true;
      this.finished.emit();
    });
  }

  /** بعد آخر حيوان: ko يرجع يظهر ويفضل شوية وبعدين الدورة تتعاد */
  private showKo() {
    this.displayValue = 'ko';
    this.animState = 'pop';
    this.later(1000, () => this.sendAnimal(0));
  }

  private bumpBarn() {
    this.barnBump = false;
    requestAnimationFrame(() => (this.barnBump = true));
  }

  /** بيحسب المسافة من الكبسولة لباب الحظيرة (مركز الباب عند 44/64 من ارتفاع الشعار) */
  private measure() {
    const slot = this.koSlot?.nativeElement.getBoundingClientRect();
    const mark = this.markEl?.nativeElement.getBoundingClientRect();
    if (!slot || !mark) return;
    this.dx = mark.left + mark.width / 2 - (slot.left + slot.width / 2);
    this.dy = mark.top + mark.height * (44 / 64) - (slot.top + slot.height / 2);
  }

  private stopAnimation() {
    this.stopped = true;
    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts = [];
    this.displayValue = 'ko';
    this.animState = 'idle';
  }

  private later(ms: number, fn: () => void) {
    this.timeouts.push(setTimeout(fn, ms));
  }

  private detectDark(): boolean {
    if (this.theme === 'dark') return true;
    if (this.theme === 'light') return false;
    if (typeof window === 'undefined') return false;

    const root = document.documentElement;
    const body = document.body;
    const classes = ['dark', 'dark-theme', 'dark-mode'];
    const hasDarkClass = classes.some(c => root.classList.contains(c) || body.classList.contains(c));
    const dataDark = root.getAttribute('data-theme') === 'dark' || body.getAttribute('data-theme') === 'dark';
    const systemDark = !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    return hasDarkClass || dataDark || systemDark;
  }
}
