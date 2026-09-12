// import { Injectable, inject } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { Observable } from 'rxjs';
// import { environment } from '../../../environments/environment';

// export interface AdminStats {
//   totalUsers: number;
//   totalFlocks: number;
//   aiQueriesToday: number;
//   totalArticles: number;
//   activeAlerts: number;
//   upcomingVaccines: number;
// }

// export interface AdminInsight {
//   icon: string;
//   textKey: string;
//   value: string;
//   color: string;
// }

// export interface AdminUser {
//   id: string;
//   name: string;
//   email: string;
//   role: string;
//   flocks: number;
//   joined: string;
//   active: boolean;
// }

// export interface AiLog {
//   id: string;
//   user: string;
//   q: string;
//   lang: string;
//   fb: number | null; // 1: helpful, -1: unhelpful, null: no feedback
//   time: string;
// }

// export interface ArticlePayload {
//   titleEn: string;
//   titleAr: string;
//   category: string;
//   tags: string;
//   contentEn: string;
//   contentAr: string;
// }

// @Injectable({ providedIn: 'root' })
// export class AdminService {
//   private http = inject(HttpClient);
//   private baseUrl = `${environment.apiUrl}/admin`;

//   // جلب إحصائيات النظام
//   getStats(): Observable<AdminStats> {
//     return this.http.get<AdminStats>(`${this.baseUrl}/stats`);
//   }

//   // جلب قائمة المستخدمين
//   getUsers(): Observable<AdminUser[]> {
//     return this.http.get<AdminUser[]>(`${this.baseUrl}/users`);
//   }

//   // جلب سجّلات الـ AI
//   getAiLogs(): Observable<AiLog[]> {
//     return this.http.get<AiLog[]>(`${this.baseUrl}/ai-logs`);
//   }

//   // نشر مقالة جديدة للنظام أو قاعدة بيانات RAG
//   publishArticle(article: ArticlePayload): Observable<{ success: boolean; id: string }> {
//     return this.http.post<{ success: boolean; id: string }>(`${this.baseUrl}/articles`, article);
//   }
// }
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ─── INTERFACES ───────────────────────────────────────────

export interface AdminStats {
  total_users: number;
  total_flocks: number;
  ai_queries_today: number;
  ai_queries_total?: number;
  active_alerts: number;
  articles_count: number;
  new_users_this_week?: number;
}

export interface AdminInsight {
  icon: string;
  textKey: string;
  value: string;
  color: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  flocks?: number;
  created_at?: string;
  active?: boolean;
}

export interface AiLog {
  id: string;
  user_name?: string;
  query: string;
  language: string;
  feedback?: number | null;
  created_at: string;
}

export interface ArticlePayload {
  titleEn: string;
  titleAr: string;
  category: string;
  tags: string;
  contentEn: string;
  contentAr: string;
}

// 💰 أنواع بيانات الأسعار الجديدة
export interface PriceItem {
  label: string;
  unit: string;
  price: number;
}

export interface PriceStoreData {
  items: { [key: string]: PriceItem };
  last_updated: string | null;
}

// ─── SERVICE ──────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/admin`;

  // 1. جلب إحصائيات النظام
  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.baseUrl}/stats`);
  }

  // 2. جلب قائمة الأسعار
  getPrices(): Observable<PriceStoreData> {
    return this.http.get<PriceStoreData>(`${this.baseUrl}/prices`);
  }

  // 3. تحديث الأسعار
  updatePrices(prices: { [key: string]: number }): Observable<any> {
    return this.http.put(`${this.baseUrl}/prices`, { prices });
  }

  // 4. جلب قائمة المستخدمين
  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.baseUrl}/users`);
  }

  // 5. جلب سجّلات الـ AI
  getAiLogs(): Observable<AiLog[]> {
    return this.http.get<AiLog[]>(`${this.baseUrl}/ai-logs`);
  }

  // 6. نشر مقالة جديدة
  publishArticle(article: ArticlePayload): Observable<{ success: boolean; id: string }> {
    return this.http.post<{ success: boolean; id: string }>(`${this.baseUrl}/articles`, article);
  }

  // 7. ترقية حساب مستخدم
  upgradeUser(userId: string, plan: string = 'pro', days: number = 30): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/${userId}/upgrade?plan=${plan}&expires_days=${days}`, {});
  }

  // 8. تخفيض حساب مستخدم
  downgradeUser(userId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/${userId}/downgrade`, {});
  }
}