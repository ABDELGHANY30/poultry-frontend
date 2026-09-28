import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [CommonModule],
  template:` 
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
          <span class="mazar3">MAZAR3.</span>
          <span class="ko-slot">
            <span class="ko-text" [class.hide]="iconIndex >= 0">ko</span>
            <span class="ko-icon" *ngIf="iconIndex >= 0">{{ icons[iconIndex] }}</span>
          </span>
        </div>

        <div class="progress-bar-wrapper">
          <div class="progress-bar" [style.width.%]="progress"></div>
        </div>
      </div>

    </div>
    `
  ,
  styles: [`
    .splash-container {
      position: fixed;
      inset: 0;
      direction: ltr;
      unicode-bidi: isolate;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #fdf6e8 !important;
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

    .hill {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 28%;
      z-index: 1;
    }

    .plants.left {
      position: absolute;
      bottom: 6%;
      left: 3%;
      width: 80px;
      opacity: 0.9;
      z-index: 1;
    }

    .barn {
      position: absolute;
      bottom: 5%;
      right: 4%;
      width: 130px;
      opacity: 0.9;
      z-index: 1;
    }

    .sparkle {
      position: absolute;
      bottom: 10%;
      right: 8%;
      width: 18px;
      opacity: 0.8;
      z-index: 1;
    }

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
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.5em;
      min-height: 1em;
    }

    .ko-text {
      transition: opacity 0.35s ease, transform 0.35s ease;
    }
    .ko-text.hide {
      opacity: 0;
      transform: translateY(-8px);
      position: absolute;
    }

    .ko-icon {
      font-size: 0.95em;
      line-height: 1;
      animation: pop 0.35s ease;
    }
    @keyframes pop {
      0%   { transform: scale(0.3); opacity: 0; }
      70%  { transform: scale(1.15); opacity: 1; }
      100% { transform: scale(1); }
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
  `]
})
export class SplashComponent implements OnInit {
  @Output() finished = new EventEmitter<void>();
  progress = 0;
  iconIndex = -1;
  icons = [ '🐓','🦆','🐇', '🦃',];

  ngOnInit() {
    const interval = setInterval(() => {
      this.progress += 0.7;

      if (this.progress >= 25 && this.iconIndex < 0) this.iconIndex = 0;
      else if (this.progress >= 50 && this.iconIndex < 1) this.iconIndex = 1;
      else if (this.progress >= 75 && this.iconIndex < 2) this.iconIndex = 2;
      else if (this.progress >= 95 && this.iconIndex < 3) this.iconIndex = 3;

      if (this.progress >= 100) {
        clearInterval(interval);
        setTimeout(() => this.finished.emit(), 400);
      }
    }, 40);
  }
}