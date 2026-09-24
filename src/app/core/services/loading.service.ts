// loader.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoaderService {
  visible$ = new BehaviorSubject(true);
  progress$ = new BehaviorSubject(0);
  private pending = 0;
  private timer: any;

  start() {
    if (this.pending++ === 0) {
      this.progress$.next(0);
      this.visible$.next(true);
      this.timer = setInterval(() => {
        const p = this.progress$.value;
        this.progress$.next(p + (90 - p) * 0.06);
      }, 100);
    }
  }

  stop() {
    if (--this.pending <= 0) {
      this.pending = 0;
      clearInterval(this.timer);
      this.progress$.next(100);
      setTimeout(() => this.visible$.next(false), 300);
    }
  }
}