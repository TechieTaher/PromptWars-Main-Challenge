import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService } from '../shared/api.service';
import { Router } from '@angular/router';

import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="p-8 max-w-5xl mx-auto w-full">
      <div class="flex justify-between items-end mb-8">
        <div>
          <h1 class="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p class="text-zinc-400 mt-1">Here is your daily overview.</p>
        </div>
        <button (click)="generateNudge()" [disabled]="loadingNudge()" class="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg transition-colors border border-zinc-700 disabled:opacity-50">
          <span class="material-icons text-sm text-emerald-400">auto_awesome</span>
          Generate Nudge
        </button>
      </div>

      <!-- Nudges Section -->
      @if (nudges().length > 0) {
        <div class="mb-8 space-y-4">
          @for (nudge of nudges(); track nudge.id) {
            <div class="p-4 bg-emerald-950/30 border border-emerald-900/50 rounded-xl flex items-start gap-4">
              <span class="material-icons text-emerald-400 mt-1">lightbulb</span>
              <div class="flex-1">
                <p class="text-emerald-100">{{ nudge.content }}</p>
                <div class="mt-2 text-xs text-emerald-500/70">{{ nudge.generatedAt | date:'medium' }}</div>
              </div>
            </div>
          }
        </div>
      }

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <!-- Quick Check-in -->
        <div class="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm">
          <h2 class="text-xl font-medium mb-4 flex items-center gap-2">
            <span class="material-icons text-zinc-400">check_circle</span>
            Quick Check-in
          </h2>
          
          <div class="space-y-4">
            @if (habits().length > 0) {
              <div>
                <label class="block text-sm font-medium text-zinc-400 mb-1">Habit</label>
                <select [value]="selectedHabitId()" (change)="onHabitChange($event)" class="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 focus:outline-none focus:border-emerald-500">
                  <option [value]="0" disabled>Select a habit...</option>
                  @for (habit of habits(); track habit.id) {
                    <option [value]="habit.id">{{ habit.name }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-zinc-400 mb-1">Did you slip?</label>
                <div class="flex gap-4">
                  <button (click)="slipped.set(false)" [class.bg-emerald-600]="!slipped()" [class.text-white]="!slipped()" [class.bg-zinc-950]="slipped()" class="flex-1 py-2 rounded-xl border border-zinc-800 transition-colors">No, stayed strong</button>
                  <button (click)="slipped.set(true)" [class.bg-red-600]="slipped()" [class.text-white]="slipped()" [class.bg-zinc-950]="!slipped()" class="flex-1 py-2 rounded-xl border border-zinc-800 transition-colors">Yes, slipped</button>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-zinc-400 mb-1">Craving Intensity (1-5)</label>
                <input type="range" min="1" max="5" [value]="cravingIntensity()" (input)="onIntensityChange($event)" class="w-full accent-emerald-500">
                <div class="flex justify-between text-xs text-zinc-500 mt-1">
                  <span>None</span>
                  <span>{{ cravingIntensity() }}</span>
                  <span>Extreme</span>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-zinc-400 mb-1">Mood</label>
                <input type="text" [value]="mood()" (input)="onMoodChange($event)" placeholder="How are you feeling?" class="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-100 focus:outline-none focus:border-emerald-500">
              </div>

              <button (click)="submitCheckIn()" [disabled]="!selectedHabitId() || checkInLoading()" class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50 mt-4 flex justify-center items-center gap-2">
                @if(checkInLoading()) {
                  <span class="material-icons animate-spin text-sm">refresh</span>
                }
                Save Check-in
              </button>
            } @else {
              <div class="text-zinc-500 p-4 bg-zinc-950 rounded-xl text-center">
                No habits configured. Go to Onboarding or Habits page.
              </div>
            }
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <h2 class="text-xl font-medium mb-4 flex items-center gap-2">
            <span class="material-icons text-zinc-400">history</span>
            Recent Check-ins
          </h2>
          
          <div class="flex-1 overflow-y-auto space-y-3">
            @for (checkin of checkIns(); track checkin.id) {
              <div class="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex justify-between items-center">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full" [class.bg-emerald-500]="!checkin.slipped" [class.bg-red-500]="checkin.slipped"></span>
                    <span class="font-medium">{{ getHabitName(checkin.habitId) }}</span>
                  </div>
                  <div class="text-sm text-zinc-400 mt-1">Intensity: {{ checkin.cravingIntensity }}/5 • {{ checkin.mood }}</div>
                </div>
                <div class="text-xs text-zinc-500">{{ checkin.date }}</div>
              </div>
            }
            @if (checkIns().length === 0) {
              <div class="text-zinc-500 text-center py-8">No check-ins yet.</div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  habits = signal<any[]>([]);
  nudges = signal<any[]>([]);
  checkIns = signal<any[]>([]);

  // Form state
  selectedHabitId = signal<number>(0);
  slipped = signal<boolean>(false);
  cravingIntensity = signal<number>(1);
  mood = signal<string>('');
  checkInLoading = signal<boolean>(false);
  loadingNudge = signal<boolean>(false);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.api.get<any[]>('/api/habits').subscribe({
      next: (h) => {
        this.habits.set(h);
        if (h.length > 0 && this.selectedHabitId() === 0) {
          this.selectedHabitId.set(h[0].id);
        }
        if (h.length === 0) {
           // Redirect to onboarding if no habits? 
           // For now just keep them on dashboard.
        }
      }
    });

    this.api.get<any[]>('/api/nudges').subscribe({
      next: (n) => this.nudges.set(n)
    });

    this.api.get<any[]>('/api/checkins').subscribe({
      next: (c) => this.checkIns.set(c)
    });
  }

  getHabitName(id: number) {
    return this.habits().find(h => h.id === id)?.name || 'Unknown';
  }

  onHabitChange(event: any) {
    this.selectedHabitId.set(Number(event.target.value));
  }

  onIntensityChange(event: any) {
    this.cravingIntensity.set(Number(event.target.value));
  }

  onMoodChange(event: any) {
    this.mood.set(event.target.value);
  }

  submitCheckIn() {
    this.checkInLoading.set(true);
    const payload = {
      habitId: this.selectedHabitId(),
      date: new Date().toISOString().split('T')[0],
      slipped: this.slipped(),
      cravingIntensity: this.cravingIntensity(),
      mood: this.mood()
    };

    this.api.post('/api/checkins', payload).subscribe({
      next: () => {
        this.checkInLoading.set(false);
        this.loadData(); // reload checkins
        this.mood.set('');
        this.slipped.set(false);
        this.cravingIntensity.set(1);
      },
      error: () => {
        this.checkInLoading.set(false);
      }
    });
  }

  generateNudge() {
    this.loadingNudge.set(true);
    this.api.post('/api/nudges/generate', {}).subscribe({
      next: () => {
        this.loadingNudge.set(false);
        this.api.get<any[]>('/api/nudges').subscribe(n => this.nudges.set(n));
      },
      error: () => {
        this.loadingNudge.set(false);
      }
    });
  }
}
