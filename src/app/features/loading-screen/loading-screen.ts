import { Component } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { LoaderService } from '../../core/services/loading.service';

@Component({
  selector: 'app-loading-screen',
  standalone: true,
  imports: [AsyncPipe, NgIf],
  template: `
    <div class="overlay" *ngIf="loader.visible$ | async">
      <svg class="chick-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="chickBodyG" cx="45%" cy="35%" r="70%">
      <stop offset="0" stop-color="#ffe866"/>
      <stop offset="1" stop-color="#ffc928"/>
    </radialGradient>
  </defs>
  <!-- grass -->
  <ellipse cx="100" cy="166" rx="56" ry="6" fill="#b9d77a"/>
  <path d="M46 166 Q52 140 62 128 Q64 148 70 166Z" fill="#5fa040"/>
  <path d="M60 166 Q66 146 80 138 Q76 154 78 166Z" fill="#78b552"/>
  <path d="M150 166 Q146 142 138 132 Q134 150 132 166Z" fill="#5fa040"/>
  <path d="M138 166 Q140 150 154 142 Q152 156 150 166Z" fill="#78b552"/>
  <!-- chick (this group turns) -->
  <g class="chick">
    <!-- legs and feet -->
    <path d="M88 150 L86 160" stroke="#f08a24" stroke-width="4" stroke-linecap="round"/>
    <path d="M112 150 L114 160" stroke="#f08a24" stroke-width="4" stroke-linecap="round"/>
    <path d="M78 164 Q86 156 88 160 Q92 158 96 164 Q88 162 86 166Z" fill="#f79a2e"/>
    <path d="M104 164 Q112 156 114 160 Q118 158 122 164 Q114 162 112 166Z" fill="#f79a2e"/>
    <!-- body -->
    <ellipse cx="100" cy="118" rx="44" ry="38" fill="url(#chickBodyG)"/>
    <!-- head -->
    <ellipse cx="100" cy="80" rx="43" ry="38" fill="url(#chickBodyG)"/>
    <!-- tuft -->
    <path d="M92 44 Q84 30 96 26 Q98 34 100 42Z" fill="#ffd11f"/>
    <path d="M98 42 Q98 28 110 26 Q108 36 106 44Z" fill="#ffc21a"/>
    <path d="M106 44 Q112 34 122 36 Q116 42 112 48Z" fill="#ffd11f"/>
    <!-- wing -->
    <path d="M60 106 Q46 122 62 140 Q84 142 92 122 Q88 104 60 106Z" fill="#ffd23a" stroke="#f2b41c" stroke-width="2"/>
    <path d="M62 118 Q74 124 84 122" stroke="#f2b41c" stroke-width="2" fill="none" stroke-linecap="round"/>
    <!-- cheeks -->
    <circle cx="72" cy="94" r="7" fill="#ff9c8a" opacity="0.55"/>
    <circle cx="128" cy="90" r="7" fill="#ff9c8a" opacity="0.55"/>
    <!-- brows -->
    <path d="M74 66 Q80 60 88 64" stroke="#7a4a1e" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M114 62 Q122 58 128 64" stroke="#7a4a1e" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <!-- eyes -->
    <circle cx="86" cy="80" r="10" fill="#4a2a18"/>
    <circle cx="82.5" cy="76" r="3.6" fill="#fff"/>
    <circle cx="90" cy="85" r="1.6" fill="#fff"/>
    <circle cx="120" cy="78" r="9" fill="#4a2a18"/>
    <circle cx="117" cy="74.5" r="3.2" fill="#fff"/>
    <circle cx="124" cy="83" r="1.4" fill="#fff"/>
    <!-- beak -->
    <path d="M96 92 Q106 86 116 92 Q112 104 104 104 Q96 100 96 92Z" fill="#f7902a"/>
    <path d="M100 96 Q106 94 112 96 Q108 102 104 102 Q100 100 100 96Z" fill="#c8442a"/>
  </g>
</svg>
      <div class="bar">
        <div class="fill" [style.width.%]="loader.progress$ | async"></div>
      </div>
    </div>
  `,
  styles: [`
    .overlay {
      position: fixed; inset: 0; z-index: 9999;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 20px;
      background: #ffffff;
    }
    .chick-svg { width: 150px; height: 150px; overflow: visible; }
    .chick {
      transform-box: fill-box;
      transform-origin: center;
      animation: turn 1.4s ease-in-out infinite;
    }
    @keyframes turn {
      0%   { transform: scaleX(1); }
      50%  { transform: scaleX(-1); }
      100% { transform: scaleX(1); }
    }
    .bar {
      width: 60%; max-width: 260px; height: 8px;
      background: #eeeeee; border-radius: 8px; overflow: hidden;
    }
    .fill {
      height: 100%; background: #ffc107;
      transition: width 0.15s ease-out;
    }
  `]
})
export class LoadingScreenComponent {
  constructor(public loader: LoaderService) {}
}
