/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService } from '../shared/api.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-habits',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="p-8 max-w-5xl mx-auto w-full space-y-12">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-semibold tracking-tight">Habits & Routine</h1>
        <button (click)="generateQuestions()" [disabled]="generating()" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50">
          <span class="material-icons text-[20px]">psychology</span>
          {{ generating() ? 'Generating...' : 'Ask More Questions' }}
        </button>
      </div>

      <!-- Deep Dive Questions -->
      @if (qas().length > 0) {
        <section class="bg-indigo-950/20 border border-indigo-900/50 rounded-2xl p-6 shadow-sm">
          <div class="flex items-center gap-2 mb-6">
            <span class="material-icons text-indigo-400">psychology</span>
            <h2 class="text-xl font-medium text-indigo-100">Deep Dive Assessment</h2>
          </div>
          
          <div class="space-y-6">
            @for (qa of qas(); track qa.id) {
              <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <p class="text-zinc-200 font-medium mb-3">{{ qa.question }}</p>
                @if (qa.answer) {
                  <p class="text-zinc-400 text-sm whitespace-pre-wrap">{{ qa.answer }}</p>
                } @else {
                  <div class="flex gap-3">
                    <textarea [(ngModel)]="answers[qa.id]" rows="2" placeholder="Your answer..." class="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-100 focus:border-indigo-500 outline-none resize-none"></textarea>
                    <button (click)="submitAnswer(qa.id)" [disabled]="!answers[qa.id]" class="self-end bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">Save</button>
                  </div>
                }
              </div>
            }
          </div>
        </section>
      }

      <!-- Multi-Agent Habit Refiner & Splitter -->
      <section class="bg-indigo-950/20 border border-indigo-900/50 rounded-2xl p-6 shadow-sm" id="sec-multi-agent">
        <div class="flex items-center gap-2 mb-4">
          <span class="material-icons text-emerald-400">psychology</span>
          <h2 class="text-xl font-medium text-emerald-100">Multi-Agent Habit Refiner & Splitter</h2>
        </div>
        <p class="text-zinc-400 text-sm mb-6 leading-relaxed">
          Some habits entered during onboarding might combine multiple actions (like <strong>"using phone, and sleep schedule"</strong>). 
          Our Root Coordinator Agent can delegate to specialist agents (Extractor, Modeler, Data Synchronizer) to analyze and split them into separate detailed habits, routine entries, and triggers.
        </p>

        @if (combinedHabits().length === 0) {
          <div class="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-xl text-zinc-400 text-sm flex items-center gap-2">
            <span class="material-icons text-emerald-500">check_circle</span>
            No combined habits detected! All your habits look distinct and fully split.
          </div>
        } @else {
          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="select-split-habit" class="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Select Combined Habit to Split</label>
                <select id="select-split-habit" [ngModel]="selectedHabitId()" (ngModelChange)="selectedHabitId.set($event)" class="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:border-emerald-500 outline-none">
                  @for (h of combinedHabits(); track h.id) {
                    <option [value]="h.id">{{ h.name }}</option>
                  }
                </select>
              </div>

              <div>
                <label for="input-split-additional" class="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Additional Explanation / Answer (Optional)</label>
                <input id="input-split-additional" type="text" [(ngModel)]="additionalExplanation" placeholder="e.g., I scroll my phone late in bed which delays sleep." class="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:border-emerald-500 outline-none">
              </div>
            </div>

            <button (click)="runMultiAgentSplit()" [disabled]="splitting()" class="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50" id="btn-run-split">
              <span class="material-icons">diversity_3</span>
              {{ splitting() ? 'Executing Multi-Agent Graph...' : 'Execute Multi-Agent Splitter' }}
            </button>
          </div>
        }

        <!-- Split Progress and Results -->
        @if (splitting()) {
          <div class="mt-6 border-t border-indigo-900/40 pt-6 space-y-4 animate-pulse">
            <h3 class="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Agents Execution Log (Graph Orchestration)</h3>
            <div class="space-y-3">
              <div class="flex items-center gap-3 text-xs text-indigo-300 bg-indigo-950/40 p-3 rounded-lg border border-indigo-900/30">
                <span class="material-icons animate-spin text-[16px]">refresh</span>
                <span>[Root Coordinator Agent] Activating agent graph and preparing workspace tools...</span>
              </div>
              <div class="flex items-center gap-3 text-xs text-zinc-500 bg-zinc-900/30 p-3 rounded-lg border border-zinc-800/30">
                <span class="material-icons text-[16px]">hourglass_empty</span>
                <span>[Habit Extractor & Splitter Agent] Awaiting extraction schema split task...</span>
              </div>
              <div class="flex items-center gap-3 text-xs text-zinc-500 bg-zinc-900/30 p-3 rounded-lg border border-zinc-800/30">
                <span class="material-icons text-[16px]">hourglass_empty</span>
                <span>[Routine & Trigger Modeler Agent] Awaiting behavioral design task...</span>
              </div>
              <div class="flex items-center gap-3 text-xs text-zinc-500 bg-zinc-900/30 p-3 rounded-lg border border-zinc-800/30">
                <span class="material-icons text-[16px]">hourglass_empty</span>
                <span>[Data Synchronizer Tool] Awaiting database insert execution call...</span>
              </div>
            </div>
          </div>
        }

        @if (splitResult()) {
          <div class="mt-6 border-t border-indigo-900/40 pt-6 space-y-4">
            <div class="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl text-emerald-300 text-sm flex items-start gap-3">
              <span class="material-icons text-emerald-400 mt-0.5">verified</span>
              <div>
                <p class="font-semibold text-emerald-200">Execution Successful!</p>
                <p class="mt-1 text-xs leading-relaxed text-emerald-400/90">{{ splitResult().message }}</p>
              </div>
            </div>

            <div class="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
              <h3 class="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <span class="material-icons text-[14px]">history_edu</span>
                Agent Collaboration Steps (Proof of Work)
              </h3>
              @for (step of splitResult().steps; track step.description) {
                <div class="border-l-2 border-indigo-500 pl-4 py-1">
                  <div class="flex justify-between items-center">
                    <span class="text-xs font-semibold text-indigo-300">{{ step.agent }}</span>
                    <span class="text-[10px] bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded-full uppercase tracking-wider border border-indigo-900/50">{{ step.action }}</span>
                  </div>
                  <p class="text-xs text-zinc-300 mt-1">{{ step.description }}</p>
                </div>
              }
            </div>
          </div>
        }
      </section>

      <!-- Habits Table -->
      <section>
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-medium flex items-center gap-2">
            <span class="material-icons text-zinc-400">repeat</span>
            Habits to Reduce
          </h2>
        </div>
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <table class="w-full text-left text-sm text-zinc-300">
            <thead class="bg-zinc-950 border-b border-zinc-800 text-zinc-400">
              <tr>
                <th class="px-6 py-4 font-medium">Habit</th>
                <th class="px-6 py-4 font-medium">Frequency</th>
                <th class="px-6 py-4 font-medium">Duration</th>
                <th class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800">
              @for (habit of habits(); track habit.id) {
                <tr class="hover:bg-zinc-800/30 transition-colors">
                  <td class="px-6 py-4 font-medium text-zinc-100">{{ habit.name }}</td>
                  <td class="px-6 py-4">{{ habit.frequency }}</td>
                  <td class="px-6 py-4">{{ habit.durationHistory }}</td>
                  <td class="px-6 py-4 text-right">
                    <button (click)="deleteHabit(habit.id)" class="text-red-400 hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-red-400/10" aria-label="Delete habit">
                      <span class="material-icons text-[20px]">delete</span>
                    </button>
                  </td>
                </tr>
              }
              
              <!-- Add new row -->
              <tr class="bg-zinc-950/50">
                <td class="px-4 py-3"><input type="text" [(ngModel)]="newHabit.name" placeholder="Name" class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 outline-none"></td>
                <td class="px-4 py-3"><input type="text" [(ngModel)]="newHabit.frequency" placeholder="Daily/Weekly" class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 outline-none"></td>
                <td class="px-4 py-3"><input type="text" [(ngModel)]="newHabit.durationHistory" placeholder="Since when" class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 outline-none"></td>
                <td class="px-4 py-3 text-right">
                  <button (click)="addHabit()" [disabled]="!newHabit.name || !newHabit.frequency" class="text-emerald-400 hover:text-emerald-300 disabled:opacity-50 p-2 rounded-lg hover:bg-emerald-400/10">
                    <span class="material-icons text-[20px]">add_circle</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Routine Table -->
      <section>
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-medium flex items-center gap-2">
            <span class="material-icons text-zinc-400">schedule</span>
            Daily Routine
          </h2>
        </div>
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <table class="w-full text-left text-sm text-zinc-300">
            <thead class="bg-zinc-950 border-b border-zinc-800 text-zinc-400">
              <tr>
                <th class="px-6 py-4 font-medium">Time Block</th>
                <th class="px-6 py-4 font-medium">Activity</th>
                <th class="px-6 py-4 font-medium">Day Type</th>
                <th class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800">
              @for (entry of routine(); track entry.id) {
                <tr class="hover:bg-zinc-800/30 transition-colors">
                  <td class="px-6 py-4 font-medium text-zinc-100">{{ entry.timeBlock }}</td>
                  <td class="px-6 py-4">{{ entry.activity }}</td>
                  <td class="px-6 py-4 capitalize">{{ entry.dayType }}</td>
                  <td class="px-6 py-4 text-right">
                    <button (click)="deleteRoutine(entry.id)" class="text-red-400 hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-red-400/10" aria-label="Delete routine">
                      <span class="material-icons text-[20px]">delete</span>
                    </button>
                  </td>
                </tr>
              }
              
              <!-- Add new row -->
              <tr class="bg-zinc-950/50">
                <td class="px-4 py-3"><input type="text" [(ngModel)]="newRoutine.timeBlock" placeholder="e.g. 9 AM - 5 PM" class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 outline-none"></td>
                <td class="px-4 py-3"><input type="text" [(ngModel)]="newRoutine.activity" placeholder="Activity" class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 outline-none"></td>
                <td class="px-4 py-3">
                  <select [(ngModel)]="newRoutine.dayType" class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 outline-none">
                    <option value="weekday">Weekday</option>
                    <option value="weekend">Weekend</option>
                    <option value="all">All</option>
                  </select>
                </td>
                <td class="px-4 py-3 text-right">
                  <button (click)="addRoutine()" [disabled]="!newRoutine.timeBlock || !newRoutine.activity" class="text-emerald-400 hover:text-emerald-300 disabled:opacity-50 p-2 rounded-lg hover:bg-emerald-400/10">
                    <span class="material-icons text-[20px]">add_circle</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      
      <!-- Triggers Table -->
      <section>
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-medium flex items-center gap-2">
            <span class="material-icons text-zinc-400">warning</span>
            Triggers
          </h2>
        </div>
        <div class="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <table class="w-full text-left text-sm text-zinc-300">
            <thead class="bg-zinc-950 border-b border-zinc-800 text-zinc-400">
              <tr>
                <th class="px-6 py-4 font-medium">Type</th>
                <th class="px-6 py-4 font-medium">Description</th>
                <th class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800">
              @for (trigger of triggers(); track trigger.id) {
                <tr class="hover:bg-zinc-800/30 transition-colors">
                  <td class="px-6 py-4 font-medium text-zinc-100 capitalize">{{ trigger.type }}</td>
                  <td class="px-6 py-4">{{ trigger.description }}</td>
                  <td class="px-6 py-4 text-right">
                    <button (click)="deleteTrigger(trigger.id)" class="text-red-400 hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-red-400/10" aria-label="Delete trigger">
                      <span class="material-icons text-[20px]">delete</span>
                    </button>
                  </td>
                </tr>
              }
              
              <!-- Add new row -->
              <tr class="bg-zinc-950/50">
                <td class="px-4 py-3">
                  <select [(ngModel)]="newTrigger.type" class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 outline-none">
                    <option value="time">Time</option>
                    <option value="emotion">Emotion</option>
                    <option value="context">Context/Place</option>
                    <option value="person">Person</option>
                  </select>
                </td>
                <td class="px-4 py-3"><input type="text" [(ngModel)]="newTrigger.description" placeholder="Describe the trigger" class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 outline-none"></td>
                <td class="px-4 py-3 text-right">
                  <button (click)="addTrigger()" [disabled]="!newTrigger.description" class="text-emerald-400 hover:text-emerald-300 disabled:opacity-50 p-2 rounded-lg hover:bg-emerald-400/10">
                    <span class="material-icons text-[20px]">add_circle</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </div>
  `
})
export class HabitsComponent implements OnInit {
  private api = inject(ApiService);

  habits = signal<any[]>([]);
  routine = signal<any[]>([]);
  triggers = signal<any[]>([]);
  qas = signal<any[]>([]);
  generating = signal(false);
  answers: Record<number, string> = {};

  newHabit = { name: '', frequency: '', durationHistory: '', episodeDescription: 'Added manually' };
  newRoutine = { timeBlock: '', activity: '', dayType: 'weekday' };
  newTrigger = { type: 'time', description: '' };

  combinedHabits = signal<any[]>([]);
  selectedHabitId = signal<number | null>(null);
  additionalExplanation = '';
  splitting = signal(false);
  splitResult = signal<any | null>(null);

  ngOnInit() {
    this.loadData();
    this.loadCombinedHabits();
  }

  loadData() {
    this.api.get<any[]>('/api/habits').subscribe(res => this.habits.set(res));
    this.api.get<any[]>('/api/routine').subscribe(res => this.routine.set(res));
    this.api.get<any[]>('/api/triggers').subscribe(res => this.triggers.set(res));
    this.api.get<any[]>('/api/deep-dive').subscribe(res => this.qas.set(res));
  }

  loadCombinedHabits() {
    this.api.get<any[]>('/api/agents/combined-habits').subscribe(res => {
      this.combinedHabits.set(res);
      if (res.length > 0) {
        this.selectedHabitId.set(res[0].id);
      } else {
        this.selectedHabitId.set(null);
      }
    });
  }

  runMultiAgentSplit() {
    const habitId = this.selectedHabitId();
    if (!habitId) return;

    this.splitting.set(true);
    this.splitResult.set(null);

    this.api.post<any>('/api/agents/split-habit', {
      habitId,
      additionalAnswer: this.additionalExplanation
    }).subscribe({
      next: (res) => {
        this.splitting.set(false);
        this.splitResult.set(res);
        this.additionalExplanation = '';
        this.loadData();
        this.loadCombinedHabits();
      },
      error: () => {
        this.splitting.set(false);
        alert('Failed to execute agentic split. Please check that the Gemini API is correctly configured.');
      }
    });
  }

  generateQuestions() {
    this.generating.set(true);
    this.api.post<any>('/api/deep-dive/generate', {}).subscribe({
      next: () => {
        this.generating.set(false);
        this.loadData();
      },
      error: () => {
        this.generating.set(false);
      }
    });
  }

  submitAnswer(qaId: number) {
    const answer = this.answers[qaId];
    if (!answer) return;
    this.api.post(`/api/deep-dive/${qaId}/answer`, { answer }).subscribe(() => {
      this.loadData();
    });
  }

  addHabit() {
    this.api.post('/api/habits', this.newHabit).subscribe(() => {
      this.loadData();
      this.newHabit = { name: '', frequency: '', durationHistory: '', episodeDescription: 'Added manually' };
    });
  }

  deleteHabit(id: number) {
    this.api.delete(`/api/habits/${id}`).subscribe(() => this.loadData());
  }

  addRoutine() {
    this.api.post('/api/routine', this.newRoutine).subscribe(() => {
      this.loadData();
      this.newRoutine = { timeBlock: '', activity: '', dayType: 'weekday' };
    });
  }

  deleteRoutine(id: number) {
    this.api.delete(`/api/routine/${id}`).subscribe(() => this.loadData());
  }

  addTrigger() {
    this.api.post('/api/triggers', this.newTrigger).subscribe(() => {
      this.loadData();
      this.newTrigger = { type: 'time', description: '' };
    });
  }

  deleteTrigger(id: number) {
    this.api.delete(`/api/triggers/${id}`).subscribe(() => this.loadData());
  }
}
