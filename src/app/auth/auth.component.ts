/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, inject } from '@angular/core';
import { auth, googleAuthProvider } from '../shared/firebase';
import { signInWithPopup } from 'firebase/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-auth',
  standalone: true,
  template: `
    <div class="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center p-4">
      <div class="w-full max-w-md p-8 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl flex flex-col items-center">
        <div class="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
          <span class="material-icons text-3xl">psychology</span>
        </div>
        <h1 class="text-3xl font-semibold tracking-tight mb-2">Rewire</h1>
        <p class="text-zinc-400 mb-8 text-center">Intelligent nudges, tracking, and coaching to overcome harmful habits.</p>
        
        <button (click)="signInWithGoogle()" class="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition-colors text-white font-medium flex items-center justify-center gap-2">
          <span class="material-icons">login</span>
          Continue with Google
        </button>
        
        @if (errorMessage) {
          <p class="mt-4 text-red-400 text-sm text-center">{{ errorMessage }}</p>
        }
      </div>
    </div>
  `
})
export class AuthComponent {
  private router = inject(Router);
  errorMessage = '';

  async signInWithGoogle() {
    this.errorMessage = '';
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();
      
      const response = await fetch('/api/plans', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      
      if (response.ok) {
        const userPlans = await response.json();
        if (userPlans && userPlans.length > 0) {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/onboarding']);
        }
      } else {
        this.router.navigate(['/onboarding']);
      }
    } catch (error: any) {
      console.error('Login failed', error);
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-blocked') {
        this.errorMessage = 'Sign in was cancelled or blocked by the browser. Please allow popups for this site and try again.';
      } else {
        this.errorMessage = 'Login failed. Please try again.';
      }
    }
  }
}
