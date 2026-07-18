import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../shared/api.service';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center p-4 pt-12">
      <div class="w-full max-w-2xl">
        <!-- Progress Bar -->
        <div class="mb-8">
          <div class="text-sm font-medium text-emerald-500 mb-2">Question {{ currentStep() + 1 }} of {{ totalSteps }}</div>
          <div class="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
            <div class="h-full bg-emerald-500 transition-all duration-300" [style.width.%]="(currentStep() + 1) / totalSteps * 100"></div>
          </div>
        </div>

        <div class="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl">
          <form [formGroup]="form" (ngSubmit)="nextStep()">
            @for (q of questions; track q.controlName; let i = $index) {
              @if (i === currentStep()) {
                <div class="mb-6">
                  <label [for]="q.controlName" class="block text-2xl font-semibold mb-6">{{ q.text }}</label>
                  @if (q.type === 'textarea') {
                    <textarea 
                      [id]="q.controlName"
                      [formControlName]="q.controlName" 
                      class="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                      placeholder="Type your answer here..."
                    ></textarea>
                  } @else if (q.type === 'number') {
                    <input 
                      [id]="q.controlName"
                      type="number"
                      [formControlName]="q.controlName" 
                      class="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                      min="1" max="10"
                    />
                  } @else {
                    <input 
                      [id]="q.controlName"
                      type="text"
                      [formControlName]="q.controlName" 
                      class="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                      placeholder="Type your answer here..."
                    />
                  }
                </div>
              }
            }

            <div class="mt-8 flex justify-between">
              <button 
                type="button"
                (click)="prevStep()"
                [disabled]="currentStep() === 0"
                class="px-6 py-2 rounded-xl border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              
              @if (currentStep() < totalSteps - 1) {
                <button 
                  type="submit"
                  [disabled]="form.get(currentQuestion().controlName)?.invalid"
                  class="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50"
                >
                  Continue
                </button>
              } @else {
                <button 
                  type="button"
                  (click)="submit()"
                  [disabled]="form.invalid || submitting()"
                  class="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  @if (submitting()) {
                    <span class="material-icons animate-spin text-sm">refresh</span>
                    Analyzing...
                  } @else {
                    Complete
                  }
                </button>
              }
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class OnboardingComponent {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);

  submitting = signal(false);
  currentStep = signal(0);

  questions = [
    { text: "What time do you usually wake up and go to sleep?", type: "text", controlName: "q1" },
    { text: "Walk me through a typical weekday — work/study hours, commute, breaks?", type: "textarea", controlName: "q2" },
    { text: "Does your weekend routine look different from weekdays? How?", type: "textarea", controlName: "q3" },
    { text: "Which habits or behaviors do you want to reduce or quit?", type: "text", controlName: "q4" },
    { text: "For each habit selected, how long have you had it?", type: "text", controlName: "q5" },
    { text: "On average, how often does it happen?", type: "text", controlName: "q6" },
    { text: "What does a typical episode look like?", type: "textarea", controlName: "q7" },
    { text: "What times of day are hardest to resist?", type: "text", controlName: "q8" },
    { text: "What situations or emotions usually trigger it?", type: "text", controlName: "q9" },
    { text: "Are there specific people, places, or activities that make it worse?", type: "text", controlName: "q10" },
    { text: "Are there times/situations where you already resist successfully? What helps then?", type: "textarea", controlName: "q11" },
    { text: "Why do you want to change this now?", type: "textarea", controlName: "q12" },
    { text: "Have you tried to quit/reduce before? What happened?", type: "textarea", controlName: "q13" },
    { text: "What does success look like to you?", type: "textarea", controlName: "q14" },
    { text: "On a scale of 1-10, how ready do you feel right now?", type: "number", controlName: "q15" }
  ];
  totalSteps = this.questions.length;
  currentQuestion = computed(() => this.questions[this.currentStep()]);

  form = this.fb.group({
    q1: ['', Validators.required],
    q2: ['', Validators.required],
    q3: ['', Validators.required],
    q4: ['', Validators.required],
    q5: ['', Validators.required],
    q6: ['', Validators.required],
    q7: ['', Validators.required],
    q8: ['', Validators.required],
    q9: ['', Validators.required],
    q10: ['', Validators.required],
    q11: ['', Validators.required],
    q12: ['', Validators.required],
    q13: ['', Validators.required],
    q14: ['', Validators.required],
    q15: [5, [Validators.required, Validators.min(1), Validators.max(10)]],
  });

  nextStep() {
    if (this.currentStep() < this.totalSteps - 1) {
      this.currentStep.update(s => s + 1);
    }
  }

  prevStep() {
    if (this.currentStep() > 0) {
      this.currentStep.update(s => s - 1);
    }
  }

  submit() {
    if (this.form.invalid) return;
    this.submitting.set(true);

    const vals = this.form.value;
    const payload = {
      routine: [
        { timeBlock: 'Wake/Sleep', activity: vals.q1, dayType: 'all' },
        { timeBlock: 'Weekday', activity: vals.q2, dayType: 'weekday' },
        { timeBlock: 'Weekend', activity: vals.q3, dayType: 'weekend' }
      ],
      habits: [
        { name: vals.q4, durationHistory: vals.q5, frequency: vals.q6, episodeDescription: vals.q7 }
      ],
      triggers: [
        { type: 'time', description: vals.q8 },
        { type: 'emotion', description: vals.q9 },
        { type: 'context', description: vals.q10 },
        { type: 'success_factor', description: vals.q11 }
      ],
      motivation: {
        whyText: vals.q12,
        pastAttemptsText: vals.q13,
        successDefinition: vals.q14,
        readinessScore: vals.q15
      }
    };

    this.api.post('/api/onboarding/submit', payload).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error(err);
        this.submitting.set(false);
      }
    });
  }
}
