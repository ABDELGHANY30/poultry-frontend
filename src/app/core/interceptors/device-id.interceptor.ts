import { HttpInterceptorFn } from '@angular/common/http';
import { from, switchMap } from 'rxjs';
import { Device } from '@capacitor/device';

// معرّف الجهاز بيتحسب مرة واحدة. على الموبايل من Capacitor، وعلى المتصفح (تطوير) من UUID محفوظ.
let cached: Promise<string> | null = null;

function deviceId(): Promise<string> {
  return (cached ??= Device.getId()
    .then(r => r.identifier)
    .catch(() => {
      let id = localStorage.getItem('device_id');
      if (!id) { id = crypto.randomUUID(); localStorage.setItem('device_id', id); }
      return id;
    }));
}

export const deviceIdInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('/auth/')) return next(req);
  return from(deviceId()).pipe(
    switchMap(id => next(req.clone({ setHeaders: { 'X-Device-Id': id } }))),
  );
};
