// import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StreakService } from '../../core/services/streak.service'; // ⚠️ عدّل المسار
import { Component, computed, inject, OnInit } from '@angular/core';

@Component({
  selector: 'app-streak-mini',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (streakService.streak(); as s) {
      @if (s.current_streak > 0) {
        <div class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-bold">
          <span>{{ emoji() }}</span>
          <span>{{ s.current_streak }}</span>
        </div>
      }
    }
  `,
})
export class StreakMiniComponent implements OnInit {
  streakService = inject(StreakService);

  async ngOnInit() {
    // لو الداشبورد بيتفتح بعد صفحة القطيع في نفس الجلسة، البيانات هتكون
    // متجددة أصلاً من هناك — بس بننادي تاني للأمان لو فتح الداشبورد لوحده
    await this.streakService.refresh();
  }

  emoji = computed(() => {
    const streak = this.streakService.streak()?.current_streak ?? 0;
    return streak < 3 ? '🔥' : streak < 7 ? '🔥🔥' : '🔥🔥🔥';
  });
}
