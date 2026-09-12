import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LibraryService } from '../../core/services/library.service';
import { Article } from '../../core/models';

@Component({
  selector: 'app-article-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
  <div class="page-wrapper" *ngIf="article()">

    <a routerLink="/library" class="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-800 no-underline">
      ← {{ 'COMMON.BACK' | translate }}
    </a>

    <!-- Article header -->
    <div class="rounded-3xl overflow-hidden border border-primary-100"
         style="background:linear-gradient(135deg,#f0faf4 0%,#ffffff 100%)">
      <div class="flex items-start gap-5 p-6">
        <div class="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center text-4xl flex-shrink-0">
          {{ article()!.icon }}
        </div>
        <div class="flex-1">
          <span class="text-[10px] font-black uppercase tracking-widest text-primary-600 mb-1 block">
            {{ article()!.category }}
          </span>
          <h1 class="text-xl font-black text-primary-900 leading-snug">
            {{ lang === 'ar' ? article()!.titleAr : article()!.titleEn }}
          </h1>
          <div class="flex items-center gap-4 mt-2 flex-wrap">
            <span class="text-xs text-[var(--c-muted)]">⏱ {{ article()!.readTimeMinutes }} min read</span>
            <div class="flex gap-1.5 flex-wrap">
              <span *ngFor="let t of article()!.tags"
                    class="text-[9px] font-bold bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                {{ t }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Article content -->
    <div class="card prose-custom"
         [dir]="lang === 'ar' ? 'rtl' : 'ltr'"
         [innerHTML]="parsedContent()">
    </div>

    <!-- Footer nav -->
    <div class="flex gap-3 flex-wrap">
      <a routerLink="/library" class="btn-outline btn">← {{ 'LIB.BACK' | translate }}</a>
      <a routerLink="/ai-assistant" class="btn-primary btn">🤖 {{ 'LIB.ASK_AI' | translate }}</a>
    </div>

  </div>
  `,
  styles: [`
    :host ::ng-deep .prose-custom {
      h2 { font-size:1.05rem; font-weight:800; color:#154128; margin:1.2rem 0 .5rem; padding-bottom:.4rem; border-bottom:2px solid #dcf5e4; }
      h3 { font-size:.95rem; font-weight:700; color:#1e7d48; margin:.9rem 0 .4rem; }
      p  { font-size:.875rem; line-height:1.75; color:#374151; margin-bottom:.75rem; }
      ul,ol { padding-inline-start:1.25rem; margin-bottom:.75rem; li { font-size:.875rem; color:#374151; margin-bottom:.3rem; } }
      strong { font-weight:800; color:#1a1a1a; }
      table { width:100%; border-collapse:collapse; margin-bottom:1rem; font-size:.8rem;
              th,td { padding:.5rem .75rem; border:1px solid #e2ece6; }
              th { background:#f0faf4; font-weight:800; color:#154128; }
              tr:nth-child(even) td { background:#f8fdf9; } }
      code { background:#1e2d1e; color:#86efac; font-size:.78rem; padding:.15rem .4rem; border-radius:.35rem; }
      pre { background:#1e2d1e; border-radius:.75rem; padding:1rem; overflow-x:auto; margin-bottom:1rem;
            code { background:none; color:#86efac; } }
    }
  `],
})
export class ArticleDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc   = inject(LibraryService);

  article = signal<Article | null>(null);
  lang = localStorage.getItem('lang') ?? 'ar';

  parsedContent = () => {
    const a = this.article();
    if (!a) return '';
    return this.md(this.lang === 'ar' ? a.contentAr : a.contentEn);
  };

  private md(text: string): string {
    return text
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\`\`\`[\w]*\n?([\s\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^\| (.+) \|$/gm, row => {
        const cells = row.split('|').map(c => c.trim()).filter(Boolean);
        return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
      })
      .replace(/((<tr>.*<\/tr>\n?)+)/g, '<table>$1</table>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>[\s\S]*?<\/li>)(\n<li>[\s\S]*?<\/li>)*/g, '<ul>$&</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[htupol])(.+)$/gm, '<p>$1</p>');
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.svc.getArticle(id).subscribe(a => a && this.article.set(a));
  }
}
