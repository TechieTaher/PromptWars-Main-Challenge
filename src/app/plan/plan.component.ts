import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService } from '../shared/api.service';
import { DatePipe } from '@angular/common';
import { MarkdownPipe } from '../shared/markdown.pipe';

@Component({
  selector: 'app-plan',
  standalone: true,
  imports: [DatePipe, MarkdownPipe],
  template: `
    <div class="p-8 max-w-4xl mx-auto w-full">
      <h1 class="text-3xl font-semibold tracking-tight mb-8">My Coaching Plan</h1>
      
      @if (plans().length > 0) {
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm overflow-hidden mb-12">
          <div class="p-6 border-b border-zinc-800 bg-emerald-950/20 flex justify-between items-center">
            <div>
              <div class="text-emerald-500 font-medium text-sm mb-1">CURRENT PLAN (v{{ plans()[0].version }})</div>
              <div class="text-zinc-400 text-sm">Updated {{ plans()[0].createdAt | date:'mediumDate' }}</div>
            </div>
          </div>
          <div class="p-8 prose prose-invert prose-emerald max-w-none leading-relaxed text-zinc-300" [innerHTML]="plans()[0].content | markdown">
          </div>
        </div>

        @if (plans().length > 1) {
          <h2 class="text-xl font-medium mb-6 flex items-center gap-2 text-zinc-300">
            <span class="material-icons text-zinc-500">history</span>
            Previous Versions
          </h2>
          <div class="space-y-4">
            @for (plan of plans().slice(1); track plan.id) {
              <div class="p-6 bg-zinc-950 border border-zinc-800 rounded-xl">
                <div class="flex justify-between items-start mb-4">
                  <div class="text-zinc-400 text-sm">v{{ plan.version }} • {{ plan.createdAt | date:'mediumDate' }}</div>
                </div>
                <div class="text-zinc-300 text-sm mb-4 p-4 bg-zinc-900 rounded-lg italic">
                  Change Summary: {{ plan.changeSummary }}
                </div>
                <details class="text-sm">
                  <summary class="cursor-pointer text-emerald-500 hover:text-emerald-400 outline-none">View full plan</summary>
                  <div class="mt-4 text-zinc-400 pl-4 border-l-2 border-zinc-800 prose prose-invert prose-emerald max-w-none" [innerHTML]="plan.content | markdown">
                  </div>
                </details>
              </div>
            }
          </div>
        }
      } @else {
        <div class="text-center p-12 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <span class="material-icons text-4xl text-zinc-600 mb-4">assignment</span>
          <p class="text-zinc-400">No plan generated yet. Please complete onboarding.</p>
        </div>
      }
    </div>
  `
})
export class PlanComponent implements OnInit {
  private api = inject(ApiService);
  plans = signal<any[]>([]);

  ngOnInit() {
    this.api.get<any[]>('/api/plans').subscribe(res => {
      this.plans.set(res);
    });
  }
}
