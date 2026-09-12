// import { Injectable, signal, computed, inject } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Router } from '@angular/router';
// import { tap } from 'rxjs';
// import { environment } from '../../../environments/environment';
// import { User, AuthResponse } from '../models';

// @Injectable({ providedIn: 'root' })
// export class AuthService {
//   private http   = inject(HttpClient);
//   private router = inject(Router);

//   private _user  = signal<User | null>(null);
//   private _token = signal<string | null>(null);

//   currentUser    = computed(() => this._user());
//   isAuthenticated= computed(() => !!this._token());
//   isAdmin        = computed(() => this._user()?.role === 'admin');

//   initAuth() {
//   const token = localStorage.getItem('spa_token');
//   const user  = localStorage.getItem('spa_user');

//   if (token && user && !this.isTokenExpired(token)) {
//     try {
//       this._token.set(token);
//       this._user.set(JSON.parse(user));
//       return;
//     } catch {
//       this.logout();
//     }
//   } else {
//     this.logout();
//   }
// }

// private saveAuth(token: string, user: User) {
//   localStorage.setItem('spa_token', token);
//   localStorage.setItem('spa_user', JSON.stringify(user));
// }

// private clearAuth() {
//   localStorage.removeItem('spa_token');
//   localStorage.removeItem('spa_user');
// }

//   login(email: string, password: string) {
//     return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/auth/login`, { email, password }).pipe(
//       tap(r => {
//         this._token.set(r.access_token);
//         this._user.set(r.user);
//         localStorage.setItem('spa_token', r.access_token);
//         localStorage.setItem('spa_user', JSON.stringify(r.user));
// //       })
// //     );
// //   }

// //   register(payload: { name: string; email: string; password: string; language: string }) {
// //     return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/auth/register`, payload).pipe(
// //       tap(r => {
// //         this._token.set(r.access_token);
// //         this._user.set(r.user);
// //         localStorage.setItem('spa_token', r.access_token);
// //         localStorage.setItem('spa_user', JSON.stringify(r.user));
// //       })
// //     );
// //   }
// // private isTokenExpired(token: string): boolean {
// //   try {
// //     const payload = JSON.parse(atob(token.split('.')[1]));
// //     return payload.exp * 1000 < Date.now();
// //   } catch {
// //     return true;
// //   }
// // }
// //   logout() {
// //     this._token.set(null); this._user.set(null);
// //     localStorage.removeItem('spa_token'); localStorage.removeItem('spa_user');
// //     this.router.navigate(['/auth/login']);
// //   }

// //   getToken() { return this._token(); }
// // }
// import { Injectable, signal, computed, inject } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Router } from '@angular/router';
// import { tap } from 'rxjs';
// import { environment } from '../../../environments/environment';
// import { User, AuthResponse } from '../models';

// @Injectable({ providedIn: 'root' })
// export class AuthService {
//   private http   = inject(HttpClient);
//   private router = inject(Router);

//   private _user  = signal<User | null>(null);
//   private _token = signal<string | null>(null);

//   currentUser    = computed(() => this._user());
//   isAuthenticated= computed(() => !!this._token());

//   // ✅ حساب صلاحية الأدمن مع التحقق من الـ Storage كمرجع طوارئ
//   isAdmin = computed(() => {
//     const user = this._user();
//     if (user) {
//       return user.role === 'admin';
//     }
//     const storedUser = localStorage.getItem('spa_user');
//     if (storedUser) {
//       try {
//         return JSON.parse(storedUser)?.role === 'admin';
//       } catch {
//         return false;
//       }
//     }
//     return false;
//   });

//   initAuth() {
//     const token = localStorage.getItem('spa_token');
//     const user  = localStorage.getItem('spa_user');

//     if (token && user && !this.isTokenExpired(token)) {
//       try {
//         this._token.set(token);
//         this._user.set(JSON.parse(user));
//         return;
//       } catch {
//         this.logout();
//       }
//     } else {
//       this.logout();
//     }
//   }

//   private saveAuth(token: string, user: User) {
//     localStorage.setItem('spa_token', token);
//     localStorage.setItem('spa_user', JSON.stringify(user));
//   }

//   private clearAuth() {
//     localStorage.removeItem('spa_token');
//     localStorage.removeItem('spa_user');
//   }

//   login(email: string, password: string) {
//     return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/auth/login`, { email, password }).pipe(
//       tap(r => {
//         this._token.set(r.access_token);
//         this._user.set(r.user);
//         this.saveAuth(r.access_token, r.user);
//       })
//     );
//   }

//   register(payload: { name: string; email: string; password: string; language: string }) {
//     return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/auth/register`, payload).pipe(
//       tap(r => {
//         this._token.set(r.access_token);
//         this._user.set(r.user);
//         this.saveAuth(r.access_token, r.user);
//       })
//     );
//   }

//   private isTokenExpired(token: string): boolean {
//     try {
//       const payload = JSON.parse(atob(token.split('.')[1]));
//       return payload.exp * 1000 < Date.now();
//     } catch {
//       return true;
//     }
//   }

//   logout() {
//     this._token.set(null); 
//     this._user.set(null);
//     this.clearAuth();
//     this.router.navigate(['/auth/login']);
//   }

//   getToken() { return this._token(); }
// }
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, AuthResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http   = inject(HttpClient);
  private router = inject(Router);

  private _user  = signal<User | null>(null);
  private _token = signal<string | null>(null);

  currentUser    = computed(() => this._user());
  isAuthenticated= computed(() => !!this._token());
  isAdmin        = computed(() => this._user()?.role === 'admin');

  initAuth() {
  const token = localStorage.getItem('spa_token');
  const user  = localStorage.getItem('spa_user');

  if (token && user && !this.isTokenExpired(token)) {
    try {
      this._token.set(token);
      this._user.set(JSON.parse(user));
      return;
    } catch {
      this.logout();
    }
  } else {
    this.logout();
  }
}

private saveAuth(token: string, user: User) {
  localStorage.setItem('spa_token', token);
  localStorage.setItem('spa_user', JSON.stringify(user));
}

private clearAuth() {
  localStorage.removeItem('spa_token');
  localStorage.removeItem('spa_user');
}

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/auth/login`, { email, password }).pipe(
      tap(r => {
        this._token.set(r.access_token);
        this._user.set(r.user);
        localStorage.setItem('spa_token', r.access_token);
        localStorage.setItem('spa_user', JSON.stringify(r.user));
      })
    );
  }

  register(payload: { name: string; email: string; password: string; language: string }) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/auth/register`, payload).pipe(
      tap(r => {
        this._token.set(r.access_token);
        this._user.set(r.user);
        localStorage.setItem('spa_token', r.access_token);
        localStorage.setItem('spa_user', JSON.stringify(r.user));
      })
    );
  }
private isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}
  logout() {
    this._token.set(null); this._user.set(null);
    localStorage.removeItem('spa_token'); localStorage.removeItem('spa_user');
    // ⚠️ الموقع بقى مفتوح للتصفح كزائر، فتسجيل الخروج يرجّعك للداشبورد عادي
    // مش يجبرك على صفحة تسجيل الدخول — التسجيل هيتطلب بس لو حاولت تستخدم
    // ميزة محتاجة حساب (زي إضافة قطيع أو تخطي حد الأسئلة المجانية في الشات)
    this.router.navigate(['/dashboard']);
  }

  getToken() { return this._token(); }
}