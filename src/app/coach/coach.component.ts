/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, inject, OnInit, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ApiService } from '../shared/api.service';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-coach',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="flex flex-col h-full bg-zinc-950">
      <div class="p-6 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-10 shadow-sm flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">AI Coach</h1>
          <p class="text-zinc-400 mt-1 text-sm">Your personalized guide to stay on track.</p>
        </div>
        <button (click)="newChat()" class="px-4 py-2 border border-zinc-700 hover:border-emerald-500 rounded-xl text-sm font-medium text-zinc-300 hover:text-emerald-400 transition-colors flex items-center gap-2" id="btn-new-chat">
          <span class="material-icons text-[18px]">chat</span>
          New Chat
        </button>
      </div>
      
      <div class="flex-1 overflow-y-auto p-6 space-y-6" #scrollContainer>
        @if (messages().length === 0) {
          <div class="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
            <span class="material-icons text-5xl opacity-50">forum</span>
            <p>Start a conversation with your coach.</p>
          </div>
        }
        
        @for (msg of messages(); track msg.id) {
          <div class="flex" [class.justify-end]="msg.role === 'user'">
            <div 
              class="max-w-[75%] p-4 rounded-2xl"
              [class.bg-emerald-600]="msg.role === 'user'"
              [class.text-white]="msg.role === 'user'"
              [class.bg-zinc-900]="msg.role === 'model'"
              [class.text-zinc-100]="msg.role === 'model'"
              [class.border]="msg.role === 'model'"
              [class.border-zinc-800]="msg.role === 'model'"
            >
              <div class="text-[15px] leading-relaxed whitespace-pre-wrap">{{ msg.message }}</div>
              <div class="text-[10px] opacity-50 mt-2 text-right">
                {{ msg.createdAt | date:'shortTime' }}
              </div>
            </div>
          </div>
        }
        
        @if (sending()) {
          <div class="flex justify-start">
            <div class="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 flex items-center gap-2">
              <span class="material-icons animate-spin text-sm">refresh</span>
              Coach is typing...
            </div>
          </div>
        }
      </div>
      
      <div class="p-6 border-t border-zinc-800 bg-zinc-950">
        <form (ngSubmit)="sendMessage()" class="flex gap-4">
          <input 
            type="text" 
            [(ngModel)]="newMessage" 
            name="newMessage"
            placeholder="Type your message..." 
            class="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            autocomplete="off"
            [disabled]="sending()"
          >
          <button 
            type="submit" 
            [disabled]="!newMessage.trim() || sending()"
            class="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            <span class="material-icons">send</span>
          </button>
        </form>
      </div>
    </div>
  `
})
export class CoachComponent implements OnInit, AfterViewChecked {
  private api = inject(ApiService);
  
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  messages = signal<any[]>([]);
  newMessage = '';
  sending = signal(false);

  ngOnInit() {
    this.api.get<any[]>('/api/coach/history').subscribe(res => {
      this.messages.set(res);
      this.scrollToBottom();
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch { /* ignore */ }
  }

  sendMessage() {
    if (!this.newMessage.trim() || this.sending()) return;
    
    const userText = this.newMessage;
    this.newMessage = '';
    this.sending.set(true);

    // Optimistically add user message
    this.messages.update(m => [...m, { id: Date.now(), role: 'user', message: userText, createdAt: new Date() }]);

    this.api.post<any>('/api/coach/message', { message: userText }).subscribe({
      next: (reply) => {
        this.messages.update(m => [...m, reply]);
        this.sending.set(false);
      },
      error: () => {
        this.sending.set(false);
      }
    });
  }

  newChat() {
    if (confirm('Are you sure you want to clear your current conversation history and start a new chat?')) {
      this.api.post('/api/coach/clear', {}).subscribe(() => {
        this.messages.set([]);
      });
    }
  }
}
