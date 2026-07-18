import { Routes } from '@angular/router';
import { AuthComponent } from './auth/auth.component';
import { LayoutComponent } from './layout/layout.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { OnboardingComponent } from './onboarding/onboarding.component';
import { CoachComponent } from './coach/coach.component';
import { HabitsComponent } from './habits/habits.component';
import { PlanComponent } from './plan/plan.component';
import { authGuard } from './shared/auth.guard';

export const routes: Routes = [
  { path: 'auth', component: AuthComponent },
  { path: 'onboarding', component: OnboardingComponent, canActivate: [authGuard] },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'habits', component: HabitsComponent },
      { path: 'coach', component: CoachComponent },
      { path: 'plan', component: PlanComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'auth' }
];

