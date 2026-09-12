import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AlertService, Alert } from '../../core/services/alert.service';

type Tab = 'all' | 'active' | 'resolved';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, DatePipe, TranslateModule],
  template: `
  <div class="page-wrapper">

    <div>
      <h1 class="text-2xl font-black text-primary-900">🔔 {{ 'ALERTS.TITLE' | translate }}</h1>
      <p class="text-sm text-[var(--c-muted)] mt-0.5">
        {{ activeCount() }} {{ 'ALERTS.ACTIVE_COUNT' | translate }}
      </p>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div *ngFor="let s of summary()"
           class="card flex items-center gap-3 animate-in">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
             [style.background]="s.bg">{{ s.icon }}</div>
        <div>
          <p class="text-xl font-black" [style.color]="s.color">{{ s.count }}</p>
          <p class="text-[10px] text-[var(--c-muted)] font-semibold">{{ s.label | translate }}</p>
        </div>
      </div>
    </div>

    <div class="flex gap-2 flex-wrap">
      <button *ngFor="let t of tabs" class="btn btn-sm transition-all"
        [class.btn-primary]="tab() === t.key"
        [class.btn-ghost]="tab() !== t.key"
        (click)="tab.set(t.key)">
        {{ t.key | translate }}
        <span *ngIf="t.count() > 0"
              class="w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
              [class.bg-white]="tab() === t.key"
              [class.text-primary-700]="tab() === t.key"
              [class.bg-red-500]="tab() !== t.key"
              [class.text-white]="tab() !== t.key">
          {{ t.count() }}
        </span>
      </button>
    </div>

    <div class="space-y-3">
      <div *ngFor="let a of filtered()"
           class="bg-white rounded-2xl border overflow-hidden flex animate-in transition-opacity"
           [class.opacity-60]="a.resolved"
           [class.border-red-200]="a.type==='danger' && !a.resolved"
           [class.border-orange-200]="a.type==='warning' && !a.resolved"
           [class.border-blue-200]="a.type==='info' && !a.resolved"
           [class.border-[var(--c-border)]]="a.resolved || a.type==='success'">

        <div class="w-1 flex-shrink-0"
             [class.bg-red-500]="a.type==='danger'"
             [class.bg-orange-400]="a.type==='warning'"
             [class.bg-blue-500]="a.type==='info'"
             [class.bg-green-400]="a.type==='success'">
        </div>

        <div class="flex-1 p-4 flex items-start gap-3">
          <div class="text-2xl mt-0.5 flex-shrink-0">{{ typeIcon(a.type) }}</div>

          <div class="flex-1 min-w-0">
            <div class="flex items-start gap-2 flex-wrap">
              <p class="text-sm font-bold text-[var(--c-text)] flex-1">
                {{ a.title }}
              </p>
              <span class="badge flex-shrink-0"
                    [class.badge-critical]="a.type==='danger'"
                    [class.badge-high]="a.type==='warning'"
                    [class.badge-medium]="a.type==='info'"
                    [class.badge-low]="a.type==='success'">
                {{ ('ALERTS.T.' + a.type.toUpperCase()) | translate }}
              </span>
            </div>
            <div class="flex items-center gap-3 mt-1 flex-wrap">
              <span *ngIf="a.flock_name" class="text-xs text-[var(--c-muted)]">🐔 {{ a.flock_name }}</span>
              <span class="text-[10px] text-[var(--c-faint)]">{{ a.createdAt | date:'short' }}</span>
            </div>
            <p *ngIf="a.description"
               class="text-xs text-[var(--c-muted)] mt-1.5 leading-relaxed">
              {{ a.description }}
            </p>
          </div>

          <div class="flex-shrink-0 self-center">
            <button *ngIf="!a.resolved"
                    class="btn btn-sm btn-outline"
                    (click)="resolve(a.id)">
              ✓ {{ 'ALERTS.RESOLVE' | translate }}
            </button>
            <span *ngIf="a.resolved" class="text-xs font-bold text-green-600">✅ {{ 'ALERTS.RESOLVED' | translate }}</span>
          </div>
        </div>
      </div>

      <div *ngIf="filtered().length === 0" class="text-center py-12">
        <p class="text-4xl mb-3">{{ tab() === 'active' ? '✅' : '📋' }}</p>
        <p class="text-[var(--c-muted)] font-medium">
          {{ tab() === 'active' ? ('ALERTS.NONE_ACTIVE' | translate) : ('ALERTS.NONE' | translate) }}
        </p>
      </div>
    </div>

  </div>
  `,
})
export class AlertsComponent implements OnInit {
  private svc = inject(AlertService);
  all     = this.svc.alerts;
  tab     = signal<Tab>('active');

  activeCount = computed(() => this.all().filter(a => !a.resolved).length);
  
  filtered = computed(() => {
    switch (this.tab()) {
      case 'active':   return this.all().filter(a => !a.resolved);
      case 'resolved': return this.all().filter(a => a.resolved);
      default:         return this.all();
    }
  });

  tabs = [
    { key: 'all'      as Tab, count: computed(() => this.all().length) },
    { key: 'active'   as Tab, count: computed(() => this.all().filter(a=>!a.resolved).length) },
    { key: 'resolved' as Tab, count: computed(() => this.all().filter(a=>a.resolved).length) },
  ];

  summary = computed(() => {
    const active = this.all().filter(a => !a.resolved);
    return [
      { icon:'🔴', label:'ALERTS.S.CRITICAL', count: active.filter(a=>a.type==='danger').length, color:'#dc2626', bg:'#fee2e2' },
      { icon:'🟠', label:'ALERTS.S.HIGH',     count: active.filter(a=>a.type==='warning').length,    color:'#ea580c', bg:'#ffedd5' },
      { icon:'💉', label:'ALERTS.S.VACCINES', count: active.filter(a=>(a.title ?? '').includes('تحصين') || (a.title ?? '').includes('Vaccination')).length, color:'#1d4ed8', bg:'#dbeafe' },
      { icon:'💊', label:'ALERTS.S.MEDS',     count: active.filter(a=>a.type==='info').length,       color:'#2563eb', bg:'#eff6ff' }, 
    ];
  });

  typeIcon(t: 'danger' | 'warning' | 'info' | 'success') {
    return { danger:'🚨', warning:'⏳', info:'💊', success:'✅' }[t] ?? '🔔';
  }

  resolve(id: string) { 
    this.svc.resolve(id).subscribe(); 
  }

  ngOnInit() { 
    this.svc.loadAlerts().subscribe(); 
  }
}