import { Injectable, inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HttpActivityService {
  private count = 0;
  readonly pending$ = new BehaviorSubject<number>(0);
  inc() { this.pending$.next(++this.count); }
  dec() { this.pending$.next(--this.count); }
}

export const httpActivityInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);
  const activity = inject(HttpActivityService);
  activity.inc();
  return next(req).pipe(finalize(() => activity.dec()));
};
