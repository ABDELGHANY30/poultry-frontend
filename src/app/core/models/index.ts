// ═══════════════════════════════════════════════════════════
//  Smart Poultry Assistant — Domain Models
// ═══════════════════════════════════════════════════════════

export type Lang = 'ar' | 'en';
export type FlockType = 'broiler' | 'layer' | 'rabbit' | 'turkey' | 'duck' | 'quail';
export type Flockbreedbroiler   = 'cobb' | 'ross'|'hyber';
export type FlockStatus = 'active'  | 'closed';
export type AlertPriority = 'critical' | 'high' | 'medium' | 'low';
export type AlertType     = 'vaccination' | 'temperature' | 'mortality' | 'feeding';
export type UserRole      = 'farmer' | 'admin';

// ── Auth ─────────────────────────────────────────────────────
export interface User {
  id: string; name: string; email: string;
  phone?: string; role: UserRole; language: Lang;
  createdAt: string;
  
}
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  loading?: boolean;
  imagePreview?: string;  // ← أضف السطر ده
}
export interface AuthResponse {
   access_token: string; tokenType: string; user: User;
}

// ── Flock ─────────────────────────────────────────────────────
export interface Flock {
  id: string; userId: string;
  name: string; type: FlockType;
  initialCount: number; currentCount: number;
  startDate: string; status: FlockStatus;
  ageInDays: number; mortalityRate: number;
  createdAt: string;
  breed:string;
}

export interface FlockCreate {
  name: string; type: FlockType;
  initialCount: number; startDate: string;
  breed:string
}

// ── Daily Record ─────────────────────────────────────────────
// export interface DailyRecord {
//   id: string; flockId: string; recordDate: string;
//   mortality: number; feedConsumedKg: number;
//   temperatureCelsius: number; avgWeightKg?: number;
//   waterConsumedL?: number; notes?: string; createdAt: string;
// }

// export interface DailyRecordCreate {
//   flockId: string; recordDate: string;
//   mortality: number; feedConsumedKg: number;
//   temperatureCelsius: number; avgWeightKg?: number;
//   waterConsumedL?: number; notes?: string;
// }
export interface DailyRecordCreate {
  flockId: string;
  recordDate?: string;
  mortality?: number;
  feedConsumedKg?: number;
  temperatureCelsius?: number | null;
  avgWeightKg?: number | null;
  waterConsumedL?: number | null;
  eggCount?: number | null;        // 👈 جديد - بس لقطعان البياض
  brokenEggCount?: number | null;  // 👈 جديد - اختياري
  notes?: string | null;
}

export interface DailyRecord extends DailyRecordCreate {
  id: string;
  createdAt: string;
}
// ── Analytics ─────────────────────────────────────────────────
export interface FlockAnalytics {
  flockId: string; fcr: number; mortalityRate: number;
  avgDailyGain: number; totalFeedKg: number;
  totalMortality: number; healthScore: number;
  projectedSlaughterDate?: string;
  weightHistory:   { date: string; weight: number }[];
  mortalityHistory:{ date: string; count:  number }[];
  tempHistory:     { date: string; temp:   number }[];
}

// ── Alert ─────────────────────────────────────────────────────
export interface Alert {
  id: string; userId: string; flockId?: string; flockName?: string;
  type: AlertType; priority: AlertPriority;
  titleEn: string; titleAr: string;
  messageEn?: string; messageAr?: string;
  dueDate?: string; resolved: boolean; resolvedAt?: string; createdAt: string;
}

// ── Library ───────────────────────────────────────────────────
export interface Article {
  id: string;
  titleEn: string; titleAr: string;
  summaryEn: string; summaryAr: string;
  contentEn: string; contentAr: string;
  category: string; icon: string; tags: string[];
  readTimeMinutes: number; published: boolean;
  createdAt: string; updatedAt: string;
}

export interface ArticleCreate {
  titleEn: string; titleAr: string;
  summaryEn: string; summaryAr: string;
  contentEn: string; contentAr: string;
  category: string; icon?: string;
  tags: string[]; readTimeMinutes?: number;
}

// ── AI ────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string; role: 'user' | 'assistant';
  content: string; timestamp: Date;
  sources?: { title: string; similarity: number }[];
  loading?: boolean;
}

export interface AIQueryRequest {
  question: string; language: Lang; flockId?: string;
  conversationHistory?: { role: string; content: string }[];
}

export interface AIQueryResponse {
  answer: string; sources: { title: string; similarity: number }[];
  queryId: string; language: string;
}

// ── Admin ─────────────────────────────────────────────────────
export interface AdminStats {
  totalUsers: number; totalFlocks: number;
  aiQueriesToday: number; aiQueriesTotal: number;
  activeAlerts: number; articlesCount: number;
  newUsersThisWeek: number;
}

export interface AiQueryLog {
  id: string; userId?: string; userName: string;
  question: string; answer?: string; language: string;
  feedback?: number; createdAt: string;
}

// ── Vaccination Schedule ──────────────────────────────────────
export interface VaccinationItem {
  day: number; nameEn: string; nameAr: string;
  method: string; done: boolean;
}
