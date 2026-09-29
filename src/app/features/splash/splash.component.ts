import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="splash-container">

      <svg class="hill" viewBox="0 0 1280 300" preserveAspectRatio="none">
        <path d="M0,120 C300,40 900,180 1280,90 L1280,300 L0,300 Z" fill="#f3dfb8"/>
      </svg>

      <svg class="plants left" viewBox="0 0 200 200">
        <path d="M20,180 Q10,120 40,90 Q30,130 50,150 Q35,110 60,80 Q55,125 75,140 Q60,100 85,70"
              fill="none" stroke="#e9c98e" stroke-width="6" stroke-linecap="round"/>
      </svg>

      <svg class="barn" viewBox="0 0 220 180">
        <polygon points="30,90 110,30 190,90" fill="#f0d4a3"/>
        <rect x="40" y="90" width="140" height="80" fill="#f0d4a3"/>
        <rect x="90" y="120" width="40" height="50" fill="#e9c98e"/>
        <circle cx="110" cy="140" r="3" fill="#f3dfb8"/>
        <line x1="40" y1="170" x2="180" y2="170" stroke="#e9c98e" stroke-width="4"/>
      </svg>

      <svg class="sparkle" viewBox="0 0 40 40">
        <path d="M20,0 L24,16 L40,20 L24,24 L20,40 L16,24 L0,20 L16,16 Z" fill="#f0d4a3"/>
      </svg>

      <div class="center-content">
        <div class="logo">
          <span class="mazar3">mazar3.</span>
          <span class="ko-slot">
            <span class="flip-el" [class.flipping]="isFlipping">{{ displayValue }}</span>
          </span>
        </div>

        <div class="progress-bar-wrapper">
          <div class="progress-bar" [style.width.%]="progress"></div>
        </div>
      </div>

    </div>`
  ,
  styles: [`
    .splash-container {
      position: fixed;
      inset: 0;
      direction: ltr;
      unicode-bidi: isolate;
      isolation: isolate;
      color-scheme: light;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #fdf6e8 !important;
      opacity: 1 !important;
      overflow: hidden;
      z-index: 99999;
    }

    .center-content {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .hill { position: absolute; bottom: 0; left: 0; width: 100%; height: 28%; z-index: 1; }
    .plants.left { position: absolute; bottom: 6%; left: 3%; width: 80px; opacity: 0.9; z-index: 1; }
    .barn { position: absolute; bottom: 5%; right: 4%; width: 130px; opacity: 0.9; z-index: 1; }
    .sparkle { position: absolute; bottom: 10%; right: 8%; width: 18px; opacity: 0.8; z-index: 1; }

    .logo {
      display: flex;
      align-items: center;
      direction: ltr;
      font-size: clamp(30px, 8vw, 52px);
      font-weight: 800;
      color: #6b8e23;
      font-family: -apple-system, 'Segoe UI', sans-serif;
    }

    .ko-slot {
      display: inline-block;
      min-width: 1.5em;
      min-height: 1em;
      perspective: 300px;
    }
    .flip-el {
  display: inline-block;
  transform-style: preserve-3d;
  backface-visibility: hidden;
  will-change: transform;
}
.flip-el.flipping {
  animation: flipDigit 0.45s ease;
}
@keyframes flipDigit {
  0%   { transform: rotateY(0deg); }
  50%  { transform: rotateY(90deg); }
  100% { transform: rotateY(0deg); }
}

    .progress-bar-wrapper {
      width: 200px;
      max-width: 55vw;
      height: 8px;
      background: rgba(107, 142, 35, 0.15);
      border-radius: 10px;
      margin-top: 24px;
      overflow: hidden;
    }
    .progress-bar {
      height: 100%;
      background: #6b8e23;
      transition: width 0.15s linear;
      border-radius: 10px;
    }
 ` ]
})
export class SplashComponent implements OnInit, OnDestroy {
  @Output() finished = new EventEmitter<void>();

  progress = 0;
  isFlipping = false;

  // ko يظهر الأول، وبعدين الحيوانات بتلف باستمرار
  private sequence = ['ko', '🦆', '🐇', '🦃', '🐓', '🐦']; // بط، أرنب، رومي، ديك، سمان(بديل)
  private seqIndex = 0;
  displayValue = this.sequence[0];
  private progressTimer: any;
  private flipTimer: any;

  ngOnInit() {
    // شريط التقدم مستقل تمامًا عن دوران الأيقونات
    this.progressTimer = setInterval(() => {
      this.progress += 2;
      if (this.progress >= 100) {
        clearInterval(this.progressTimer);
        clearInterval(this.flipTimer);
        setTimeout(() => this.finished.emit(), 400);
      }
    }, 40);

    // دوران مستمر على الحيوانات كل 450ms طول ما التحميل شغال
    this.flipTimer = setInterval(() => {
      this.seqIndex = (this.seqIndex + 1) % this.sequence.length;
      this.flipTo(this.sequence[this.seqIndex]);
    }, 450);
  }

  ngOnDestroy() {
    clearInterval(this.progressTimer);
    clearInterval(this.flipTimer);
  }

  private flipTo(next: string) {
    this.isFlipping = false;
    // إعادة تشغيل الأنيميشن (لازم نشيل الكلاس لحظة عشان يعيد التشغيل)
    requestAnimationFrame(() => {
      this.isFlipping = true;
      setTimeout(() => { this.displayValue = next; }, 225);
    });
  }
}