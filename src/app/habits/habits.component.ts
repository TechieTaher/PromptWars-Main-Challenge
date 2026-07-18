import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService } from '../shared/api.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-habits',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="p-8 max-w-5xl mx-auto w-full space-y-12">
      <h1 class="text-3xl font-semibold tracking-tight">Habits & Routine</h1>

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

  newHabit = { name: '', frequency: '', durationHistory: '', episodeDescription: 'Added manually' };
  newRoutine = { timeBlock: '', activity: '', dayType: 'weekday' };
  newTrigger = { type: 'time', description: '' };

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.api.get<any[]>('/api/habits').subscribe(res => this.habits.set(res));
    this.api.get<any[]>('/api/routine').subscribe(res => this.routine.set(res));
    this.api.get<any[]>('/api/triggers').subscribe(res => this.triggers.set(res));
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
