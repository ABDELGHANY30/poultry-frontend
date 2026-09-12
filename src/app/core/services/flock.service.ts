import { Injectable, signal, inject } from '@angular/core';
import { Observable, of, tap, map } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Flock, FlockCreate, DailyRecord, DailyRecordCreate, FlockAnalytics } from '../models';

@Injectable({ providedIn: 'root' })
export class FlockService {
  private http = inject(HttpClient);

  // جعل الـ Signal يبدأ بمصفوفة فارغة تماماً للتخلص من الـ Mock
  private _flocks = signal<Flock[]>([]);
  readonly flocks = this._flocks.asReadonly();

  // الحصول على التوكن لإرساله مع طلبات الكتابة والتحديث
  private getHeaders() {
    const token = localStorage.getItem('spa_token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  /**
   * دالة مساعدة لتحويل كائن القطيع القادم من الباكيند (Python backend format)
   * من صيغة snake_case إلى الصيغة التي يتوقعها واجهة الأنجولار (camelCase)
   */
  private mapFlock(raw: any): Flock {
    return {
      id: raw.id,
      userId: raw.user_id || raw.userId || 'dev-01',
      name: raw.name,
      type: raw.type,
      // تأمين الأرقام لمنع الـ NaN
      initialCount: Number(raw.initial_count ?? raw.initialCount ?? 0),
      currentCount: Number(raw.current_count ?? raw.currentCount ?? 0),
      startDate: raw.start_date || raw.startDate,
      status: raw.status || 'active',
      ageInDays: Number(raw.age_in_days ?? raw.ageInDays ?? 0),
      mortalityRate: Number(raw.mortality_rate ?? raw.mortalityRate ?? 0),
      createdAt: raw.created_at || raw.createdAt,
      breed: raw.breed
    };
  }

  // دالة مساعدة لتحويل سجل يومي قادم من الباكيند (snake_case) لصيغة الفرونت (camelCase)
  private mapRecord(raw: any): DailyRecord {
    return {
      id: raw.id,
      flockId: raw.flock_id || raw.flockId,
      recordDate: raw.record_date || raw.recordDate,
      mortality: Number(raw.mortality ?? 0),
      feedConsumedKg: Number(raw.feed_consumed_kg ?? raw.feedConsumedKg ?? 0),
      temperatureCelsius: raw.temperature_celsius ?? raw.temperatureCelsius ?? null,
      avgWeightKg: raw.avg_weight_kg ?? raw.avgWeightKg ?? null,
      waterConsumedL: raw.water_consumed_l ?? raw.waterConsumedL ?? null,
      // 🥚 حقول البياض
      eggCount: raw.egg_count ?? raw.eggCount ?? null,
      brokenEggCount: raw.broken_egg_count ?? raw.brokenEggCount ?? null,
      notes: raw.notes ?? null,
      createdAt: raw.created_at || raw.createdAt
    } as DailyRecord;
  }

  // 1. جلب القطعان الحقيقية من الباكيند مع التحويل الآمن
  getFlocks(): Observable<Flock[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/flocks/`).pipe(
      map(rawList => (rawList || []).map(raw => this.mapFlock(raw))),
      tap(flocks => this._flocks.set(flocks))
    );
  }

  // 2. جلب تفاصيل قطيع واحد من الباكيند
  getFlock(id: string): Observable<Flock> {
    return this.http.get<any>(`${environment.apiUrl}/flocks/${id}`).pipe(
      map(raw => this.mapFlock(raw))
    );
  }

  // 3. إنشاء قطيع جديد وإرساله للباكيند
  createFlock(payload: FlockCreate): Observable<Flock> {
    // تحويل البيانات المرسلة إلى snake_case ليقبلها الباكيند بسهولة
    const body = {
      name: payload.name,
      type: payload.type,
      initial_count: payload.initialCount,
      start_date: payload.startDate,
      breed: payload.breed
    };

    return this.http.post<any>(`${environment.apiUrl}/flocks/`, body, { headers: this.getHeaders() }).pipe(
      map(raw => this.mapFlock(raw)),
      tap(newFlock => {
        this._flocks.update(prev => [newFlock, ...prev]);
      })
    );
  }

  // 4. إضافة سجل يومي (سواء نفوق، علف، بيض، إلخ)
  addRecord(r: any): Observable<any> {
    const rawRecord = r as any;
    const targetFlockId = rawRecord.flock_id || rawRecord.flockId;

    // 1. جلب الـ Headers
    const tokenHeaders = this.getHeaders();

    // 2. تجهيز الـ body بنفس الحقول المبعوثة بدون حذف الـ id
    const body: Record<string, any> = {
      id: rawRecord.id,
      flock_id: targetFlockId,
      record_date: rawRecord.record_date || rawRecord.recordDate,
      mortality: Number(rawRecord.mortality || 0)
    };

    // إضافة الحقول الاختيارية لو كانت موجودة فعلاً في r
    if (rawRecord.feed_consumed_kg !== undefined && rawRecord.feed_consumed_kg !== null) {
      body['feed_consumed_kg'] = Number(rawRecord.feed_consumed_kg);
    }
    if (rawRecord.temperature_celsius !== undefined && rawRecord.temperature_celsius !== null) {
      body['temperature_celsius'] = Number(rawRecord.temperature_celsius);
    }
    if (rawRecord.avg_weight_kg !== undefined && rawRecord.avg_weight_kg !== null) {
      body['avg_weight_kg'] = Number(rawRecord.avg_weight_kg);
    }
    if (rawRecord.water_consumed_l !== undefined && rawRecord.water_consumed_l !== null) {
      body['water_consumed_l'] = Number(rawRecord.water_consumed_l);
    }
    // 🥚 حقول خاصة بقطعان البياض
    if (rawRecord.egg_count !== undefined && rawRecord.egg_count !== null) {
      body['egg_count'] = Number(rawRecord.egg_count);
    }
    if (rawRecord.broken_egg_count !== undefined && rawRecord.broken_egg_count !== null) {
      body['broken_egg_count'] = Number(rawRecord.broken_egg_count);
    }
    if (rawRecord.notes) {
      body['notes'] = rawRecord.notes;
    }

    // 3. إرسال الـ POST بالرابط الصحيح المخصص للقطيع المحدد
    const url = `${environment.apiUrl}/flocks/${targetFlockId}/records`;

    return this.http.post<any>(url, body, { headers: tokenHeaders }).pipe(
      tap(() => {
        const mortalityCount = body['mortality'] || 0;
        this._flocks.update(prev => prev.map(f => {
          if (f.id === targetFlockId) {
            const nextCount = Math.max(0, f.currentCount - mortalityCount);
            const totalDead = f.initialCount - nextCount;
            const nextMortalityRate = f.initialCount > 0
              ? +((totalDead / f.initialCount) * 100).toFixed(2)
              : 0;

            return {
              ...f,
              currentCount: nextCount,
              mortalityRate: nextMortalityRate
            };
          }
          return f;
        }));
      })
    );
  }

  // 5. جلب التحليلات الحقيقية للقطيع من الباكيند
  getAnalytics(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/flocks/${id}/analytics`).pipe(
      map(raw => {
        const rawData = raw as any;
        const totalMortality = Number(
          rawData.total_mortality !== undefined && rawData.total_mortality !== null
            ? rawData.total_mortality
            : (Number(rawData.initial_count || 0) - Number(rawData.current_count || 0))
        );
        const mortalityRate = Number(raw.mortality_rate ?? 0);

        return {
          flockId: raw.flock_id || raw.flockId || id,
          fcr: Number(raw.fcr ?? 0),
          mortalityRate: mortalityRate,
          avgDailyGain: Number(raw.avg_daily_gain ?? raw.avgDailyGain ?? 0),
          totalFeedKg: Number(raw.total_feed_kg ?? raw.totalFeedKg ?? 0),
          totalMortality: totalMortality,
          healthScore: Number(raw.health_score ?? Math.max(40, 95 - Math.round(mortalityRate * 8))),
          projectedSlaughterDate: raw.projected_slaughter_date || raw.projectedSlaughterDate,

          // 🥚 إجمالي البيض المجموع لقطعان البياض (لو الباكيند بيرجعه)
          totalEggs: Number(raw.total_eggs ?? raw.totalEggs ?? 0),
          avgLayRate: Number(raw.avg_lay_rate ?? raw.avgLayRate ?? 0),

          weightHistory: (raw.weight_history || raw.weightHistory || []).map((h: any) => ({
            date: h.date,
            weight: Number(h.weight ?? 0)
          })),
          mortalityHistory: (raw.mortality_history || raw.mortalityHistory || []).map((h: any) => ({
            date: h.date,
            count: Number(h.count ?? 0)
          })),
          tempHistory: (raw.temp_history || raw.tempHistory || []).map((h: any) => ({
            date: h.date,
            temp: Number(h.temp ?? 0)
          })),
          // 🥚 سجل البيض اليومي (تاريخ + عدد) لقطعان البياض
          eggHistory: (raw.egg_history || raw.eggHistory || []).map((h: any) => ({
            date: h.date,
            count: Number(h.count ?? 0)
          }))
        };
      })
    );
  }

  // 6. 🥚 جلب كل السجلات اليومية لقطيع معين (بيستخدم أساساً لعرض سجلات البياض اليومية بالتفصيل)
  getRecords(flockId: string): Observable<DailyRecord[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/flocks/${flockId}/records`).pipe(
      map(rawList => (rawList || []).map(raw => this.mapRecord(raw)))
    );
  }

  // 7. 🧹 مسح قطيع من القايمة المحلية (بيستخدم بعد قفل الدورة وخلوص التقييم عشان القطيع يختفي من الشاشة فورًا)
  removeFlockLocally(flockId: string): void {
    this._flocks.update(prev => prev.filter(f => f.id !== flockId));
  }
}
