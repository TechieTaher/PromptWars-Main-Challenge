import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { auth } from '../shared/firebase';
import { signOut } from 'firebase/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-zinc-950 text-zinc-50 flex">
      <!-- Sidebar -->
      <aside class="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col hidden md:flex">
        <div class="h-16 flex items-center px-6 border-b border-zinc-800">
          <div class="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mr-3">
            <span class="material-icons text-sm">psychology</span>
          </div>
          <span class="font-semibold tracking-tight text-lg">Rewire</span>
        </div>
        
        <nav class="flex-1 px-4 py-6 space-y-2">
          <a routerLink="/dashboard" routerLinkActive="bg-zinc-800 text-emerald-400" class="flex items-center px-4 py-2.5 rounded-lg hover:bg-zinc-800/50 text-zinc-400 transition-colors">
            <span class="material-icons mr-3 text-xl">grid_view</span>
            Dashboard
          </a>
          <a routerLink="/habits" routerLinkActive="bg-zinc-800 text-emerald-400" class="flex items-center px-4 py-2.5 rounded-lg hover:bg-zinc-800/50 text-zinc-400 transition-colors">
            <span class="material-icons mr-3 text-xl">list_alt</span>
            Habits & Routine
          </a>
          <a routerLink="/coach" routerLinkActive="bg-zinc-800 text-emerald-400" class="flex items-center px-4 py-2.5 rounded-lg hover:bg-zinc-800/50 text-zinc-400 transition-colors">
            <span class="material-icons mr-3 text-xl">chat</span>
            AI Coach
          </a>
          <a routerLink="/plan" routerLinkActive="bg-zinc-800 text-emerald-400" class="flex items-center px-4 py-2.5 rounded-lg hover:bg-zinc-800/50 text-zinc-400 transition-colors">
            <span class="material-icons mr-3 text-xl">flag</span>
            My Plan
          </a>
        </nav>
        
        <div class="p-4 border-t border-zinc-800">
          <button (click)="logout()" class="flex items-center px-4 py-2 w-full rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors text-left">
            <span class="material-icons mr-3 text-xl">logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col h-screen overflow-y-auto">
        <router-outlet></router-outlet>
      </main>
    </div>
  `
})
export class LayoutComponent {
  private router = inject(Router);

  logout() {
    signOut(auth).then(() => {
      this.router.navigate(['/auth']);
    });
  }
}
