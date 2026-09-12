import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HttpHeaders } from '@angular/common/http'; 

export interface AIQueryRequest {
  question: string;
  language: string;
  flock_id?: string;
  conversation_history?: { role: string; content: string }[];
  image_base64?: string;
}

export interface AIQueryResponse {
  answer: string;
  sources: { title: string; similarity: number }[];
  query_id: string;
  language: string;
  has_image: boolean;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private http = inject(HttpClient);

  // query(req: AIQueryRequest): Observable<AIQueryResponse> {
  //   return this.http.post<AIQueryResponse>(`${environment.apiUrl}/ai/query`, req);
  // }
  // أضف استيراد HttpHeaders

// ... داخل الكلاس
query(req: AIQueryRequest): Observable<AIQueryResponse> {
    // تركنا اسم التوكن 'access_token' كما هو بناءً على تأكيدك 👍
    const token = localStorage.getItem('access_token'); 

    // أضفنا الـ Content-Type والـ Accept لضمان وصول الحروف العربية سليمة 100%
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.post<AIQueryResponse>(
      `${environment.apiUrl}/ai/query`, 
      req, 
      { headers }
    );
}
// query(req: AIQueryRequest): Observable<AIQueryResponse> {
//     // اسحب التوكن من الـ localStorage (تأكد من الاسم اللي بتخزنه بيه)
//     const token = localStorage.getItem('access_token'); 

//     const headers = new HttpHeaders({
//       'Authorization': `Bearer ${token}`
//     });

//     return this.http.post<AIQueryResponse>(
//       `${environment.apiUrl}/ai/query`, 
//       req, 
//       { headers }
//     );
// }
  imageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = () => reject('Failed to read image');
      reader.readAsDataURL(file);
    });
  }

  validateImage(file: File): { valid: boolean; error?: string } {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;
    if (!allowed.includes(file.type)) return { valid: false, error: 'يُسمح فقط بـ JPG أو PNG أو WebP' };
    if (file.size > maxSize) return { valid: false, error: 'الحجم الأقصى 5MB' };
    return { valid: true };
  }

  submitFeedback(queryId: string, helpful: boolean): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/ai/feedback`, { query_id: queryId, helpful });
  }
}
